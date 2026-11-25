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
# it noted (TERM first, KILL after two seconds), so no orphan is left holding
# the test database lock or the stdout of whoever started the run.
#
# When the marker is gone, the run ended normally and the watchdog just exits.
# It only ever signals PIDs it noted, never a process matched by name.

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

noted=""

while [ -e "$marker" ]; do
    # List first and only keep the list when the run was still there after it:
    # once the run has gone its children belong to init, so a list taken after
    # that is empty and would wipe the one worth keeping.
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

    for descendant in $noted; do
        kill -TERM "$descendant" 2>/dev/null
    done

    sleep 2

    for descendant in $noted; do
        kill -KILL "$descendant" 2>/dev/null
    done

    rm -f -- "$marker"

    break
done

exit 0
