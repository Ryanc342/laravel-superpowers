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
# uncommitted changes, with a hash of their contents. At Stop, the files this
# session changed are those whose hash differs from the baseline, the new
# ones, and the ones it put back as they are in HEAD. A worktree is checked
# when it has any. A worktree that appeared after SessionStart has no
# baseline: it is checked, with all its changes, only when the session works
# in it (the cwd of the input), since any other one most likely belongs to
# another session. Without a session id there is no baseline, and the current
# worktree is checked with all its changes.
#
# Markdown the session changed is formatted first. When it changed nothing
# but Markdown, `vp check` on those files is the whole check and Pest does
# not run.

unset CDPATH
input=$(cat)

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

# Runs the command $2... in worktree $1 and puts its output in $output.
run_in() {
    output=$(cd "$1" && shift && "$@" 2>&1)
}

failures=

# Checks worktree $1, whose snapshot is $2, for the paths this session
# changed there, listed in $3. Skips the check when these exact changes
# already passed. A failed check adds the end of its output to $failures.
check() {
    local worktree=$1 path passed state markdown=() only_markdown=1

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
    if [ ${#markdown[@]} -gt 0 ]; then
        (cd "$worktree" && npx vp fmt "${markdown[@]}") >/dev/null 2>&1
        state=$(state_of "$worktree" "$(snapshot "$worktree")")
    fi

    if [ -z "$only_markdown" ]; then
        set -- composer check
    elif [ ${#markdown[@]} -gt 0 ]; then
        # Oxlint has nothing to lint in Markdown, and Oxfmt may ignore the
        # files; neither is an error here.
        set -- npx vp check --no-error-on-unmatched-pattern "${markdown[@]}"
    else
        # Only Markdown files were deleted: nothing to check.
        set --
    fi

    if [ $# -eq 0 ] || run_in "$worktree" "$@"; then
        printf '%s\n' "$state" > "$passed"
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
            snapshot "$worktree" > "$session_baselines/$(printf '%s' "$worktree" | sha1)"
        done
    fi

    exit 0
fi

# Any other event, or none, is a Stop.
current_worktree=$(physical "$(git -C "${session_cwd:-$project}" rev-parse --show-toplevel 2>/dev/null)")

for worktree in "${all_worktrees[@]}"; do
    baseline=$session_baselines/$(printf '%s' "$worktree" | sha1)

    # Without a baseline, only the worktree the session works in is checked,
    # and all its changes count as the session's.
    if [ -z "$session_id" ] || [ ! -f "$baseline" ]; then
        if [ "$worktree" != "$current_worktree" ]; then
            continue
        fi

        baseline=/dev/null
    fi

    current=$(snapshot "$worktree")
    changes=$(changes_since "$baseline" "$current")

    if [ -n "$changes" ]; then
        check "$worktree" "$current" "$changes"
    fi
done

if [ -z "$failures" ]; then
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
