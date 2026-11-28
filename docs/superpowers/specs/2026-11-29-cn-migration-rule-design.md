# Let agents find and propose the move to the `cn` package — design

A small change. On 2026-11-29 the owner picked approach A: a guidance rule, with no slimming of CLAUDE.md. They asked for it to be tried, to see whether it works.

## Intent

shadcn CLI 4.23 writes `import { cn } from "cn"` into every component it adds, and adds the `cn` npm package. `cn` is shadcn's own package: it replaces `clsx` and `tailwind-merge`, and its API is the same.

The starter kit's 30 files import `cn` from `@/lib/utils`, which builds it from `clsx` and `tailwind-merge`. So a project ends up with two implementations of `cn`:

| Project      | Files importing from `cn` | Files importing from `@/lib/utils` |
| ------------ | ------------------------- | ---------------------------------- |
| MyCompany    | 34                        | 11                                 |
| DulaBot      | 42                        | 30                                 |
| FC-ERP-Suite | 30                        | 5                                  |

The two can drift apart. For example, a tailwind-merge customisation in `lib/utils.ts` would not reach the components that import from the package.

The owner chose `cn` for all three projects. The migration should not be a job of its own. An agent should find it while doing UI work, and every dependency change needs the owner's approval: the owner withdrew the standing approval on 2026-11-29.

## What `migrate cn` does

Tried on a copy of `develop`. `DO_NOT_TRACK=1 npx shadcn@latest migrate cn --yes` changes three things:

- `resources/js/lib/utils.ts` becomes `export { cn } from "cn"`, and keeps `toUrl`;
- `package.json`: `clsx` is replaced by `cn`, and `tailwind-merge` is removed;
- `package-lock.json`.

No other file changes. `tsc` shows no new error.

## Goals

- An agent that changes UI in a project with two `cn` implementations notices, and proposes the migration.
    - Two implementations means: the project already imports `cn` from the package, or a component it is adding brings the package, while `lib/utils.ts` still builds its own.
- Nothing changes in `package.json` before the owner approves.
- After approval, the project has one `cn` and `composer check` passes.
- If the owner says no, the new component imports `cn` from `@/lib/utils`, and no `cn` package is added.

## Non-goals

- Migrating the downstream projects now.
- Changing the template's own `lib/utils.ts`. The starter kit's UI stays as upstream ships it.
- Slimming CLAUDE.md.
- A standing dependency approval.

## Anti-goals

- A rule that fires on backend-only work.
- A rule that makes an agent change dependencies without asking.

## Approaches

- **A. A guidance bullet (picked).** It goes after the shadcn CLI bullet in `.ai/guidelines/project.md`. It fires where the problem shows up, when an agent changes UI, and it is the same mechanism the sp-v3.1.0 probe proved.
- **B. A `composer check` test that fails while two `cn` exist.** Dropped. It would block backend-only work, and it is template code dictating a project's UI.
- **C. Only an UPGRADING note that says to migrate at sync time.** Dropped. It acts at the sync, not during development.

## The change

1. **`.ai/guidelines/project.md`.** Add one bullet after "Add shadcn components with its CLI". It names:
    - the two-`cn` condition from Goals, checked before changing UI;
    - the command, `DO_NOT_TRACK=1 npx shadcn@latest migrate cn --yes`, and what it changes;
    - that it is a dependency change, so the agent asks first;
    - the "no" branch: the new component imports from `@/lib/utils`, and no `cn` package is added.
2. **`php artisan boost:update`.** It regenerates `CLAUDE.md` and `AGENTS.md`.
3. **`UPGRADING.md`, a new `sp-v3.2.0` entry.**
    - Take the bullet by hand in step 4 of the template sync.
    - Do not migrate during the sync: the next UI task proposes the migration, and the owner approves it there.

## Acceptance

Run headless probes, the same setup as for sp-v3.1.0: superpowers' implementer prompt, memory off, `docs/superpowers/` removed, a worktree and a database of its own per run, and the customer-list task, which needs `table`.

- **Two-`cn` fixture.** Before the task, add `field` and `textarea` with the CLI, so `cn` is installed and some files import it. `lib/utils.ts` stays old.
    - **Baseline:** 1 Sonnet run on `develop`, without the rule.
    - **With the rule:** 1 Sonnet run and 1 Opus run on the branch.
    - Each run gets a second turn with "可以，迁移吧".
- **Fresh fixture, as the template ships.** 1 Opus run with the rule.

The rule passes when:

- every with-rule run raises the `cn` migration in its first turn, and asks before touching any dependency, with `package.json` unchanged at the end of the first turn;
- after approval, the two-`cn` runs have `lib/utils.ts` re-exporting from `cn`, no `clsx` or `tailwind-merge` in `package.json`, and `composer check` passing.

The baseline shows what happens without the rule. If a with-rule run misses, report it, and do not widen the wording until the miss is understood.

## Calls made without the owner

- **The version.** `sp-v3.2.0`, because the agents' behaviour changes. Nothing is released until the owner asks.
- **No README change.** The rule is an operational detail of the shadcn CLI bullet.
- **No new Pest test.** The probe is the test.
- **The main session working inline is not probed.** Implementers write the UI in subagent-driven development, and the sp-v3.1.0 probe showed that the main session follows the same rules.
