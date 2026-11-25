#!/usr/bin/env bash
#
# SessionStart and Stop hook of Claude Code (.claude/settings.json) and Codex
# (.codex/hooks.json): before the agent finishes a turn, run `composer check`
# wherever this session left changes behind. If it fails, hand the end of its
# output back to the agent and keep it working. To avoid a loop, a second
# failure in a row lets the turn end and warns the user instead.
#
# SessionStart records a baseline: for each worktree of the project's
# repository (the main checkout and .worktrees/*), the files that already had
# uncommitted changes, with a hash of their contents. It also notes the
# worktree the session starts in, and each Stop notes the worktree of its
# cwd: the worktrees the session works in.
#
# At Stop, each worktree the session works in is checked when the session
# changed something there: a file whose hash differs from the baseline, a new
# one, or one it put back as it is in HEAD. In a worktree that appeared after
# SessionStart there is no baseline, so all its changes count. Changes in any
# other worktree are another session's and are left alone. Without a session
# id there is no baseline, and the current worktree is checked with all its
# changes.
#
# Markdown the session changed is formatted first, with the worktree's own
# Vite+. When it changed nothing but Markdown, `vp check` on those files is
# the whole check and Pest does not run.
#
# The checks run with TEST_DATABASE_LOCK_WAIT=0, so that when another test
# run holds a worktree's test database, Pest gives up at once instead of
# waiting for it. The whole hook has CHECK_HOOK_DEADLINE seconds, 540 by
# default, less than the 600 the hook configurations allow it: at the
# deadline the running check is stopped with everything it started, and no
# other worktree is checked. Neither a busy database nor the deadline stops
# the agent or counts as a pass; the user is told to run composer check, and
# the next Stop checks again.

unset CDPATH
input=$(cat)

# Bash counts $SECONDS from its start, so the deadline covers the whole run.
# Anything but a whole number of seconds above 0, without leading zeros
# (which bash arithmetic reads as octal), gets the default.
deadline=${CHECK_HOOK_DEADLINE:-540}

case $deadline in
    '' | *[!0-9]* | 0*) deadline=540 ;;
esac

# The physical path of directory $1, so that two spellings of one directory
# compare equal.
physical() {
    [ -n "$1" ] && (cd "$1" 2>/dev/null && pwd -P)
}

# The SHA-1 of stdin.
sha1() {
    if command -v shasum >/dev/null 2>&1; then
        shasum
    else
        sha1sum
    fi | cut -d' ' -f1
}

# The name of the files about worktree $1 in a session's directory: the
# SHA-1 of its path.
key_of() {
    printf '%s' "$1" | sha1
}

# $1 followed by a newline, or nothing when $1 is empty.
lines() {
    if [ -n "$1" ]; then
        printf '%s\n' "$1"
    fi
}

# The fields of the input this hook uses, each followed by a NUL. Input that
# is not a JSON object gives empty fields: a Stop without a session.
input_fields() {
    printf '%s' "$input" | php -r '
        $input = json_decode(stream_get_contents(STDIN), true);
        $input = is_array($input) ? $input : [];

        foreach (["hook_event_name", "session_id", "cwd"] as $key) {
            $value = $input[$key] ?? "";
            echo is_string($value) ? str_replace("\0", "", $value) : "", "\0";
        }

        echo ($input["stop_hook_active"] ?? false) === true ? "1" : "", "\0";
    ' 2>/dev/null
}

# The physical path of each worktree of the repository, one per line. Git
# before 2.36 has no -z here; its lines then serve, as long as no path holds a
# newline.
worktrees() {
    local field

    {
        git -C "$project" worktree list --porcelain -z 2>/dev/null ||
            git -C "$project" worktree list --porcelain | tr '\n' '\0'
    } | while IFS= read -r -d '' field; do
        case $field in
            'worktree '*) physical "${field#worktree }" ;;
        esac
    done
}

# One line for path $2 of worktree $1: the hash of its contents, or "deleted"
# when it is gone, a tab and the path.
describe() {
    local hash=deleted

    if [ -e "$1/$2" ] || [ -L "$1/$2" ]; then
        hash=$(git -C "$1" hash-object -- "$2" 2>/dev/null) || hash=unhashable
    fi

    printf '%s\t%s\n' "$hash" "$2"
}

# A sorted line from describe() for each file of worktree $1 with uncommitted
# changes: staged, unstaged or untracked. It takes no lock, so it cannot get
# in the way of git commands another session runs in that worktree.
snapshot() {
    local entry

    git -C "$1" --no-optional-locks status --porcelain -z --untracked-files=all 2>/dev/null |
        while IFS= read -r -d '' entry; do
            describe "$1" "${entry:3}"

            # A rename or a copy is followed by the path it came from.
            case ${entry:0:2} in
                *R* | *C*)
                    IFS= read -r -d '' entry
                    describe "$1" "$entry"
                    ;;
            esac
        done | LC_ALL=C sort
}

# The paths whose line differs between the baseline file $1 and the snapshot
# $2, or that only one of the two has, one per line.
changes_since() {
    {
        LC_ALL=C comm -23 "$1" <(lines "$2")
        LC_ALL=C comm -13 "$1" <(lines "$2")
    } | cut -f2- | LC_ALL=C sort -u
}

# What a check of worktree $1 with snapshot $2 has seen.
state_of() {
    { git -C "$1" rev-parse HEAD 2>/dev/null; lines "$2"; } | sha1
}

# Ends process group $1: TERM, then KILL when anything in it is still there
# three seconds later. Returns once the group is gone, or three seconds after
# the KILL. It only ever signals that group.
end_group() {
    local signal tries

    if [ -z "$1" ]; then
        return
    fi

    for signal in TERM KILL; do
        kill -"$signal" -- "-$1" 2>/dev/null || return 0
        tries=0

        while [ "$tries" -lt 30 ] && kill -0 -- "-$1" 2>/dev/null; do
            sleep 0.1
            tries=$((tries + 1))
        done
    done
}

# The process groups of the running check and of its watchdog, and the
# directory that holds the check's output.
check_group=
watchdog_group=
scratch=

# Runs the command $2... in worktree $1, with TEST_DATABASE_LOCK_WAIT=0, and
# puts its output in $output. The command gets a process group of its own,
# and a watchdog ends that group, with everything the command started, when
# the deadline comes first; $timed_out then says so. Past the deadline,
# nothing runs.
run_in() {
    local worktree=$1 remaining=$((deadline - SECONDS)) status
    shift

    if [ -n "$timed_out" ] || [ "$remaining" -le 0 ]; then
        timed_out=1
        return 1
    fi

    # With job control on, each background job gets a process group of its
    # own, whose id is the job's pid. Neither job keeps the hook's stdout or
    # stderr, which would keep whoever reads them waiting.
    set -m
    (cd "$worktree" && export TEST_DATABASE_LOCK_WAIT=0 && exec "$@") \
        < /dev/null > "$scratch/output" 2>&1 &
    check_group=$!
    (sleep "$remaining" && : > "$scratch/expired" && end_group "$check_group") \
        < /dev/null > /dev/null 2>&1 &
    watchdog_group=$!
    set +m

    # Bash reports on stderr a job that a signal ended.
    wait "$check_group" 2>/dev/null
    status=$?

    if [ -e "$scratch/expired" ]; then
        # The watchdog is ending the check's group: wait until it is done.
        wait "$watchdog_group" 2>/dev/null
        timed_out=1
    else
        kill -- "-$watchdog_group" 2>/dev/null
        wait "$watchdog_group" 2>/dev/null
    fi

    check_group= watchdog_group=
    output=$(cat "$scratch/output")

    if [ -n "$timed_out" ]; then
        return 1
    fi

    return "$status"
}

# Whether $1, the output of a check, says that Pest gave up because another
# test run holds the test database (tests/bootstrap.php, with
# TEST_DATABASE_LOCK_WAIT=0).
database_busy() {
    printf '%s\n' "$1" | grep -q '^Another test run is using the '
}

failures=
busy=
timed_out=

# Checks worktree $1, whose snapshot is $2, for the paths this session
# changed there, listed in $3. Skips the check when these exact changes
# already passed. A failed check adds the end of its output to $failures;
# one that found the test database busy sets $busy instead, and one the
# deadline stopped sets $timed_out (run_in).
check() {
    local worktree=$1 path passed state markdown=() only_markdown=1
    local vp=$1/node_modules/.bin/vp

    passed="$(git -C "$worktree" rev-parse --absolute-git-dir)/claude-check-passed"
    state=$(state_of "$worktree" "$2")

    if [ "$(cat "$passed" 2>/dev/null)" = "$state" ]; then
        return
    fi

    while IFS= read -r path; do
        case $path in
            '') ;;
            *.md)
                if [ -f "$worktree/$path" ]; then
                    markdown+=("$path")
                fi
                ;;
            *) only_markdown= ;;
        esac
    done <<< "$3"

    # Only the session's Markdown is formatted; Markdown someone else left
    # is not touched. A check below reports what formatting could not fix.
    # Vite+ runs from the worktree's node_modules and never through npx,
    # which without it (before npm install) would fetch and run an unrelated
    # `vp` package from the npm registry.
    if [ ${#markdown[@]} -gt 0 ] && [ -x "$vp" ]; then
        run_in "$worktree" "$vp" fmt "${markdown[@]}"

        if [ -n "$timed_out" ]; then
            return
        fi

        state=$(state_of "$worktree" "$(snapshot "$worktree")")
    fi

    if [ -z "$only_markdown" ]; then
        set -- composer check
    elif [ ${#markdown[@]} -eq 0 ]; then
        # Only Markdown files were deleted: nothing to check.
        set --
    elif [ -x "$vp" ]; then
        # Oxlint has nothing to lint in Markdown, and Oxfmt may ignore the
        # files; neither is an error here.
        set -- "$vp" check --no-error-on-unmatched-pattern "${markdown[@]}"
    else
        # No Vite+ to check the Markdown with: no check, and no pass either.
        return
    fi

    # A check that the deadline stopped, or that Pest could not run because
    # the test database was busy, neither passed nor failed.
    if [ $# -eq 0 ] || run_in "$worktree" "$@"; then
        printf '%s\n' "$state" > "$passed"
    elif [ -n "$timed_out" ]; then
        return
    elif database_busy "$output"; then
        busy=1
    else
        failures+="
--- $* in $worktree ---
$(printf '%s\n' "$output" | tail -n 60)
"
    fi
}

{
    IFS= read -r -d '' event
    IFS= read -r -d '' session_id
    IFS= read -r -d '' session_cwd
    IFS= read -r -d '' stop_hook_active
} < <(input_fields)

# The session id names a directory, so only a plain name is one.
case $session_id in
    *[!A-Za-z0-9._-]* | .*) session_id= ;;
esac

project=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --show-toplevel 2>/dev/null) || exit 0
common_dir=$(cd "$project" && cd "$(git rev-parse --git-common-dir)" && pwd -P) || exit 0
baselines=$common_dir/claude-check
session_baselines=$baselines/$session_id

all_worktrees=()
while IFS= read -r worktree; do
    all_worktrees+=("$worktree")
done < <(worktrees)

# The worktree the input's cwd is in.
cwd_worktree=$(physical "$(git -C "${session_cwd:-$project}" rev-parse --show-toplevel 2>/dev/null)")

# Notes in the session's directory, when it has one, that the session works
# in worktree $1.
note_worked_in() {
    if [ -n "$session_id" ] && [ -d "$session_baselines" ] && [ -n "$1" ]; then
        : > "$session_baselines/$(key_of "$1").worked-in"
    fi
}

# Whether the session works in worktree $1: the one of the input's cwd, the
# one it started in, or one of an earlier Stop's cwd.
works_in() {
    [ "$1" = "$cwd_worktree" ] ||
        { [ -n "$session_id" ] && [ -f "$session_baselines/$(key_of "$1").worked-in" ]; }
}

if [ "$event" = SessionStart ]; then
    # Claude Code and Codex add what a SessionStart hook prints to the
    # conversation.
    exec >/dev/null

    find "$baselines" -mindepth 1 -maxdepth 1 -type d -mmin +10080 -exec rm -rf {} + 2>/dev/null

    # Only the first SessionStart of a session records its baseline. A
    # resumed or compacted session keeps it, so the changes it made before
    # are still its own.
    if [ -n "$session_id" ] && mkdir -p "$baselines" && mkdir "$session_baselines" 2>/dev/null; then
        for worktree in "${all_worktrees[@]}"; do
            snapshot "$worktree" > "$session_baselines/$(key_of "$worktree")"
        done

        note_worked_in "$cwd_worktree"
    fi

    exit 0
fi

# Any other event, or none, is a Stop.
scratch=$(mktemp -d "${TMPDIR:-/tmp}/claude-check.XXXXXX") || exit 0
trap 'rm -rf "$scratch"' EXIT

# A TERM, INT or HUP stops the hook itself: the agent's own timeout, or an
# interrupt. Whatever sends it does not reach the check's process group, so
# end that group first. Bash would report on stderr the jobs this ends.
stop_with() {
    exec 2>/dev/null
    end_group "$watchdog_group"
    end_group "$check_group"
    exit "$1"
}

trap 'stop_with 143' TERM
trap 'stop_with 130' INT
trap 'stop_with 129' HUP

note_worked_in "$cwd_worktree"

for worktree in "${all_worktrees[@]}"; do
    # Past the deadline, no other worktree is checked.
    if [ -n "$timed_out" ]; then
        break
    fi

    # Changes in a worktree the session does not work in are another
    # session's.
    if ! works_in "$worktree"; then
        continue
    fi

    # Without a baseline, all its changes count as the session's.
    baseline=$session_baselines/$(key_of "$worktree")

    if [ -z "$session_id" ] || [ ! -f "$baseline" ]; then
        baseline=/dev/null
    fi

    current=$(snapshot "$worktree")
    changes=$(changes_since "$baseline" "$current")

    if [ -n "$changes" ]; then
        check "$worktree" "$current" "$changes"
    fi
done

# A check that did not run or did not finish lets the turn end and tells the
# user. A failure in another worktree still goes back to the agent below;
# the next Stop checks the rest again anyway.
if [ -z "$failures" ]; then
    message=

    if [ -n "$busy" ]; then
        message="Another test run is using the test database, so composer check did not run. Run composer check once it finishes."
    fi

    if [ -n "$timed_out" ]; then
        message="${message:+$message }composer check did not finish within $deadline seconds and was stopped. Run composer check yourself."
    fi

    if [ -n "$message" ]; then
        printf '{"systemMessage": "%s"}\n' "$message"
    fi

    exit 0
fi

if [ -n "$stop_hook_active" ]; then
    echo '{"systemMessage": "composer check is still failing. The agent was asked to fix it once; run composer check to see what is left."}'
    exit 0
fi

{
    echo "composer check failed. Fix the problems below, then run composer check again."
    printf '%s' "$failures"
} >&2
exit 2
