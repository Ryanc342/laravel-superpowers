<laravel-boost-guidelines>
=== .ai/project rules ===

# Project Workflow

## Definition of Done

- A task is finished only when `composer check` passes. It runs Pint, PHPStan, Oxfmt + Oxlint, tsc, Vitest and Pest, and stops at the first failure.
- Run `composer fix` to apply the fixes Pint, Oxfmt and Oxlint can make on their own, then run `composer check` again.
- After changing a page, a form or anything a user clicks through, also run `composer check:browser`. It builds the frontend and runs the browser tests in `tests/Browser`.
- While working, run the narrowest tests that cover the change (`php artisan test --compact --filter=...`, `npm run test -- <file>`). `composer check` is the final gate.
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
- Projects started from laravel-superpowers have a `template` remote. Template updates come only from `template/main`: cut `chore/sync-template-<YYYY-MM-DD>` from `develop`, `git merge template/main`, resolve conflicts in favour of the project's own code except in the template's tooling files (below), run both checks, merge into `develop`. Never merge the template straight into `main`.
    - Before you resolve the lock files, read `UPGRADING.md` and do what it lists for each template version (`sp-vX.Y.Z` tag) newer than the last one merged. Some of its steps change how the lock files are resolved.
    - The template owns its tooling files: `tests/Pest.php`, `tests/bootstrap.php`, `tests/TestCase.php`, `tests/process-watchdog.sh`, `tests/Browser/PageSweepTest.php`, `.ai/hooks/check.sh`, and the hooks block of `.claude/settings.json` and `.codex/hooks.json`. In a conflict in one of them, take the template's version (`git checkout --theirs <file>`), then add the project's own additions back.
    - The template also owns its UI files, and leaves alone the few a project owns: see "Who owns which file" below.
    - Merge both sides of a `composer.json` or `config/boost.php` conflict by hand.
    - For `composer.lock`, start from the project's version (`git checkout --ours composer.lock`), then run `composer update <the packages whose constraints the template changed> --no-scripts`, then `php artisan package:discover` and `php artisan boost:update`. Never add `-W`. When other packages must move too, use `--with-dependencies` and name the package.
    - Treat `package-lock.json` the same way: start from the project's version, merge `package.json` by hand, then run `npm update <the packages the template changed>`. Never add `--force` or `--legacy-peer-deps`.
- Only laravel-superpowers has an `upstream` remote (laravel/react-starter-kit). Merge its updates the same way: cut `chore/sync-upstream-<YYYY-MM-DD>` from `develop`, `git merge upstream/main`, run both checks, merge into `develop`. "Ours" is always the template. Resolve conflicts like this:
    - Pages, components and styles: ours.
    - Versions of tools and dependencies: the newer official one.
    - chisel stays removed: keep its files deleted and `laravel/chisel` out of `composer.json`. Strip any chisel marker the merge brings back by deleting only the comment (`/* @chisel-x */`, `/* @end-chisel-x */`, `{/* ... */}` in JSX, `<!-- ... -->`, `{{-- ... --}}`) and keeping all the code around and between the markers. Delete a whole line only when the marker is all that is on it; `UPGRADING.md` has an example of a line shared with code.
    - The starter kit's front end stays out: its pages, components, layouts, hooks and styles stay deleted, new UI files it adds are not taken, and its shadcn, Radix and other UI packages stay out of `package.json` even when it bumps them. Its backend, configuration and tooling changes merge as before.
    - Everything else: keep the changes of both sides.
- Never run `composer` or `php artisan boost:update` with `-q`, and after any `composer update`, `require` or `remove` check that `git status` shows no template file rewritten.

### Who owns which file

This split is what keeps template syncs from conflicting. The UI is built as the `ant-design-ui` skill says.

| Template-owned (projects don't edit)                                                                                                             | Project-owned (the template ships it once and leaves it alone)                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| the glue (`resources/js/ui/`, `resources/js/lib/i18n.ts`), `resources/js/app.tsx`, `resources/js/ssr.tsx`, the layouts (`resources/js/layouts/`) | `resources/js/theme.ts`                                                                                                                                                                                                  |
| auth, settings, error and example pages, with their routes and controllers                                                                       | the app menu (`resources/js/navigation.ts`), `resources/js/pages/dashboard.tsx`, `resources/js/pages/welcome.tsx`                                                                                                        |
| `lang/template/*.json`, `lang/en/*.php`, `lang/zh_CN/*.php`                                                                                      | `lang/zh_CN.json`                                                                                                                                                                                                        |
| the `ant-design-ui` skill (`.ai/skills/ant-design-ui`)                                                                                           | the project's UI notes (`.ai/skills/project-ui/SKILL.md`)                                                                                                                                                                |
| the other tests, which hold for any theme, menu or page the project has (`tests/`, with `tests/Support/Template/`)                               | the tests of the project's look: `tests/js/project-theme.test.ts`, `tests/js/pages/dashboard.test.tsx`, `tests/js/pages/welcome.test.tsx`, `tests/js/ssr/project-pages.test.tsx` and `tests/Browser/ProjectLookTest.php` |

A project that needs to change a template-owned page copies it into a page of its own and points its route there, instead of editing the template's page.

A template-owned test never names a project-owned value: its colour, its menu entries, its dashboard or its welcome page. A project that changes `theme.ts`, `navigation.ts`, `dashboard.tsx` or `welcome.tsx` edits the project-owned tests above that pin them. A template-owned test that fails after such a change is a template bug: report it, and do not edit it.

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
- When Pest itself is killed, a watchdog that `tests/bootstrap.php` starts ends the Pest workers and the Playwright server it left behind.
- Put your project's own Pest helper functions, custom expectations and classes in `tests/Support/*.php`. `tests/Pest.php` loads every file there. Keep `pest()` and `uses()` configuration in `tests/Pest.php`, with the rest of the suite's setup. Do not edit `tests/Pest.php` for helpers: the template owns that file, and changes to it conflict at template syncs.
- The template's own helpers are in `tests/Support/Template/`, which belongs to the template. They load after yours, and each is declared only when no function of its name exists yet, so a function of yours with the same name, in `tests/Pest.php` or `tests/Support`, replaces the template's.
- The page sweep (`tests/Browser/PageSweepTest.php`) opens every signed-in page on a desktop and a phone. List your project's own signed-in pages in a `projectSweptPages()` of yours in `tests/Support/*.php`, never in the sweep's own list, which the template adds to.

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

=== foundation rules ===

# Laravel Boost Guidelines

## Foundational Context

This application is a Laravel application running on PHP 8.4. Always use the APIs that match the installed major version of each package — do not assume a version.

Before relying on a package's API, confirm its installed version:
- PHP packages: run `composer show --direct` to list direct dependencies with versions, or `composer show <vendor/package>` for a single package.
- JS packages: check `package.json` for the installed versions.

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If a frontend change doesn't show in the UI or you get a "Unable to locate file in Vite manifest" error, run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Use `search-docs` before changes that depend on Laravel ecosystem APIs, behavior, configuration, or version-specific syntax. Skip it for copy-only edits and other changes where package documentation is irrelevant. Reuse sufficient results already in context instead of searching again.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Project Rules

- This project contains committed, area-grouped rules in `.ai/rules` when that directory exists, including path-scoped framework guidelines under `.ai/rules/boost`. Before you enter plan mode or create/edit any file, you MUST first: open @.ai/rules/index.md (it maps file globs to rule files), read every rule file whose globs cover the path(s) in scope, and run `grep -rin 'keyword' .ai/rules` to catch what a path match alone misses. Do not write code until you have read and are following every matching rule. If `.ai/rules` does not exist, continue without it.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== tests rules ===

# Test Enforcement

- Add or update tests for behavior and logic changes when a test provides meaningful regression coverage.
- Pure copy, styling, and layout-only changes do not require new or updated tests.
- When test coverage applies, run the affected tests and ensure they pass.
- Test the changed behavior and its important failure modes, but do not add tests beyond them.
- Read the `testing-best-practices` skill before writing tests.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

# Inertia v3

- Use all Inertia features from v1, v2, and v3. Check the documentation before making changes to ensure the correct approach.
- New v3 features: standalone HTTP requests (`useHttp` hook), optimistic updates with automatic rollback, layout props (`useLayoutProps` hook), instant visits, simplified SSR via `@inertiajs/vite` plugin, custom exception handling for error pages.
- Carried over from v2: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.
- Axios has been removed. Use the built-in XHR client with interceptors, or install Axios separately if needed.
- `Inertia::lazy()` / `LazyProp` has been removed. Use `Inertia::optional()` instead.
- Prop types (`Inertia::optional()`, `Inertia::defer()`, `Inertia::merge()`) work inside nested arrays with dot-notation paths.
- SSR works automatically in Vite dev mode with `@inertiajs/vite` - no separate Node.js server needed during development.
- Event renames: `invalid` is now `httpException`, `exception` is now `networkError`.
- `router.cancel()` replaced by `router.cancelAll()`.
- The `future` configuration namespace has been removed - all v2 future options are now always enabled.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

=== wayfinder/core rules ===

# Laravel Wayfinder

Use Wayfinder to generate TypeScript functions for Laravel routes. Import from `@/actions/` (controllers) or `@/routes/` (named routes).

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== pest/core rules ===

# Pest

- This project uses Pest. Create tests with `php artisan make:test --pest {name}`.
- Do not include the test suite directory in `{name}`. Use `SomeFeatureTest`, not `Feature/SomeFeatureTest`.
- Read the `testing-best-practices` skill for guidance on coverage, naming, structure, dependency isolation, and review.
- Do not delete tests or test files without approval. They are part of the application.

## Running Tests

- Run the narrowest set of tests that covers the change. Pass a file path or `--filter=testName` to `php artisan test --compact`.
- Rerun a test after each change to it.
- Run `vendor/bin/pest` to call the test runner directly. It accepts the same file path and `--filter=testName` arguments.

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

</laravel-boost-guidelines>
