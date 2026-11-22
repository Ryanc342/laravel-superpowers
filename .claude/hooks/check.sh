#!/usr/bin/env bash
#
# Stop hook: before Claude finishes a turn that left changes behind, run
# `composer check`. If it fails, hand the end of its output back to Claude
# and keep it working. To avoid a loop, a second failure in a row lets the
# turn end and warns the user instead.

input=$(cat)
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Nothing uncommitted: nothing to check.
if [ -z "$(git status --porcelain)" ]; then
    exit 0
fi

# Skip when these exact changes already passed.
state=$({ git diff HEAD; git ls-files --others --exclude-standard -z | xargs -0 cat 2>/dev/null; } | shasum | cut -d' ' -f1)
passed="$(git rev-parse --git-dir)/claude-check-passed"
if [ "$(cat "$passed" 2>/dev/null)" = "$state" ]; then
    exit 0
fi

if output=$(composer check 2>&1); then
    echo "$state" > "$passed"
    exit 0
fi

if printf '%s' "$input" | grep -q '"stop_hook_active": *true'; then
    echo '{"systemMessage": "composer check is still failing. Claude was asked to fix it once; run composer check to see what is left."}'
    exit 0
fi

{
    echo "composer check failed. Fix the problems below, then run composer check again."
    echo
    printf '%s\n' "$output" | tail -n 60
} >&2
exit 2
