#!/usr/bin/env bash
#
# Watchdog of a test run (started by tests/bootstrap.php):
#
#     bash tests/process-watchdog.sh <pid> <marker-file>
#
# <pid> is the process of the test run and <marker-file> a file that process
# removes when it ends on its own. Five times a second the watchdog notes every
# descendant of <pid>: the parallel workers and the Playwright server. When
# <pid> is gone and the marker is still there, the run was killed, and with
# `kill -9` nothing else cleans up behind it. The watchdog ends the descendants
# it noted, and also what the run started too shortly before it was killed to
# be noted: whatever in the run's process group has no parent left in the
# group, whether init or a subreaper took it over, except what was in the group
# and not the run's when the watchdog started. It sends TERM first and, two
# seconds later, KILL, looking again for what the ended processes had started.
# So no orphan is left holding the test database lock or the stdout of whoever
# started the run.
#
# When the marker is gone, the run ended normally and the watchdog just exits.
# It only ever signals PIDs it found this way, never a process matched by name.

pid=$1
marker=$2

if [ -z "$pid" ] || [ -z "$marker" ]; then
    echo "Usage: process-watchdog.sh <pid> <marker-file>" >&2
    exit 2
fi

# Let go of every descriptor inherited from the test run, such as its MySQL
# connection. The server only frees the lock when the last holder of the
# connection closes it, so a watchdog that kept it would hold the lock of the
# run it is cleaning up after. Bash itself reads this script from 255.
fd=3
while [ "$fd" -lt 64 ]; do
    eval "exec $fd>&-"
    fd=$((fd + 1))
done

# A process that was killed stays a zombie until its parent collects it, and
# `kill -0` still succeeds on a zombie, so look at the state instead.
isRunning() {
    local state
    state=$(ps -o stat= -p "$1" 2>/dev/null)

    [ -n "$state" ] && [ "${state#Z}" = "$state" ]
}

# Print the PIDs of everything below <root>, found by walking the table of
# `PID PPID` pairs from ps. The watchdog and what it runs for this are left out.
descendantsOf() {
    ps -A -o pid= -o ppid= | awk -v root="$1" -v self="$$" '
        {
            parent[$1] = $2
            pids[NR] = $1
        }
        END {
            below[root] = 1
            skip[self] = 1

            do {
                added = 0

                for (i = 1; i <= NR; i++) {
                    candidate = pids[i]

                    if (!(candidate in below) && (parent[candidate] in below)) {
                        below[candidate] = 1
                        added = 1
                    }

                    if (!(candidate in skip) && (parent[candidate] in skip)) {
                        skip[candidate] = 1
                        added = 1
                    }
                }
            } while (added)

            for (i = 1; i <= NR; i++) {
                candidate = pids[i]

                if ((candidate in below) && !(candidate in skip) && candidate != root) {
                    print candidate
                }
            }
        }
    '
}

# Print the PIDs in <group> that are not in $present, so the run's own or new
# since the watchdog started, and have no parent in it: what lost its parent,
# which init or a subreaper took over. Processes whose parent is still in the
# group are left out, as are init and the watchdog.
takenOverIn() {
    ps -A -o pid= -o ppid= -o pgid= | awk -v group="$1" -v self="$$" -v present="$present" '
        BEGIN {
            count = split(present, list, " ")

            for (i = 1; i <= count; i++) {
                before[list[i]] = 1
            }
        }
        $3 == group {
            member[$1] = 1
            parent[$1] = $2
        }
        END {
            for (candidate in member) {
                if (candidate + 0 > 1 && candidate != self && !(candidate in before) && !(parent[candidate] in member)) {
                    print candidate
                }
            }
        }
    '
}

# The run's process group. The run starts the watchdog in that group, so when
# the watchdog is in another one, or the group is unknown, 0 or 1, something is
# unexpected: then only what the watchdog noted is ended.
group=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')

if [ -z "$group" ] || [ "$group" -le 1 ] || [ "$group" != "$(ps -o pgid= -p $$ 2>/dev/null | tr -d ' ')" ]; then
    group=""
fi

# Everything in the group now that is not the run or below it: the command
# that started the run, the rest of a pipeline (`tee`), whatever that command
# had left running before (such as a database server), and the watchdog. None
# of it is ended for being in the group. A run that is already gone by now, in
# the watchdog's first fraction of a second, has left its processes without a
# parent, so they land here and are spared as well. On one line, as BSD awk
# refuses a newline in a -v value.
present=""

if [ -n "$group" ]; then
    present=$(ps -A -o pid= -o ppid= -o pgid= | awk -v group="$group" -v root="$pid" '
        {
            parent[$1] = $2
            inGroup[$1] = ($3 == group)
            pids[NR] = $1
        }
        END {
            below[root] = 1

            do {
                added = 0

                for (i = 1; i <= NR; i++) {
                    candidate = pids[i]

                    if (!(candidate in below) && (parent[candidate] in below)) {
                        below[candidate] = 1
                        added = 1
                    }
                }
            } while (added)

            for (i = 1; i <= NR; i++) {
                candidate = pids[i]

                if (inGroup[candidate] && !(candidate in below)) {
                    printf "%s ", candidate
                }
            }
        }
    ')
fi

noted=""

while [ -e "$marker" ]; do
    # List first and only keep the list when the run was still there after it:
    # once the run has gone its children belong to init (or a subreaper), so a
    # list taken after that is empty and would wipe the one worth keeping.
    snapshot=$(descendantsOf "$pid")

    if isRunning "$pid"; then
        noted=$snapshot
        sleep 0.2

        continue
    fi

    # A run that ends on its own removes the marker just before it exits, so
    # look again now that the run is gone.
    if [ ! -e "$marker" ]; then
        exit 0
    fi

    left=$noted

    if [ -n "$group" ]; then
        # What is in the group now. The KILL pass looks no further, so what
        # the command that started the run starts from here on is not taken
        # for the run's.
        members=" $(ps -A -o pid= -o pgid= | awk -v group="$group" '$2 == group { printf "%s ", $1 }') "
        left="$left $(takenOverIn "$group")"
    fi

    for descendant in $left; do
        kill -TERM "$descendant" 2>/dev/null
    done

    sleep 2

    # What the ended processes had started, such as the server below dash's
    # `sh -c` on Linux, has lost its parent in the group since: list again.
    left=$noted

    if [ -n "$group" ]; then
        for candidate in $(takenOverIn "$group"); do
            case $members in
                *" $candidate "*) left="$left $candidate" ;;
            esac
        done
    fi

    for descendant in $left; do
        kill -KILL "$descendant" 2>/dev/null
    done

    rm -f -- "$marker"

    break
done

exit 0
