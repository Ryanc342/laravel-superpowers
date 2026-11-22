# Project Workflow

## Definition of Done

- A task is finished only when `composer check` passes. It runs Pint, PHPStan, Oxfmt + Oxlint, tsc, Vitest and Pest, and stops at the first failure.
- Run `composer fix` to apply the fixes Pint, Oxfmt and Oxlint can make on their own, then run `composer check` again.
- After changing a page, a form or anything a user clicks through, also run `composer check:browser`. It builds the frontend and runs the browser tests in `tests/Browser`.
- While working, run the narrowest tests that cover the change (`php artisan test --compact --filter=...`, `npm run test -- <file>`). `composer check` is the final gate.

## Development Workflow (superpowers)

- Work through the superpowers skills: brainstorming, then writing-plans, then subagent-driven-development (or executing-plans), then requesting-code-review and finishing-a-development-branch. Use systematic-debugging for bugs and verification-before-completion before saying anything is done.
- Write design specs to `docs/superpowers/specs/` and implementation plans to `docs/superpowers/plans/`. They are part of this workflow, so writing them needs no separate request; this overrides the general rule about creating documentation files.
- Changes to behaviour or logic are test-driven: write the failing test first. Pure copy, styling and layout changes need no new tests, but `composer check` must still pass.

## Git Worktrees

- superpowers creates worktrees in `.worktrees/`, which git ignores.
- Set up a new worktree on its own: copy `.env` and give `DB_DATABASE` a name of its own (for example the app name plus the branch name), so neither its database nor its `_test` database clashes with another checkout. Then run `composer install`, `npm install`, `php artisan migrate --force` and `npm run build`.

## Database

- Development and the tests use MySQL, like production. The tests use their own database, `DB_DATABASE` with a `_test` suffix, which `tests/bootstrap.php` creates when it is missing. Never point the tests at the development database.
- MySQL must be running locally for `composer check` to pass.
