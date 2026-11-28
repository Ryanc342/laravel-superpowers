# Project Workflow

## Definition of Done

- A task is finished only when `composer check` passes. It runs Pint, PHPStan, Oxfmt + Oxlint, tsc, Vitest and Pest, and stops at the first failure.
- Run `composer fix` to apply the fixes Pint, Oxfmt and Oxlint can make on their own, then run `composer check` again.
- After changing a page, a form or anything a user clicks through, also run `composer check:browser`. It builds the frontend, with no SSR bundle, and runs the browser tests in `tests/Browser`.
- While working, run the narrowest tests that cover the change (`php artisan test --compact --filter=...`, `npm run test -- <file>`). `composer check` is the final gate.
- The template owns no UI code. Its only UI rules are the two that follow, for the `shadcn` and `web-design-guidelines` skills it installs, which their vendors maintain and `skills-lock.json` records. The starter kit's UI it ships belongs to the project from the start, and the project decides the rest of its UI.
- UI here means the pages, layouts and components under `resources/js`, and `resources/css`. Before writing or changing UI, invoke the `shadcn` skill (in Claude Code, with the Skill tool). Reading its files is not enough: invoking it also loads the project's shadcn configuration and the components it has. Where it disagrees with `tailwindcss-development` or `inertia-react-development` on components or styling, follow the `shadcn` skill.
- Invoke the `web-design-guidelines` skill on the changed UI files before you report a task that changed UI as done, and in every review of a diff that changes UI. An implementer fixes what it finds or says why a finding stays. A reviewer reports what it finds as findings.
- Add shadcn components with its CLI. The `packageManager` field in `package.json` keeps the CLI on npm: without it, the starter kit's `pnpm-workspace.yaml` makes it install with pnpm. Preview first with `DO_NOT_TRACK=1 npx shadcn@latest add <name> --dry-run`. To keep every component the project already has, answer no to each overwrite prompt: `yes n | DO_NOT_TRACK=1 npx shadcn@latest add <name> --yes`. An unanswered prompt ends the run with nothing written. Overwrite an existing component only after reading its `--diff`.
- Components the CLI adds import `cn` from the `cn` package, which replaces `clsx` and `tailwind-merge`. The starter kit's `resources/js/lib/utils.ts` builds its own `cn` from those two. Before changing UI, check whether the project would have two: it already imports `cn` from the package, or a component you are adding brings it, while `lib/utils.ts` still builds its own. If so, propose `DO_NOT_TRACK=1 npx shadcn@latest migrate cn --yes`. It makes `lib/utils.ts` re-export `cn` from the package and replaces `clsx` and `tailwind-merge` with `cn` in `package.json`. That is a dependency change: ask for approval first, and change no dependency until you have the answer. If the answer is no, point the new component's `cn` import at `@/lib/utils` and add no `cn` package.
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
    - `tests/Pest.php` (it keeps the project's own `pest()` and `uses()` configuration)
    - `tests/bootstrap.php`
    - `tests/TestCase.php`
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
    - The page sweep's page lists are the exception: they are the project's. The template's defaults name the starter kit's pages, so the sweep and `tests/Feature/SweptPagesTest.php` fail by design once a project removes or moves one of them. Change the lists (`projectSweptPages()` and `projectSweptGuestPages()` in `tests/Support/*.php`, as "Test Runs" says), not the test.

### Template sync

- Projects started from laravel-superpowers have a `template` remote. Template updates come only from `template/main`, and they bring in tooling only. Never merge the template straight into `main`.
- Upstream's UI and app changes no longer reach a project through the template. A project that wants one takes it from laravel/react-starter-kit itself.
- Sync in this order:
    1. Fetch the template, read its upgrade notes, and merge it:
        - Fetch the template's `main` and its `sp-v*` tags: `git fetch template main 'refs/tags/sp-v*:refs/tags/sp-v*'`. Never pass `--force` when you fetch the template's tags: it would rewrite the project's own tags of the same names.
        - Read the template's `UPGRADING.md` (`git show template/main:UPGRADING.md`) and do what it lists for each template version (`sp-vX.Y.Z` tag) newer than the last one merged. Some of its steps change the steps below, among them how the lock files are resolved.
        - Cut `chore/sync-template-<YYYY-MM-DD>` from `develop` and run `git merge --no-ff --no-commit template/main`. Without `--no-ff`, git fast-forwards when `develop` is behind the template: there is then no `MERGE_HEAD`, and the template's whole tree, its UI included, is already on the branch.
    2. Take the template's version of every template-owned path.
        - The paths are two lists put together, so the tooling the template dropped goes too: the "The template owns these paths" list in the project's current version of this file, and the same list in the template's new one (`git show MERGE_HEAD:.ai/guidelines/project.md`).
        - A project's version from before sp-v3.0.0 has no such list. Use the paths that `UPGRADING.md`'s sp-v3.0.0 entry names instead. Never use an older ownership sentence or table: they named UI paths and whole folders.
        - A path the template's new version lists as mixed stays mixed, even if an old list named it.
        - Restore each path `MERGE_HEAD` has (`git ls-tree -r --name-only MERGE_HEAD -- <path>` prints it): `git restore --source=MERGE_HEAD --staged --worktree -- <each such path>`.
        - Remove each path it lacks: `git rm -r -q --ignore-unmatch -- <each such path>`. `git restore` cannot remove them. It stops, and restores nothing, at a path the merge already deleted, at one that neither side has, and at one left in conflict because the project changed what the template deleted.
    3. Put every other path back to the project's version, including files the merge changed cleanly, added or deleted. Run this step from the repository root: `git diff` prints paths from the root, and `.` covers the whole tree only there. First stage every path the merge left in conflict, markers and all (`git diff --name-only --diff-filter=U` lists them): `git add -A -- <each such path>`. `git restore` stops, and restores nothing, while a path is still in conflict that it leaves out or that `HEAD` lacks, such as a file the project deleted and the template changed. Then run `git restore --source=HEAD --staged --worktree -- . ':!<each path of step 2>' ':!<each mixed file of both versions>'`.
    4. Merge the mixed files by hand: keep the project's own changes, take only the template's tooling hunks, and leave no conflict marker behind. Step 3 staged the conflicted ones, so they no longer show as unmerged: `git grep -l '^<<<<<<<' -- <each mixed file>` finds them.
    5. Resolve the lock files as the next two rules say.
    6. Run `php artisan boost:update`.
    7. Run `composer check` and `composer check:browser`, then merge into `develop`.
- For `composer.lock`, start from the project's version, which step 3 puts back. Then run `composer update <the packages whose constraints the template changed> --no-scripts`, then `php artisan package:discover` and `php artisan boost:update`. Never add `-W`. When other packages must move too, use `--with-dependencies` and name the package.
- Treat `package-lock.json` the same way: start from the project's version, merge `package.json` by hand, then run `npm update <the packages the template changed>`. Never add `--force` or `--legacy-peer-deps`.

### Upstream sync

- Only laravel-superpowers has an `upstream` remote (laravel/react-starter-kit). Merge its updates on a branch of their own, in this order:
    1. Run `git fetch upstream`, cut `chore/sync-upstream-<YYYY-MM-DD>` from `develop` and run `git merge --no-ff --no-commit upstream/main`.
    2. Resolve the conflicts as the next rule says.
    3. Bring the lock files up to date. Upstream commits neither `composer.lock` nor `package-lock.json`, so start from the template's own. Run `composer update <the packages whose constraints changed> --no-scripts`, then `php artisan package:discover` and `php artisan boost:update`, by the template sync's rule for `composer.lock` (never `-W`, and `--with-dependencies` with the package named when others must move too). Then run `npm install`. Never add `--force` or `--legacy-peer-deps`.
    4. Run `composer check` and `composer check:browser`. Commit the merge with both lock files, and merge into `develop`.
- Take upstream's changes, its UI and app code included. "Ours" is the template and "theirs" is upstream. Resolve conflicts like this:
    - A UI or app file takes upstream's version: `git checkout --theirs -- <file>`, or `git rm -- <file>` when upstream deleted it. These are `components.json`, the files under `resources/`, `app/`, `bootstrap/`, `routes/`, `database/` and `config/` (other than `config/boost.php`), and upstream's tests: `tests/Feature/Auth/`, `tests/Feature/Settings/`, `tests/Feature/DashboardTest.php`, `tests/Feature/ExampleTest.php` and `tests/Unit/ExampleTest.php`. chisel's files among them stay deleted, as the chisel rule below says. Then strip the chisel markers by that rule, and run `composer fix`.
    - `README.md`: ours.
    - `.github/workflows/`: only `check.yml` is the template's. Upstream's `tests.yml` stays deleted, and a workflow upstream adds stays out: the merge has staged it, so remove it with `git rm -f -- <file>`.
    - Template-owned and mixed files: keep the template's tooling, and take upstream's changes to the rest.
    - Versions of tools and dependencies: the newer official one.
    - chisel stays removed: keep its files deleted and `laravel/chisel` out of `composer.json`. Strip any chisel marker the merge brings back by deleting only the comment (`/* @chisel-x */`, `/* @end-chisel-x */`, `{/* ... */}` in JSX, `<!-- ... -->`, `{{-- ... --}}`) and keeping all the code around and between the markers. Delete a whole line only when the marker is all that is on it; `UPGRADING.md` has an example of a line shared with code.
    - Everything else: keep the changes of both sides.

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
- Put your project's own Pest helper functions, custom expectations and classes in `tests/Support/*.php`. `tests/Pest.php` loads every file there. Keep `pest()` and `uses()` configuration in `tests/Pest.php`, with the rest of the suite's setup. Do not edit `tests/Pest.php` for helpers: the template's setup is in that file too, and changes to it conflict at template syncs.
- The template's own helpers are in `tests/Support/Template/`, which belongs to the template. They load after yours, and each is declared only when no function of its name exists yet, so a function of yours with the same name, in `tests/Pest.php` or `tests/Support`, replaces the template's.
- The page sweep (`tests/Browser/PageSweepTest.php`) opens the pages `projectSweptPages()` and `projectSweptGuestPages()` return, on a desktop and a phone: the first list signed in as a verified user, the second as a guest. A page fails when it answers with a status of 400 or more, does not mount the app, ends on another path, raises a JavaScript error or writes anything to the console.
- The sweep has no page list of its own. The template's defaults, in `tests/Support/Template/browser.php`, list the starter kit's pages. A `projectSweptPages()` or `projectSweptGuestPages()` of yours in `tests/Support/*.php` replaces the default, so it must list the starter-kit pages the project keeps as well as its own. Either may return `[]`, and the sweep then skips that list, but not both. `tests/Feature/SweptPagesTest.php` checks that every listed path is a GET route, and names the lists to change when one is not.
- The sweep opens every path on the test server's own host. It signs in as a user that `User::factory()` creates, with no role of its own. Some projects need more:
    - Pages on another host, such as a tenant's subdomain: in `tests/Pest.php`, give `PageSweepTest.php` a `beforeEach` that sets the host with `pest()->browser()->withHost(...)`, and an `afterEach` that resets it.
    - Pages behind a role: give the sweep's user that role there.

    Configure it with `->in('Browser/PageSweepTest.php')`, so other tests keep their own setup. Never edit the sweep itself.

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
