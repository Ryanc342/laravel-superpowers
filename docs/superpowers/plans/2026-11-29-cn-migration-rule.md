# cn Migration Rule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An agent that changes UI in a project with two `cn` implementations proposes `npx shadcn@latest migrate cn`. It asks before it changes any dependency, and follows the answer.

**Architecture:** One bullet in `.ai/guidelines/project.md`, regenerated into `CLAUDE.md` and `AGENTS.md`, plus an UPGRADING entry. The acceptance test is headless implementer probes on throwaway worktrees: a baseline without the rule, then runs with it.

**Tech Stack:** Laravel Boost (`boost:update`), shadcn CLI 4.23.1 (`migrate cn`, `add`), Claude Code CLI (`claude -p`, stream-json), superpowers 7.0.2 implementer prompt.

**Spec:** `docs/superpowers/specs/2026-11-29-cn-migration-rule-design.md`

## Global Constraints

- Branch `feature/cn-migration-rule`, cut from `develop`.
- Never run `composer` or `php artisan boost:update` with `-q`.
- Do not change the template's own `resources/js/lib/utils.ts` or its dependencies.
- No new Pest test. The probe in Task 2 is the test.
- The new version is `sp-v3.2.0`. Write no tag and no release.
- Delete `docs/superpowers/` from the branch before it merges into `develop`.

## Review Focus

1. **A subagent cannot ask the owner.** An implementer must report back with a question, NEEDS_CONTEXT or BLOCKED. It must not run the migration itself (Task 2: the first turn of every with-rule run).
2. **Migrating before asking.** `package.json` must be unchanged when the first turn ends (Task 2, Step 4).
3. **The "no" answer.** The new component must import `cn` from `@/lib/utils`, with no `cn` package added (Task 2, Step 5, the fresh run's second turn).
4. **Backend-only work.** It must not trigger the rule. The probe does not cover this: "Before changing UI" in the bullet draws the line (Task 1, Step 1).
5. **`clsx` imported elsewhere.** `migrate cn` drops `clsx`. If project code imports it directly, `tsc` fails, and `composer check` after the migration catches that (Task 2, Step 5).

---

### Task 1: The rule and the upgrade note

**Files:**

- Modify: `.ai/guidelines/project.md`. Add one bullet after the bullet that begins "Add shadcn components with its CLI".
- Regenerate: `CLAUDE.md`, `AGENTS.md`
- Modify: `UPGRADING.md`. Add `## sp-v3.2.0` above `## sp-v3.1.0`.

**Interfaces:**

- Produces: the bullet below, which begins "Components the CLI adds import `cn`". Task 2's probes run against it, and UPGRADING quotes its opening words.

- [ ] **Step 1: Run the failing check**

Run: `grep -c 'migrate cn' CLAUDE.md AGENTS.md`

Expected: `CLAUDE.md:0` and `AGENTS.md:0`.

- [ ] **Step 2: Add this bullet, verbatim, after the shadcn CLI bullet**

```markdown
- Components the CLI adds import `cn` from the `cn` package, which replaces `clsx` and `tailwind-merge`. The starter kit's `resources/js/lib/utils.ts` builds its own `cn` from those two. Before changing UI, check whether the project would have two: it already imports `cn` from the package, or a component you are adding brings it, while `lib/utils.ts` still builds its own. If so, propose `DO_NOT_TRACK=1 npx shadcn@latest migrate cn --yes`. It makes `lib/utils.ts` re-export `cn` from the package and replaces `clsx` and `tailwind-merge` with `cn` in `package.json`. That is a dependency change: ask for approval first, and change no dependency until you have the answer. If the answer is no, point the new component's `cn` import at `@/lib/utils` and add no `cn` package.
```

- [ ] **Step 3: Run `php artisan boost:update`, then `git status --short`**

Expected: only `.ai/guidelines/project.md`, `CLAUDE.md` and `AGENTS.md` are modified.

- [ ] **Step 4: Run Step 1's check again**

Expected: `CLAUDE.md:1` and `AGENTS.md:1`.

- [ ] **Step 5: Add the `## sp-v3.2.0` section to `UPGRADING.md`, above `## sp-v3.1.0`**

It says, in the file's voice:

- **What changed.** shadcn CLI 4.23 writes `import { cn } from "cn"` into every component it adds and brings the `cn` package. The starter kit's `resources/js/lib/utils.ts` builds `cn` from `clsx` and `tailwind-merge`, so a project with both runs two implementations of `cn`. The project rules now tell agents to notice this when they change UI, and to propose `npx shadcn@latest migrate cn` with approval.
- **Taking the bullet.** `.ai/guidelines/project.md` is mixed. In step 4 of the template sync, take the new "Definition of Done" bullet that begins "Components the CLI adds import `cn`" by hand.
- **No migration during the sync.** Do not migrate during the sync. The next UI task proposes the migration and asks first.
- **Who does what.** A project on sp-v3.1.0 does this during the template sync and has nothing else to do.

- [ ] **Step 6: Run `composer check`**

Expected: it passes. If Oxfmt flags the Markdown, run `composer fix`, then `composer check` again.

- [ ] **Step 7: Commit**

```bash
git add .ai/guidelines/project.md CLAUDE.md AGENTS.md UPGRADING.md
git commit -m "Tell agents to propose the cn migration when a project has two cn"
```

---

### Task 2: Acceptance probe

The fixtures and scripts are in the scratchpad. Call it `$S`, which is `/private/tmp/claude-501/-Users-ryan-Projects-laravel-superpowers/9a7a6015-518f-4176-a958-d84eb59ceb4c/scratchpad`:

- `$S/fixtures/0001-*.patch`: the customers backend.
- `$S/fixtures/task-2-brief.md`: the customer-list task, which needs `table`.
- `$S/fixtures/prompt-impl.template.txt`: the superpowers implementer prompt, filled in for `probe-impl-1`.
- `$S/run-probe2.sh` and `$S/summarize.py`.

**Files:** none in the repository. Everything happens in `.worktrees/probe-*`, which are removed at the end.

**Interfaces:**

- Consumes: Task 1's commit on `feature/cn-migration-rule`.

- [ ] **Step 1: Build four worktrees**

| Name      | Cut from                    | Fixture  |
| --------- | --------------------------- | -------- |
| `base-s`  | `develop`                   | two-`cn` |
| `two-s`   | `feature/cn-migration-rule` | two-`cn` |
| `two-o`   | `feature/cn-migration-rule` | two-`cn` |
| `fresh-o` | `feature/cn-migration-rule` | fresh    |

For each:

1. `git worktree add --detach .worktrees/probe-<name> <ref>`.
2. `git rm -r -q --ignore-unmatch docs/superpowers`, and commit "Hide the design docs" if anything was removed.
3. `git am` patch 0001, and copy the brief to `.superpowers/sdd/customers/task-2-brief.md`.
4. Full setup:
    - copy `.env` with `DB_DATABASE=laravel_superpowers_probe_<name>`, using `_` for `-`;
    - `composer install`, `npm install`, `php artisan migrate --force`, `npm run build`.
5. Two-`cn` fixture only:
    - run `yes n | DO_NOT_TRACK=1 npx shadcn@latest add field textarea --yes`;
    - commit everything as "Add the field and textarea components";
    - record the SHA as `<fixture>`.

    The fresh fixture's `<fixture>` is the patch 0001 commit.

Expected:

- In the two-`cn` worktrees, `package.json` lists `cn`, at least one file under `resources/js/components/ui` imports `from "cn"`, and `lib/utils.ts` still imports `tailwind-merge`.
- In `fresh-o`, `package.json` has no `cn`.

- [ ] **Step 2: Write the prompts**

Write `$S/prompt-<name>.txt` as the impl template with `probe-impl-1` replaced by `probe-<name>`.

Expected: no `probe-impl-1` is left in the prompts.

- [ ] **Step 3: Run the four first turns in the background, in parallel**

Run `PERM=auto $S/run-probe2.sh <name> <sonnet|opus> 4 off $S/prompt-<name>.txt`. Hooks are off and memory is off.

- [ ] **Step 4: Judge the first turns**

For each run:

- **Dependencies:** `git -C .worktrees/probe-<name> diff <fixture> -- package.json`. This covers committed and uncommitted changes.
- **Report:** its result text, and whether it mentions `migrate cn` or the two `cn`.
- **Order:** with `summarize.py`, where any shadcn and `cn` actions fall against the first UI edit.

It passes when every with-rule run (`two-s`, `two-o` and `fresh-o`) both:

- raises the `cn` migration and asks for approval;
- leaves `package.json` unchanged against `<fixture>`.

For `base-s`, record what it did. It has no pass or fail.

- [ ] **Step 5: Run the second turns**

- `two-s` and `two-o` get "可以，迁移吧".
- `fresh-o` gets "不用迁移，保持原来的 @/lib/utils".
- `base-s` gets no second turn unless it proposed the migration.

The resume command runs in the probe's worktree:

```bash
CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 claude -p "<answer>" --resume <session id> \
  --output-format stream-json --verbose --permission-mode auto --max-budget-usd 4 \
  --settings '{"disableAllHooks": true, "autoMemoryEnabled": false}' \
  --allowedTools <run-probe2.sh's list>
```

The output goes to `$S/out-<name>-t2.jsonl`.

Then judge. It passes when all of these hold:

- **`two-s` and `two-o`:** `lib/utils.ts` contains `export { cn } from "cn"`, `package.json` has neither `clsx` nor `tailwind-merge`, and `composer check` passes in the worktree.
- **`fresh-o`:** `package.json` has no `cn`, no file imports `from "cn"`, and `composer check` passes.

- [ ] **Step 6: Clean up and report**

- `git worktree remove --force` each probe worktree.
- Drop each `laravel_superpowers_probe_*` database and its `_test` twin.
- Report to the owner the table of runs, the baseline against the with-rule runs, the passes, the misses and the cost.
- If a with-rule run missed, widen no wording. Report the miss and why.
