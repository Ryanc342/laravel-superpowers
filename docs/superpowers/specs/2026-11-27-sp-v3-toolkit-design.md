# sp-v3.0.0: the template becomes a toolkit — design

## Intent

laravel-superpowers kept needing fixes. The owner traced most of them to code the template wrote on top of Laravel's starter kit:

- the Ant Design UI and the glue that joins it to Laravel and Inertia (`resources/js/ui`, about 2,700 lines);
- the example pages;
- the zh/en translation layer;
- the build-time style extraction that server-side rendering needed;
- the process watchdog, fixed six times in one day.

The template also owned UI files that all three downstream projects edit, so every template sync conflicted.

The owner's decisions (2026-11-27, conversation and the approved summary page):

- **The template is a toolkit.** It is Laravel's official React starter kit, **unchanged**, plus the development tooling.
- **The template owns no UI code and no UI rules.** Downstream projects decide everything about their UI themselves: components, tables, date pickers, error pages, page design, language and SSR.
- No built-in translation. The example pages ("前端预览") go. Ant Design goes.
- `composer check` stays.
- Two ready-made agent skills, maintained by their vendors, are installed: shadcn's official `shadcn` skill and Vercel's `web-design-guidelines`.
- The language follows the starter kit, which is English. A project that wants Chinese adds it itself.

## Who uses it

The template is synced into three downstream projects through their `template` remote:

- MyCompany, invoicing;
- DulaBot, a chatbot admin;
- FC-ERP-Suite, a multi-tenant ERP.

**All three are on sp-v1.3.0.** None ever merged sp-v2.0.0; MyCompany's paused v2 migration was deleted on 2026-11-27. So v3 must upgrade cleanly **from sp-v1.3.0**.

sp-v1.3.0 shipped shadcn UI plus template-owned shared components and agent guidance:

- `resources/js/components/shared/**` and their tests under `tests/js/components/shared/**`;
- the `.ai/skills/frontend-components` skill;
- the process watchdog.

It shipped no translation files and no `users.locale` migration.

## Goals

1. **The UI is upstream's, byte for byte.** Every file under `resources/` (js, css, views) and `components.json` equals `upstream/main` (laravel/react-starter-kit). Upstream was at `50a9f6c` (2026-11-25) when this was written; use whatever `upstream/main` is when the work starts, and record the commit in UPGRADING.
    - Files the template added under those paths are deleted.
    - Files the template deleted there are restored.
2. **Backend, config and routes are upstream's too, except tooling.** `app/`, `bootstrap/`, `config/`, `routes/`, `database/` and `lang/` equal `upstream/main`, except for the tooling exceptions under "Tooling that stays".
    - This removes, among others:
        - the example controllers, requests and routes, plus `GeneratesExampleData`, `DownloadsCsv` and `EnsureExamplesExist`;
        - `ListRequest` and `config/lists.php`;
        - the locale layer: `Locale` enum, `SetLocale`, `LocaleController`, `LocaleUpdateRequest`, the `users.locale` migration, `HasLocalePreference`/`preferredLocale` on `User`, and `lang/**`;
        - the precognition rate limiting and the password-update and account-deletion limiters in `AppServiceProvider`;
        - the `hasVerifiedEmail` business rule on `User`;
        - `NotFoundController`, plus the error-page exception handling in `bootstrap/app.php`;
        - the template's edits to the settings controllers and requests, `HandleAppearance`, `HandleInertiaRequests`, `FortifyServiceProvider`, `config/fortify.php`, `config/app.php`, `UserFactory`, `routes/web.php` and `routes/settings.php`.
    - **chisel stays removed.**
        - `chisel.php`, `chisel-paths.php` and `app/Console/Commands/InstallFeaturesCommand.php` stay deleted, and `laravel/chisel` stays out of `composer.json`.
        - When an upstream file is restored, strip its chisel markers by the existing rule in `.ai/guidelines/project.md`: delete only the marker comments (for example `/* @chisel-2fa */` in `app/Models/User.php`) and keep the code between them.
3. **Upstream's own tests come back as upstream wrote them.** `tests/Feature/Auth/*`, `tests/Feature/Settings/*`, `tests/Feature/DashboardTest.php` and the two `ExampleTest.php` files are restored to upstream. From v3 on they are the project's: they test the UI the project owns.
4. **Everything the removed features needed is deleted.** That includes their tests, their dependencies, their Vite plugins, their agent guidance and their docs:
    - **Packages:** Ant Design (`antd`, `@ant-design/*`), every package that only served the glue, the example pages, the translation layer or SSR style extraction, and the Precognition client if nothing else uses it.
    - **Tests:** `tests/js/**` other than the tooling tests (goal 6); `tests/Browser/**` other than the tooling tests (goal 6); the `tests/Feature/*` files of removed features (Examples, ListRequest, Locale, Translations, DownloadsCsv, ErrorPage, FeatureSwitches, Precognition, and the middleware tests whose middleware reverts to upstream); `tests/Support/Template/SsrServer.php` and `tests/Support/Template/fortify.php`.
    - **Agent guidance:** `.ai/skills/ant-design-ui`.
5. **The watchdog goes.**
    - Delete `tests/process-watchdog.sh`, its start in `tests/bootstrap.php` and its tests.
    - Stopping a stuck run stays covered by the existing rule: kill the process group of the command you started.
6. **Tooling that stays:**
    - **Checks:**
        - `composer check` with the same steps as today (Pint, PHPStan, Wayfinder generate, Oxfmt + Oxlint, tsc, Vitest, Pest). Vitest stays for the projects' own JS tests and the tooling tests.
        - `composer fix`.
        - `composer check:browser`, without the SSR build (`npx vp build --ssr` goes) and without the sweep's own SSR server.
    - **Tests and their support:**
        - `tests/bootstrap.php`: creates `<DB>_test` and takes the MySQL `GET_LOCK`, honouring `TEST_DATABASE_LOCK_WAIT`.
        - `tests/Pest.php`, `tests/TestCase.php`, `tests/Support/Template/browser.php`, and `frontend-imports.php` if it still serves a kept test.
        - `tests/Unit/ArchTest.php`, `tests/Unit/AgentGuidanceTest.php` (updated to the new guidance), `tests/Unit/TemplateTestHelpersTest.php`, `tests/Feature/TestDatabaseTest.php`, `tests/Feature/ViteIsolationTest.php` if it still tests something real, and `tests/Browser/BrowserActionTimeoutTest.php`.
        - **The page sweep** (`tests/Browser/PageSweepTest.php`), simplified:
            - Without SSR, it opens pages on a desktop and a phone, and fails on a server error, a JavaScript error or a console error.
            - **It has no page list of its own.** It opens exactly the pages that `projectSweptPages()` (signed in) and `projectSweptGuestPages()` (guests) return. The template's default versions of those two functions, in `tests/Support/Template/`, list the starter kit's pages.
            - A project's own definition in `tests/Support/*.php` replaces the default by the existing name rule, and lists whichever of those pages it keeps.
            - This way the sweep holds for any UI a project builds, including a project that turns a Fortify feature off. _(Controller's call, from the builder check.)_
    - **The Stop hook:**
        - `.ai/hooks/check.sh`, the SessionStart and Stop wiring in `.claude/settings.json` and `.codex/hooks.json`, and its tests in `tests/js/ai-hooks`.
        - Its core behaviour stays: at turn end, run `composer check` where this session changed files; a failure keeps the agent working; a second failure in a row lets the turn end with a warning; it respects `TEST_DATABASE_LOCK_WAIT=0` and a deadline.
        - Remove what only served removed pieces (watchdog, SSR). How much more to simplify is left to the builder (below).
    - **Tooling config:**
        - MySQL in `.env.example` (`DB_DATABASE=change_me` with its comment) and in `phpunit.xml`, with `APP_LOCALE` back to upstream's `en`;
        - `.node-version`, `.mcp.json`, `boost.json`, `config/boost.php`, `phpstan.neon`;
        - the tooling parts of `vite.config.ts`, `tsconfig.json`, `package.json`, `composer.json` and `.gitignore`;
        - `.github/workflows/check.yml`, with the SSR build step removed.
7. **Agent skills: the two ready-made ones are installed and committed.**
    - Install with the `skills` CLI, telemetry off:
        - `DO_NOT_TRACK=1 npx skills add shadcn-ui/ui --skill shadcn --agent claude-code codex -y`
        - `DO_NOT_TRACK=1 npx skills add vercel-labs/agent-skills --skill web-design-guidelines --agent claude-code codex -y`
    - Commit `.agents/skills/<name>`, the `.claude/skills/<name>` links and `skills-lock.json`.
    - Install only the `shadcn` skill from shadcn-ui/ui, not `migrate-radix-to-base`.
    - Verify that `php artisan boost:update` leaves both skills alone. Boost only deletes skills it recorded itself.
    - **Boost's own `tailwindcss-development` skill comes back.** Remove it from `skills.exclude` in `config/boost.php`. That exclusion only existed because pages were built with Ant Design, and the projects on sp-v1.3.0 already have the skill. Update `AgentGuidanceTest` to match. _(Controller's call, from the builder check.)_
8. **The project rules (`.ai/guidelines/project.md`) are rewritten.** Then run `php artisan boost:update` (never with `-q`) to regenerate `CLAUDE.md` and `AGENTS.md`.
    - **Keep:** Definition of Done, the superpowers workflow, Branches, Git Worktrees, Database, Test Runs (minus the watchdog), Architecture Rules, CI and Generated Files.
    - **Remove:** the "Who owns which file" UI table, every UI ownership rule, the `ant-design-ui` reference and the template-owned-test rules about the project's look (`theme.ts`, `navigation.ts`, `dashboard.tsx`, `welcome.tsx`, `theme-background`).
    - **Template-owned files** become only the tooling files:
        - `tests/Pest.php`, `tests/bootstrap.php`, `tests/TestCase.php`, `tests/Support/Template/**`;
        - the kept tooling tests: `tests/Browser/PageSweepTest.php`, `tests/Browser/BrowserActionTimeoutTest.php`, `tests/js/ai-hooks/**`, and the kept `tests/Unit` and `tests/Feature` tooling tests listed in Goal 6;
        - `.ai/hooks/check.sh`;
        - the hooks block of `.claude/settings.json` and `.codex/hooks.json`;
        - the two installed skills and `skills-lock.json`.

        Everything else is the project's. The plan writes the exact list into `project.md` and `UPGRADING.md`.

    - **Upstream sync** (laravel-superpowers only):
        - Take upstream's UI, backend and tooling changes as they come; the starter kit's front end is no longer kept out.
        - chisel stays removed.
        - Keep the rule that dependency versions take the newer official one.
    - **Template sync** (projects): **a template sync brings in tooling only.** This applies to every change, not just to conflicts. The owner approved this on the summary page: "合并 v3，只带进工具上的变化".
        1. Merge `template/main` with `--no-commit`.
        2. Take the template's version of every template-owned file.
        3. Restore every other path to the project's own version, including files the merge changed cleanly, added or deleted: `git restore --source=HEAD --staged --worktree -- . ':!<template-owned paths>'`.
        4. **Mixed files** take only the template's tooling hunks, merged by hand. These are `composer.json`, `package.json`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `phpunit.xml`, `.env.example` and `config/boost.php`.
        5. The lock-file rules stay.

        **Consequence, stated in the docs:** upstream's UI and app changes no longer reach a project through the template. A project that wants one takes it from laravel/react-starter-kit itself.
9. **Docs.**
    - `README.md` describes the toolkit.
    - `UPGRADING.md` gets an `sp-v3.0.0` entry written for a project **on sp-v1.3.0**. It says that v2's steps do not apply (no project ever merged v2).
    - That entry's steps:
        1. Cut `chore/sync-template-<date>` and merge `template/main` with `--no-commit`.
        2. Apply the template-sync rule above. Take the template-owned files, and restore everything else to the project's own version.
            - Without the restore, the merge would silently replace or delete the v1 UI the project never edited: `components/shared`, the pages that import it, `app.css` tokens, edited `components/ui/*`, the `HandleInertiaRequests` and `HandleAppearance` changes, and the v1 UI tests.
            - After the restore, all of it is project-owned, including `.ai/skills/frontend-components` if the project keeps it.
        3. Merge the mixed files by hand, keeping only the template's tooling hunks.
        4. Lock files by the existing rules.
        5. `php artisan boost:update`.
        6. **The page sweep.**
            - If the project defines its own `projectSweptPages()` / `projectSweptGuestPages()`, make them also list the starter-kit pages it keeps (dashboard, settings, auth pages). The sweep no longer has a built-in list.
            - Otherwise the template's defaults apply.
        7. `composer check` and `composer check:browser` pass, then merge into `develop`.
    - Previous entries stay as history.
10. **Release.** `sp-v3.0.0` follows the usual release branch. Release only with the owner's approval. Delete this spec and its plan from `docs/superpowers/` before the branch merges into `develop`.

## Non-goals

- Changing the starter kit's UI in any way: look, language, layout or pages.
- Migrating the three projects. Each is its own task after the release.
- New tooling features.
- Bumping Laravel, Inertia or other packages beyond what `upstream/main` has.

## Anti-goals

- **Template-owned UI coming back in any form:** a component, a wrapper, a hook, a page rule or a "recommended" UI layer in the guidance.
- **A tooling test that fails when a project changes its UI.** Every test the template keeps must hold for any UI.
- **A project losing UI files on the v3 merge** without UPGRADING telling it how to keep them.
- `composer check` or `composer check:browser` failing on the template.

## Constraints

- `CLAUDE.md` / `.ai/guidelines/project.md`:
    - both checks pass;
    - tooling behaviour changes are test-driven (the sweep and the hook);
    - work on a `feature/` branch from `develop`, in a worktree under `.worktrees/` with its own `DB_DATABASE`;
    - never `composer … -q` or `boost:update -q`;
    - never `pkill`/`killall`.
- **Dependencies:** remove what the removed code needed, and restore upstream's. Install the two skills (approved). Add nothing else.
- **gh:** always use `-R Ryanc342/laravel-superpowers`. Wait for the PR's CI before merging.

## Approaches

1. **Strip v2 on top of `develop` (chosen).** Restore upstream's files path by path, delete the template's additions, and keep and trim the tooling. This keeps the tooling and its history as they are, and the result can be checked mechanically: `git diff upstream/main` should show only tooling.
2. **Start again from `upstream/main` and re-add the tooling.** Cleaner history on paper, but it re-solves every tooling problem already solved (test DB lock, hook, CI, Boost wiring) and loses the history that explains them.
3. **Revert v2 back to sp-v1.3.0, then remove v1's UI layer.** Two rounds of the same work. v1 also carried shadcn edits and shared components the template no longer wants.

## Left to the builder

- **How far to simplify the Stop hook** beyond removing the watchdog and SSR parts.
    - Keep the core behaviour in Goal 6 and its tests.
    - Cut a feature only when it no longer serves a case that still exists. Per-worktree baselines, for example, still matter while sessions run in parallel worktrees.
- **Which hunks of shared tooling files are tooling.** This covers `composer.json`, `package.json`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `phpunit.xml` and `.env.example`. The rule: keep a hunk only if a kept check or test needs it.
- **Whether a kept test still tests something real once the removed code is gone** (for example `ViteIsolationTest`, `frontend-imports.php`). Delete it if not.
- **How the simplified sweep detects JavaScript and console errors,** within Pest's browser plugin.
- **The acceptance check.** `git diff upstream/main -- resources components.json app bootstrap config routes database lang` must be empty, apart from the documented exceptions. Exceptions include `config/boost.php` and the chisel markers stripped from restored files. List each exception in the plan.
- **Which Oxlint and Oxfmt settings to drop or keep** so that upstream's UI passes `composer check` unchanged.
- **The exact template-owned path list** for `project.md`, `UPGRADING.md` and the `git restore` pathspec. It must match what the template actually keeps.
