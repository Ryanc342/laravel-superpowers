# Project Workflow

## Definition of Done

- A task is finished only when `composer check` passes. It runs Pint, PHPStan, Oxfmt + Oxlint, tsc, Vitest and Pest, and stops at the first failure.
- Run `composer fix` to apply the fixes Pint, Oxfmt and Oxlint can make on their own, then run `composer check` again.
- After changing a page, a form or anything a user clicks through, also run `composer check:browser`. It builds the frontend, with no SSR bundle, and runs the browser tests in `tests/Browser`.
- While working, run the narrowest tests that cover the change (`php artisan test --compact --filter=...`, `npm run test -- <file>`). `composer check` is the final gate.
- The template ships no UI code and no UI rules: the project decides its own UI. The `shadcn` and `web-design-guidelines` skills it installs are maintained by their vendors, and `skills-lock.json` records them.
- A Stop hook (`.ai/hooks/check.sh`, wired up with a SessionStart hook in `.claude/settings.json` for Claude Code and `.codex/hooks.json` for Codex) runs `composer check` when a turn ends and this session changed files that have not passed it yet. When it reports failures, fix them before finishing. A second failure in a row lets the turn end with a warning.
    - It checks only the worktrees this session works in: the one it started in and every one it was in when an earlier turn ended. Changes that were already there when the session started, and changes in other worktrees, are left alone. `/clear` starts a new session, so changes left before it count as already there.
    - Markdown the session changed is formatted first, with the worktree's own `node_modules/.bin/vp`. When Markdown is all the session changed, `vp check` on those files replaces `composer check`.
    - When another test run holds the test database, or the check has not finished after `CHECK_HOOK_DEADLINE` seconds (540 by default), the hook only prints a message and does not hold the agent back. Neither counts as a pass: run `composer check` yourself.

## Development Workflow (superpowers)

- Work through the superpowers skills: brainstorming, then writing-plans, then subagent-driven-development (or executing-plans), then requesting-code-review and finishing-a-development-branch. Use systematic-debugging for bugs and verification-before-completion before saying anything is done.
- Write design specs to `docs/superpowers/specs/` and implementation plans to `docs/superpowers/plans/`. They are part of this workflow, so writing them needs no separate request; this overrides the general rule about creating documentation files.
- laravel-superpowers itself deletes its own specs and plans from `docs/superpowers/` before the branch that wrote them merges into `develop`. Git history keeps them, and projects started from the template do not receive them. This applies only to laravel-superpowers: a project keeps its own.
- Changes to behaviour or logic are test-driven: write the failing test first. Pure copy, styling and layout changes need no new tests, but `composer check` must still pass.

## Branches

- `main` is what has been released. `develop` is where finished work comes together. Work happens on short-lived branches cut from `develop` (`feature/<name>`, `fix/<name>`) and merges back into `develop` when `composer check` and `composer check:browser` pass. `develop` goes into `main` only as a release, when the user asks for it.
- Never run `composer` or `php artisan boost:update` with `-q`, and after any `composer update`, `require` or `remove` check that `git status` shows no template file rewritten.

### Template-owned and mixed files

- The template owns these paths. A project does not edit them, and a template sync takes them whole from the template:
    - `tests/Pest.php`
    - `tests/bootstrap.php`
    - `tests/TestCase.php`
    - `tests/Support/Template/`
    - `tests/Browser/PageSweepTest.php`
    - `tests/Browser/BrowserActionTimeoutTest.php`
    - `tests/Feature/SweptPagesTest.php`
    - `tests/Feature/TestDatabaseTest.php`
    - `tests/Feature/ViteIsolationTest.php`
    - `tests/Unit/ArchTest.php`
    - `tests/Unit/AgentGuidanceTest.php`
    - `tests/Unit/TemplateTestHelpersTest.php`
    - `tests/js/ai-hooks/`
    - `.ai/hooks/check.sh`
    - `.agents/skills/shadcn/`
    - `.agents/skills/web-design-guidelines/`
    - `.claude/skills/shadcn`
    - `.claude/skills/web-design-guidelines`
    - `.codex/hooks.json`
    - `.node-version`
    - `UPGRADING.md`
- Mixed files hold the template's tooling and the project's own changes. A template sync takes only the template's tooling hunks, merged by hand, and keeps the rest of the project's version:
    - `composer.json`
    - `package.json`
    - `vite.config.ts`
    - `tsconfig.json`
    - `.gitignore`
    - `phpunit.xml`
    - `.env.example`
    - `config/boost.php`
    - `phpstan.neon`
    - `.claude/settings.json` (its hooks block is the template's)
    - `.codex/config.toml`
    - `.mcp.json`
    - `.github/workflows/check.yml`
    - `.ai/guidelines/project.md` (this file; the project keeps sections of its own)
    - `skills-lock.json` (it keeps the skills the project installs itself)
- Boost generates `CLAUDE.md`, `AGENTS.md`, `boost.json` and its own skills in `.claude/skills/` and `.agents/skills/`. A template sync keeps the project's version of them, and `php artisan boost:update` regenerates them.
- Everything else is the project's, including all UI and app code.
- A template-owned test holds for any UI a project has. One that fails after a project changes its UI is a template bug: report it, and do not edit it.

### Template sync

- Projects started from laravel-superpowers have a `template` remote. Template updates come only from `template/main`, and they bring in tooling only. Never merge the template straight into `main`.
- Upstream's UI and app changes no longer reach a project through the template. A project that wants one takes it from laravel/react-starter-kit itself.
- Before you start, read the template's `UPGRADING.md` (`git show template/main:UPGRADING.md`) and do what it lists for each template version (`sp-vX.Y.Z` tag) newer than the last one merged. Some of its steps change the steps below, among them how the lock files are resolved.
- Sync in this order:
    1. Cut `chore/sync-template-<YYYY-MM-DD>` from `develop` and run `git merge --no-commit template/main`.
    2. Take the template's version of every template-owned path: `git restore --source=MERGE_HEAD --staged --worktree -- <each template-owned path>`.
    3. Put every other path back to the project's version, including files the merge changed cleanly, added or deleted: `git restore --source=HEAD --staged --worktree -- . ':!<each template-owned path>' ':!<each mixed file>'`.
    4. Merge the mixed files by hand: keep the project's own changes, and take only the template's tooling hunks.
    5. Resolve the lock files as the next two rules say.
    6. Run `php artisan boost:update`.
    7. Run `composer check` and `composer check:browser`, then merge into `develop`.
- Take both lists from the template's new version of this file (`git show MERGE_HEAD:.ai/guidelines/project.md`). A release can add or drop paths, and `git restore` stops at a path the template no longer has.
- For `composer.lock`, start from the project's version, which step 3 puts back. Then run `composer update <the packages whose constraints the template changed> --no-scripts`, then `php artisan package:discover` and `php artisan boost:update`. Never add `-W`. When other packages must move too, use `--with-dependencies` and name the package.
- Treat `package-lock.json` the same way: start from the project's version, merge `package.json` by hand, then run `npm update <the packages the template changed>`. Never add `--force` or `--legacy-peer-deps`.

### Upstream sync

- Only laravel-superpowers has an `upstream` remote (laravel/react-starter-kit). Merge its updates on a branch of their own: cut `chore/sync-upstream-<YYYY-MM-DD>` from `develop`, `git merge upstream/main`, run both checks, merge into `develop`.
- Take upstream's changes as they come, its UI and app code included. "Ours" is the template and "theirs" is upstream. Resolve conflicts like this:
    - Template-owned and mixed files: keep the template's tooling, and take upstream's changes to the rest.
    - Every other file: upstream's.
    - Versions of tools and dependencies: the newer official one.
    - chisel stays removed: keep its files deleted and `laravel/chisel` out of `composer.json`. Strip any chisel marker the merge brings back by deleting only the comment (`/* @chisel-x */`, `/* @end-chisel-x */`, `{/* ... */}` in JSX, `<!-- ... -->`, `{{-- ... --}}`) and keeping all the code around and between the markers. Delete a whole line only when the marker is all that is on it; `UPGRADING.md` has an example of a line shared with code.
    - `.github/workflows/check.yml` stays, and upstream's `tests.yml` stays deleted.

## Git Worktrees

- superpowers creates worktrees in `.worktrees/`, which git ignores.
- Set up a new worktree on its own: copy `.env` and give `DB_DATABASE` a name of its own (for example the app name plus the branch name), so neither its database nor its `_test` database clashes with another checkout. Then run `composer install`, `npm install`, `php artisan migrate --force` and `npm run build`.

## Database

- Development and the tests use MySQL, like production. The tests use their own database, `DB_DATABASE` with a `_test` suffix, which `tests/bootstrap.php` creates when it is missing. Never point the tests at the development database.
- MySQL must be running locally for `composer check` to pass.

## Test Runs

- Never stop processes by name: no `pkill -f`, no `killall`, no `kill $(pgrep ...)`. They also hit the test runs of other projects.
- Stop a stuck test run only by the process group of the command you started: `kill -- -<pgid>`, with the group from `ps -o pgid= -p <pid>`, and only when it differs from your own shell's group, `ps -o pgid= -p $$`. That stops Pest with it. Killing only the PID of `composer` or `php artisan test` leaves Pest running to the end of the suite, still holding the test database.
- One test run uses a test database at a time. `tests/bootstrap.php` takes a MySQL lock on it, and a second run waits `TEST_DATABASE_LOCK_WAIT` seconds (600 by default) for the lock before it gives up. `TEST_DATABASE_LOCK_WAIT=0` makes it give up at once.
- Put your project's own Pest helper functions, custom expectations and classes in `tests/Support/*.php`. `tests/Pest.php` loads every file there. Keep `pest()` and `uses()` configuration in `tests/Pest.php`, with the rest of the suite's setup. Do not edit `tests/Pest.php` for helpers: the template owns that file, and changes to it conflict at template syncs.
- The template's own helpers are in `tests/Support/Template/`, which belongs to the template. They load after yours, and each is declared only when no function of its name exists yet, so a function of yours with the same name, in `tests/Pest.php` or `tests/Support`, replaces the template's.
- The page sweep (`tests/Browser/PageSweepTest.php`) opens the pages `projectSweptPages()` and `projectSweptGuestPages()` return, on a desktop and a phone: the first list signed in as a verified user, the second as a guest. A page fails when it does not mount the app, ends on another path, raises a JavaScript error or writes anything to the console.
- The sweep has no page list of its own. The template's defaults, in `tests/Support/Template/browser.php`, list the starter kit's pages. A `projectSweptPages()` or `projectSweptGuestPages()` of yours in `tests/Support/*.php` replaces the default, so it must list the starter-kit pages the project keeps as well as its own. `tests/Feature/SweptPagesTest.php` checks that every listed path is a GET route.

## Architecture Rules

`tests/Unit/ArchTest.php` runs Pest's `php`, `security` and `laravel` presets over the code in `app/`, `database/factories/` and `database/seeders/`, and `composer check` fails on a breach. The presets live in `vendor/pestphp/pest/src/ArchPresets/`. These are the rules that stop code:

- Never use `dd`, `ddd`, `dump`, `ray`, `exit`, `die`, `echo`, `print`, `print_r`, `var_dump` or `var_export`.
- Never call `env()` outside `config/`. Read configuration with `config()`.
- Never use `md5`, `sha1`, `uniqid`, `rand`, `mt_rand`, `shuffle`, `str_shuffle`, `array_rand`, `tempnam`, `eval`, `exec`, `shell_exec`, `system`, `passthru`, `unserialize`, `extract` or `assert`. Use `random_int()`, `Str::random()` or `hash('sha256', ...)`.
- Nothing outside `App\Http` and `App\Providers` may use a class from `App\Http`. A model, job or service cannot depend on a controller, a middleware or a form request.
- A controller's public methods are only `__construct`, `__invoke`, `index`, `show`, `create`, `store`, `edit`, `update`, `destroy` and `middleware`. Every class in `App\Http\Controllers` ends in `Controller`, and no class elsewhere does.
- A class in `App\Http\Middleware` has a `handle()` method.
- A class in `App\Http\Requests` ends in `Request`, extends `FormRequest` and has `rules()`. Nothing outside that namespace extends `FormRequest`.
- A class in `App\Console\Commands` ends in `Command`, extends `Illuminate\Console\Command` and has `handle()`. Nothing outside that namespace extends `Command`.
- A class in `App\Mail` extends `Mailable` and implements `ShouldQueue`. Nothing outside that namespace extends `Mailable`.
- A class in `App\Jobs` implements `ShouldQueue` and has `handle()`. A class in `App\Listeners` has `handle()`.
- A class in `App\Models` extends `Model` and does not end in `Model`. Nothing outside that namespace extends `Model`.
- `App\Enums` holds only enums, and enums live nowhere else. `App\Traits` and `App\Concerns` hold only traits.
- A class in `App\Notifications` extends `Notification`, and nothing outside that namespace does. A class in `App\Policies` ends in `Policy`.
- Classes in `App\Providers` end in `ServiceProvider` and extend `ServiceProvider`, and nothing outside that namespace does. No other class may use a provider.
- Every class in `App\Exceptions` implements `Throwable`, and no class outside that namespace does.

## CI

- After you push `main`, watch its CI run: find it with `gh run list --branch main --commit "$(git rev-parse HEAD)"`, which lists nothing until GitHub has created the run, then run `gh run watch <run-id> --exit-status`. When it fails, fix it before you merge or push anything else.

## Generated Files

- `CLAUDE.md` and `AGENTS.md` are generated from this file and the Boost guidelines by `php artisan boost:update`. Edit `.ai/guidelines/project.md` and run the command; never edit those two by hand.
- `.ai/rules/index.md` is generated from the rule files in `.ai/rules` by `php artisan boost:index-rules`. After a merge conflict in `.ai/rules`, resolve the rule files and run the command again.
- Install a skill with the skills CLI, for both agents: `DO_NOT_TRACK=1 npx skills add <source> --skill <name> --agent claude-code codex -y`. Commit `.agents/skills/<name>`, its `.claude/skills/<name>` link and `skills-lock.json`. `tests/Unit/AgentGuidanceTest.php` checks that every skill in `skills-lock.json` is there for both agents.
