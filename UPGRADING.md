# Upgrading

What to do in a project started from laravel-superpowers after it merges a template version. There is one section per version (`sp-vX.Y.Z` tag), newest first. Do what every section newer than the version you were on lists, oldest first. [`.ai/guidelines/project.md`](.ai/guidelines/project.md) has the rules for the merge itself.

## sp-v3.0.1

Notes only, no change to the tooling. The first syncs to sp-v3.0.0 found three gaps in the notes:

- "Test Runs" in `.ai/guidelines/project.md` says how to sweep pages on another host, such as a tenant's subdomain, and pages behind a role. The file is mixed: take that hunk by hand, as step 4 of the template sync says.
- Step 2 of the sp-v3.0.0 entry also checks `tests/process-watchdog.sh` and `tests/js/test-runner/process-watchdog.test.ts` for changes of the project's own.
- Step 4 of the sp-v3.0.0 entry says that a clean merge also removes what the template removed and the project never edited, so "keep" often means "put back from `HEAD`".

A project on sp-v3.0.0 runs the template sync and has nothing else to do. A project on sp-v1.3.0 does only the sp-v3.0.0 entry, which already has these fixes.

## sp-v3.0.0

The template is a toolkit now: Laravel's React starter kit, unchanged (laravel/react-starter-kit at `50a9f6c`), plus the tooling. It owns no UI code and no UI rules. The tooling is `composer check` and `composer check:browser`, the MySQL test database and its lock, the Stop hook, the project rules that Boost turns into `CLAUDE.md` and `AGENTS.md`, and two agent skills maintained by their vendors, `shadcn` and `web-design-guidelines`, which `skills-lock.json` records. The process watchdog is gone. The page sweep is new to a project on sp-v1.3.0 (step 8).

This entry is for a project on sp-v1.3.0. No project merged sp-v2.0.0, so its steps do not apply: skip that section and do this one.

A template sync now brings in tooling only. Upstream's UI and app changes no longer reach a project through the template: a project that wants one takes it from laravel/react-starter-kit itself. The merge alone would replace or delete the project's UI with the starter kit's, so steps 2 and 3 take the template's tooling and put everything else back. The v1 UI (`resources/js/components/shared`, `.ai/skills/frontend-components`, the edited `resources/js/components/ui/*`, the `app.css` tokens, the v1 UI tests and `tests/js/setup.ts`) stays, and is the project's now.

Steps 1 to 4, 6, 7 and 9 are the "Template sync" steps of [`.ai/guidelines/project.md`](.ai/guidelines/project.md), with the paths of sp-v3.0.0 and sp-v1.3.0 filled in. If `template/main` is newer than sp-v3.0.0, check the lists against `git show MERGE_HEAD:.ai/guidelines/project.md` before you run them.

### The template-owned paths of sp-v1.3.0

sp-v1.3.0's `project.md` has no "The template owns these paths" list. These were its template-owned paths, for step 2 of the template sync:

- `tests/Pest.php`
- `tests/bootstrap.php`
- `tests/TestCase.php`
- `tests/Support/Template/`
- `tests/process-watchdog.sh`
- `tests/js/test-runner/process-watchdog.test.ts`
- `.ai/hooks/check.sh`
- `.codex/hooks.json`

sp-v3.0.0 lists `tests/Pest.php`, `tests/bootstrap.php` and `tests/TestCase.php` as mixed, so they stay mixed, and keep the project's own additions (step 4). The hooks block of `.claude/settings.json`, which sp-v1.3.0 also gave the template, is part of a mixed file.

### 1. Merge

If you already ran `git merge template/main`, as sp-v1.3.0's rules say, start again here. Abort that merge, go back to `develop` and delete that sync branch. Keep no conflict you resolved in it: sp-v1.3.0's rules take `tests/Pest.php` whole, which drops the project's own setup.

```bash
git merge --abort
git switch develop
git branch -D chore/sync-template-<YYYY-MM-DD>
```

Then merge again, fetching only `main` and the `sp-v*` tags. Never pass `--force` when you fetch the template's tags: it would rewrite the project's own tags of the same names.

```bash
git switch develop
git switch -c chore/sync-template-$(date +%F)
git fetch template main 'refs/tags/sp-v*:refs/tags/sp-v*'
git merge --no-ff --no-commit template/main
```

The merge stops with conflicts in files the project changed: UI and app files, tests, `README.md` and `package-lock.json` among them. Leave them: step 3 puts every one of them back.

### 2. Take the template-owned paths

- Check that the project changed none of the files this step takes whole. This prints nothing when it did not:

    ```bash
    git diff --stat sp-v1.3.0 HEAD -- \
        tests/Support/Template/ tests/Browser/PageSweepTest.php tests/Browser/BrowserActionTimeoutTest.php \
        tests/Feature/SweptPagesTest.php tests/Feature/TestDatabaseTest.php tests/Feature/ViteIsolationTest.php \
        tests/Unit/ArchTest.php tests/Unit/AgentGuidanceTest.php tests/Unit/TemplateTestHelpersTest.php \
        tests/js/ai-hooks/ .ai/hooks/check.sh .agents/skills/shadcn/ .agents/skills/web-design-guidelines/ \
        .claude/skills/shadcn .claude/skills/web-design-guidelines .codex/hooks.json .node-version UPGRADING.md \
        tests/process-watchdog.sh tests/js/test-runner/process-watchdog.test.ts
    ```

    A file it lists holds changes of the project's own, which this step drops. Keep a copy (`git show HEAD:<file>`), and move the change into a file of the project's own after this step.

- Restore every template-owned path the template has, and remove the two watchdog files it dropped:

    ```bash
    git restore --source=MERGE_HEAD --staged --worktree -- \
        tests/Support/Template/ tests/Browser/PageSweepTest.php tests/Browser/BrowserActionTimeoutTest.php \
        tests/Feature/SweptPagesTest.php tests/Feature/TestDatabaseTest.php tests/Feature/ViteIsolationTest.php \
        tests/Unit/ArchTest.php tests/Unit/AgentGuidanceTest.php tests/Unit/TemplateTestHelpersTest.php \
        tests/js/ai-hooks/ .ai/hooks/check.sh .agents/skills/shadcn/ .agents/skills/web-design-guidelines/ \
        .claude/skills/shadcn .claude/skills/web-design-guidelines .codex/hooks.json .node-version UPGRADING.md
    git rm -r -q --ignore-unmatch -- tests/process-watchdog.sh tests/js/test-runner/process-watchdog.test.ts
    ```

### 3. Put everything else back

Stage every path the merge left in conflict, markers and all, then put every path but those of step 2 and the mixed files back to the project's version. The restore replaces the staged markers with the project's version, and removes a file the project deleted and the template changed. Run both from the repository root: `git diff` prints paths from the root, and `.` covers the whole tree only there.

```bash
git diff --name-only --diff-filter=U -z | xargs -0 -r git add -A --
git restore --source=HEAD --staged --worktree -- . \
    ':!tests/Support/Template/' ':!tests/Browser/PageSweepTest.php' ':!tests/Browser/BrowserActionTimeoutTest.php' \
    ':!tests/Feature/SweptPagesTest.php' ':!tests/Feature/TestDatabaseTest.php' ':!tests/Feature/ViteIsolationTest.php' \
    ':!tests/Unit/ArchTest.php' ':!tests/Unit/AgentGuidanceTest.php' ':!tests/Unit/TemplateTestHelpersTest.php' \
    ':!tests/js/ai-hooks/' ':!.ai/hooks/check.sh' ':!.agents/skills/shadcn/' ':!.agents/skills/web-design-guidelines/' \
    ':!.claude/skills/shadcn' ':!.claude/skills/web-design-guidelines' ':!.codex/hooks.json' ':!.node-version' \
    ':!UPGRADING.md' ':!tests/process-watchdog.sh' ':!tests/js/test-runner/process-watchdog.test.ts' \
    ':!tests/Pest.php' ':!tests/bootstrap.php' ':!tests/TestCase.php' ':!composer.json' ':!package.json' \
    ':!vite.config.ts' ':!tsconfig.json' ':!.gitignore' ':!phpunit.xml' ':!.env.example' ':!config/boost.php' \
    ':!phpstan.neon' ':!.claude/settings.json' ':!.codex/config.toml' ':!.mcp.json' ':!.github/workflows/check.yml' \
    ':!.ai/guidelines/project.md' ':!skills-lock.json'
```

`git diff --cached --name-status HEAD` must now list only the paths of step 2 and the mixed files: nothing under `resources/`, `app/`, `routes/`, `database/` or `lang/`.

### 4. Merge the mixed files by hand

A mixed file that merged without a conflict already holds every change the template made, the ones a project skips below among them. Where the template removed something the project never edited, the clean merge removed it from the project too. So "keep" below often means "put back from `HEAD`". In the projects merged so far, a clean merge took `vite.config.ts`'s `test` block and its lint `plugins`, `rules` and `overrides`, and `package.json`'s `jsdom`, `@testing-library/react` and `@radix-ui/react-popover`. Check every mixed file, not only the conflicted ones. `git diff --cached HEAD -- <file>` shows what the merge changed in the project's version, and `git diff sp-v1.3.0 MERGE_HEAD -- <file>` shows the template's side alone. Step 3 staged the conflicted ones with their markers. This finds them, and must print nothing when you are done:

```bash
git grep -l '^<<<<<<<' -- \
    tests/Pest.php tests/bootstrap.php tests/TestCase.php composer.json package.json vite.config.ts \
    tsconfig.json .gitignore phpunit.xml .env.example config/boost.php phpstan.neon .claude/settings.json \
    .codex/config.toml .mcp.json .github/workflows/check.yml .ai/guidelines/project.md skills-lock.json
```

- `tests/Pest.php`, `tests/TestCase.php` and `tests/bootstrap.php`: take the template's changes, and keep the project's own `pest()` configuration, `TestCase` methods and bootstrap steps. `TestCase::setUp()` now calls `withoutVite()` for every test, and `tests/Pest.php` gives the browser tests the real Vite back with `withVite()`, in place of its old `withoutVite()` for `Feature`. `tests/bootstrap.php` no longer starts the watchdog.
- `package.json`: take the `build:dev` script and the `packageManager` field, which keeps the shadcn CLI on npm. Keep `jsdom`, `@testing-library/*`, `@radix-ui/react-popover` and every other UI package the project uses: the template removed them only because its own UI and tests no longer use them. `playwright`, the `test` script and `name` came with sp-v1.3.0, so keep the project's.
- `vite.config.ts`:
    - `test`: keep the project's `environment: 'jsdom'` and `setupFiles: ['tests/js/setup.ts']` while its own JS tests need jsdom, and skip the template's `environment: 'node'`. The template's tests in `tests/js/ai-hooks` set `// @vitest-environment node` themselves.
    - `lint`: take the template's lint ignore for the vendor skills. The template dropped its `plugins`, `rules` and `overrides` because it owns no UI: keep them if the project wants them.
    - `fmt.ignorePatterns`: take the new `skills-lock.json` entry. The `.worktrees` watch ignore came with sp-v1.3.0: keep it.
- `composer.json`: take the `check:browser` script, which now builds with `npm run build:dev` so that React's development warnings reach the console and fail the page sweep, and its description. It builds no SSR bundle: sp-v2.0.0's `npx vp build --ssr` is gone.
- `.github/workflows/check.yml`: take the new "Build for production" step.
- `skills-lock.json`: new. Take the template's.
- `.ai/guidelines/project.md`: take the template's text, and keep the project's own sections.
- `.env.example` and `config/boost.php`: the template has not changed them since sp-v1.3.0. Keep the project's, with its own `APP_LOCALE` and, if it has one, its own `skills.exclude`. The template's `config/boost.php` excludes no skill, so Boost's `tailwindcss-development` skill stays. This replaces sp-v2.0.0's advice to keep `skills.exclude`.
- `tsconfig.json`, `.gitignore`, `phpunit.xml`, `phpstan.neon`, `.claude/settings.json`, `.codex/config.toml` and `.mcp.json`: no template change since sp-v1.3.0.

### 5. Keep the helpers the project's tests call

sp-v1.3.0's `tests/Support/Template/browser.php` declared `visitSecurityPage()`, its only helper. sp-v3.0.0's does not, and step 2 replaced the file. The starter kit's browser tests that came with sp-v1.3.0 (`tests/Browser/PasskeysTest.php`, `SettingsTest.php` and `TwoFactorAuthenticationTest.php`) are the project's now, and they call it. The first command below lists the calls, and the second the project's own declaration. When the first prints a line and the second prints none, copy sp-v1.3.0's helper into a file of the project's own:

```bash
git grep -n 'visitSecurityPage' -- tests ':!tests/Support/Template/'
git grep -n 'function visitSecurityPage' -- tests/Support ':!tests/Support/Template/'
git show sp-v1.3.0:tests/Support/Template/browser.php > tests/Support/security-page.php
git add tests/Support/security-page.php
```

Then change the copy's opening comment: the file is the project's.

### 6. Lock files

sp-v3.0.0 changes no Composer constraint and no npm package version that a project keeps. `composer.lock` and `package-lock.json` stay as step 3 put them back, and the lock-file rules need no `composer update` or `npm update`. If step 4 dropped a package from `package.json` (`jsdom`, say, once no test of the project's needs it), run `npm uninstall <package>`.

### 7. Agent guidance

Generate `CLAUDE.md`, `AGENTS.md`, `boost.json` and Boost's skills from the new `project.md`. Never pass `-q`. `git status` must then show no template file rewritten besides those generated ones, and Boost leaves `.claude/skills/shadcn` and `.claude/skills/web-design-guidelines` alone:

```bash
php artisan boost:update
git status --short
```

`.ai/skills/frontend-components` is the project's now. Keep it as the project's own UI notes, or delete it and run `php artisan boost:update` again.

### 8. The page sweep

`tests/Browser/PageSweepTest.php` is new. "Test Runs" in `project.md` says which pages it opens and what fails a page.

A project on sp-v1.3.0 has neither `projectSweptPages()` nor `projectSweptGuestPages()`, so the template's defaults in `tests/Support/Template/browser.php` apply: the starter kit's dashboard, settings and sign-in pages. If the project removed or moved one of those pages, or wants its own pages swept, declare both functions in a `tests/Support/*.php` of its own. Each replaces its default, so it lists the starter-kit pages the project keeps as well as the project's own. Either may return `[]`, and the sweep then skips that list, but not both:

```php
<?php

/**
 * The signed-in pages the page sweep opens.
 *
 * @return array<string, string>
 */
function projectSweptPages(): array
{
    return [
        'dashboard' => '/dashboard',
        'profile settings' => '/settings/profile',
        'security settings' => '/settings/security',
        'appearance settings' => '/settings/appearance',
        'password confirmation' => '/user/confirm-password',
        'the invoices' => '/invoices',
    ];
}

/**
 * The pages the page sweep opens as a guest.
 *
 * @return array<string, string>
 */
function projectSweptGuestPages(): array
{
    return [
        'welcome' => '/',
        'login' => '/login',
        'registration' => '/register',
        'forgot password' => '/forgot-password',
        'password reset' => '/reset-password/a-token?email=taylor%40example.com',
        'the pricing page' => '/pricing',
    ];
}
```

### 9. Check

```bash
composer check
composer check:browser
```

Run both. When both pass, commit the merge and merge the branch into `develop`.

## sp-v2.0.0

The front end is rebuilt on Ant Design 6 (`antd`) and Ant Design Pro (`@ant-design/pro-components`, a pinned beta). shadcn/ui, Radix, Sonner, lucide-react and the template's own `components/shared` and `components/ui` are removed. A page is made of antd and Pro components, which a thin glue in `resources/js/ui/` wires to Laravel and Inertia: lists (`useInertiaTable` with `ListRequest`), forms that the server checks while the user types (`useInertiaForm`), dialogs that become sheets on a phone, flash messages and the appearance. The app's look is `resources/js/theme.ts` and its menu is `resources/js/navigation.ts`. Chinese and English are both built in, and Chinese is the default: every sentence is keyed by its English text (`t()` in React, `__()` in PHP), and the template's Chinese is in `lang/template/zh_CN.json`. Tailwind stays for the welcome page and a project's own marketing pages only. The template also ships an example of every page type under `/examples` (in `local` and `testing` only), a page sweep that renders every page on the server and opens it on a desktop and on a phone, and the `ant-design-ui` skill, which replaces `frontend-components`. No Composer package changes.

This is the largest change the template has made. The merge itself is quick. Porting the project's own pages and sentences is the work: every page that imports a removed component needs a rewrite (step 5). Do the steps in order, on the `chore/sync-template-<YYYY-MM-DD>` branch, after `git merge template/main`.

### 1. Settle the merge conflicts

`git status --short` shows them. `UD` is a file the template deleted and the project changed, `UU` one both changed, `AA` one both added, and `DU` one the project deleted and the template changed.

- Delete what the template deleted. Look at what the project changed in each file first, so that step 5 can carry it over (the project's own version stays in git: `git show HEAD:<file>`). Then delete them all:

    ```bash
    git status --short | awk '$1 == "UD" { print $2 }'
    git diff $(git merge-base HEAD MERGE_HEAD) HEAD -- <file>
    git status --short | awk '$1 == "UD" { print $2 }' | xargs -r git rm --
    ```

    The template deleted 102 files under `resources/js` (the table in step 5 lists each one), 26 tests of them (step 6), `components.json` (shadcn's configuration), and `.ai/skills/frontend-components/SKILL.md` (if the project changed that skill, copy its own notes to `.ai/skills/project-ui/SKILL.md` first, step 7). A file the project added of its own in `components/shared` or `components/ui` is not a conflict and stays: step 5 ports it.

- Take the template's version of every file it owns (the left column of "Who owns which file" in [`.ai/guidelines/project.md`](.ai/guidelines/project.md)), then add the project's own lines back where it had any:

    ```bash
    owned='^(resources/js/(ui|layouts)/|resources/js/(app|ssr)\.tsx$|resources/js/lib/i18n\.ts$|resources/js/pages/(auth|settings|examples)/|resources/js/pages/error\.tsx$|resources/js/components/(auth|settings)/|resources/js/components/(language-switch|user-menu)\.tsx$|resources/js/hooks/use-two-factor-auth\.ts$|app/Http/Controllers/(Examples|Settings)/|app/Http/Controllers/(Locale|NotFound)Controller\.php$|app/Http/Requests/(Examples|Settings)/|app/Http/Requests/(List|LocaleUpdate)Request\.php$|app/Http/Middleware/(EnsureExamplesExist|SetLocale)\.php$|app/Concerns/(DownloadsCsv|GeneratesExampleData)\.php$|app/Enums/Locale\.php$|config/lists\.php$|routes/examples\.php$|lang/(template|en|zh_CN)/|\.ai/skills/ant-design-ui/|tests/Support/Template/|tests/Browser/(PageSweepTest|AuthenticationTest|PasskeysTest|PasswordResetTest|RegistrationTest|SettingsTest|TwoFactorAuthenticationTest)\.php$|tests/Feature/LocaleTest\.php$|tests/js/(components/passkey-errors|components/language-switch|lib/i18n|pages/error|theme-background)\.test\.tsx?$)'
    git diff --name-only --diff-filter=U | grep -E "$owned" | xargs -r git checkout --theirs --
    git diff --name-only --diff-filter=U | grep -E "$owned" | xargs -r git add --
    ```

    A project that needs another look for a template page copies it into a page of its own and points its route at it, as project.md says. Do not keep an edited copy of the template's page in place.

- Keep the project's own `resources/js/theme.ts`, `resources/js/navigation.ts`, `resources/js/components/app-logo.tsx`, `resources/js/pages/dashboard.tsx`, `resources/js/pages/welcome.tsx`, `lang/zh_CN.json` and the five test files for the project's look (step 6) where they conflict:

    ```bash
    kept='^(resources/js/(theme|navigation)\.ts|resources/js/components/app-logo\.tsx|resources/js/pages/(dashboard|welcome)\.tsx|lang/zh_CN\.json|tests/js/(project-theme\.test\.ts|pages/(dashboard|welcome)\.test\.tsx|ssr/project-pages\.test\.tsx)|tests/Browser/ProjectLookTest\.php)$'
    git diff --name-only --diff-filter=U | grep -E "$kept" | xargs -r git checkout --ours --
    git diff --name-only --diff-filter=U | grep -E "$kept" | xargs -r git add --
    ```

    A file of these that the project never changed arrives as the template's new one, with no conflict (the five test files are new in the template, so a conflict means the project already has one of that name). `resources/js/theme.ts` and `resources/js/navigation.ts` are new in the template: a project without them gets the template's defaults, and step 5 puts the project's own look and menu in them. A project that already had files of those names keeps them and gives them the template's shape: `theme.ts` has a default export of a `ProjectTheme` (`resources/js/ui/theme.ts`), and `navigation.ts` exports `appMenu: MenuItem[]`.

    `resources/js/components/app-logo.tsx` is the project's now, and the template leaves it alone after this version. The template's is only the mark, filled with the theme's primary colour (a `size` prop), with no name beside it; the layouts render it next to the app's name and above the sign-in card. Give the project's own the same shape: its own logo `<svg>`, and no import of the old `app-logo-icon.tsx`, which is gone (step 5's grep finds it).

- Merge both sides by hand, keeping what the project added and what the template changed:
    - `config/boost.php`: the template adds its `skills.exclude` option, new in this version: `'skills' => ['exclude' => ['tailwindcss-development']]`, so Boost never generates its Tailwind skill, which would steer agents to Tailwind for every page. Keep it, and the project's other options.
    - `routes/web.php`: the template adds `Route::put('locale', [LocaleController::class, 'update'])->name('locale.update')`, the `require __DIR__.'/examples.php'` block for `EnsureExamplesExist::ENVIRONMENTS`, and `Route::fallback(NotFoundController::class)` as the last route. Keep the project's routes above the fallback.
    - `app/Http/Middleware/HandleInertiaRequests.php` (the shared props): the template adds `locale`, `locales`, `translations`, `features` and `examples`, with the private `exampleMenu()`, and removes `perPageOptions`. Keep `sidebarOpen` and the project's own shared props.
    - `bootstrap/app.php`: the template adds `SetLocale` to the web middleware, `locale` to the cookies that are not encrypted, and the error pages (`Inertia::handleExceptionsUsing(...)`). Keep the project's own middleware and exception handling.
    - `app/Models/User.php`: the template adds `HasLocalePreference` with `preferredLocale()`, `locale` in `#[Fillable]` and the `@property` list, and `hasVerifiedEmail()`.
    - `app/Providers/AppServiceProvider.php`: the template adds `configureTranslations()` (`Lang::addJsonPath(lang_path('template'))`), `configureRateLimiting()` (the `password-update` and `account-deletion` limiters) and skips `uncompromised()` on a Precognition check.
    - `app/Providers/FortifyServiceProvider.php`, and `routes/settings.php`: take the template's, unless the project copied a settings or sign-in page to change it. Then keep the project's own view callback or route, and give its page the props it reads: the template's login page no longer receives `canResetPassword` (it reads `features.resetPasswords`), the profile and password routes now run `HandlePrecognitiveRequests`, and deleting the account is limited to six tries a minute (`throttle:account-deletion`).
    - `config/app.php`: `locale` now defaults to `zh_CN`.
    - `resources/js/types/*`: `global.d.ts` has the new shared props (`locale`, `locales`, `translations`, `features`, `examples`) and no `perPageOptions`; `navigation.ts` has `MenuItem` and `SharedMenuItem` and no `NavItem` or `BreadcrumbItem`; `vite-env.d.ts` declares `__EXAMPLES__`; `index.ts` no longer exports `resource` and `ui` (their files are deleted). Keep the project's own types.
    - `resources/css/app.css`: take the template's and add the project's own rules back. `@layer theme, base, antd, components, utilities;` stays the first line of the file. See "Marketing pages" in step 5 for what the file no longer defines.
    - `resources/views/app.blade.php`: take the template's, which paints antd's page background (`#f5f5f5`, and `#000000` in dark) before the stylesheet loads, and add the project's own additions back. The two colours follow the page background of `theme.ts` (`colorBgLayout`): when the project's theme changes it, change them in the view. `tests/js/theme-background.test.ts` fails until they match; it is the one template-owned test that a project's change makes fail on purpose, and the fix is in the view, not the test.
    - `vite.config.ts`: the template adds the `antdStyles()` plugin, `define: { __EXAMPLES__ }`, `ssr.noExternal` (Pro, `@rc-component/resize-observer` and `@rc-component/util`: without them the SSR server fails on every page with a `PageContainer`), the test option `server.deps.external`, and leaves out the lint exceptions for the starter kit's pages, the `components/ui/*` ignore patterns and `sortTailwindcss.functions`. Keep the project's own plugins and options.
    - `composer.json`: the template changes only the `check:browser` script, which builds in development mode (`npm run build:dev`), then the SSR bundle the page sweep renders through (`npx vp build --ssr`). Take the template's script and keep the project's own. `package.json`: step 2.
    - `phpunit.xml`: keep the template's `<env name="APP_LOCALE" value="en"/>`: the tests run in English.
    - `tests/js/setup.ts`, and `tests/Feature/Http/Middleware/HandleInertiaRequestsTest.php`: step 6.
    - `.env.example` (`APP_LOCALE=zh_CN`), and `.github/workflows/check.yml` (a "Build for production" step that fails when a production build holds example pages or writes no manifest).
    - `.ai/guidelines/project.md`: take the template's new text (the ownership table, the page sweep, the front-end rules for upstream merges) and keep the project's own rules.

- Do not merge `CLAUDE.md`, `AGENTS.md`, `boost.json`, `.claude/skills` and `.agents/skills` by hand. Take either side: step 7 generates them again.
- `composer.lock` needs nothing: this version changes no Composer package.
- A `DU` file the template owns (a registration page the project deleted, say) comes back with `git add <file>`. Step 8 says how to turn the feature off the right way.
- When nothing is left, `git diff --name-only --diff-filter=U` prints nothing and `grep -rn '^<<<<<<<' --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=.git .` finds no marker.

### 2. Install the packages

This version adds five npm packages and removes twenty-one. Your lock already pins every other package; keep it that way.

- Restore the project's own `package-lock.json`, whether or not it conflicted, then make `package.json` match the template's. These commands make exactly the template's changes and do nothing to what is already right:

    ```bash
    git checkout HEAD -- package-lock.json
    npm pkg set 'scripts.build:dev=NODE_ENV=development vp build' \
        'dependencies.@ant-design/cssinjs=~2.1.2' \
        'dependencies.@ant-design/icons=^6.3.4' \
        'dependencies.@ant-design/pro-components=3.1.15-9' \
        'dependencies.antd=^6.7.2' \
        'dependencies.dayjs=^1.11.11'
    npm pkg delete \
        dependencies.@radix-ui/react-avatar dependencies.@radix-ui/react-checkbox \
        dependencies.@radix-ui/react-collapsible dependencies.@radix-ui/react-dialog \
        dependencies.@radix-ui/react-dropdown-menu dependencies.@radix-ui/react-label \
        dependencies.@radix-ui/react-navigation-menu dependencies.@radix-ui/react-popover \
        dependencies.@radix-ui/react-select dependencies.@radix-ui/react-separator \
        dependencies.@radix-ui/react-slot dependencies.@radix-ui/react-toggle \
        dependencies.@radix-ui/react-toggle-group dependencies.@radix-ui/react-tooltip \
        dependencies.class-variance-authority dependencies.clsx dependencies.input-otp \
        dependencies.lucide-react dependencies.sonner dependencies.tailwind-merge \
        dependencies.tw-animate-css
    ```

    `@ant-design/pro-components` is a pinned beta: write it with no `^` or `~`. If `package.json` still holds conflict markers, resolve them first: `npm pkg` cannot read the file.

- Install with a plain `npm install`. It adds the five packages and removes the ones `package.json` no longer lists, and it moves nothing that is already locked. The merge rules' `npm update <packages>` is for packages the template changed; these are new. Never run a bare `npm update`, and never add `--force` or `--legacy-peer-deps`:

    ```bash
    npm install
    ```

    If npm stops with `ERESOLVE`, do not force it: read which package of the project's own conflicts and report it.

- Check that nothing else moved. This prints nothing when the lock kept every version it had; `npm ci --dry-run` fails when `package.json` and the lock disagree:

    ```bash
    git show HEAD:package-lock.json | node -e '
    const fs = require("fs");
    const before = JSON.parse(fs.readFileSync(0, "utf8")).packages;
    const after = JSON.parse(fs.readFileSync("package-lock.json", "utf8")).packages;
    for (const [key, entry] of Object.entries(before)) {
        if (key && after[key] && after[key].version !== entry.version) {
            console.log(`${key}: ${entry.version} -> ${after[key].version}`);
        }
    }
    '
    npm ci --dry-run
    ```

    Each line the script prints is a package npm moved. Accept one only when a new package's range requires it (`npm explain <package>` shows which package asks for the new version). Otherwise run `git checkout HEAD -- package-lock.json`, do this step again from the start, and report the package if it moves again.

- A package the project's own marketing pages still need (`lucide-react`, `clsx`, `tailwind-merge`) is the project's own dependency now. Add it back with `npm install <package>@<its old range>` (the range is in `git show HEAD:package.json`), after step 5 shows that it is still imported: `npm install` resolves only that package.

### 3. Language setting and database

- `.env.example` now says `APP_LOCALE=zh_CN`, but an existing `.env` keeps its own value, in every environment. A `.env` with no `APP_LOCALE` line follows `config/app.php`, which now defaults to `zh_CN`. Choose on purpose: `APP_LOCALE=zh_CN` where the project wants Chinese by default, `APP_LOCALE=en` where it wants English. The browser's language is never consulted. `phpunit.xml` sets `APP_LOCALE=en`, so the tests run in English whatever `.env` says, and a test of Chinese switches the language itself.
- `users.locale` (a nullable string) holds the language a signed-in user chose. Run:

    ```bash
    php artisan migrate
    ```

    If the project's `users` table already has a `locale` column of its own, delete the template's `database/migrations/2026_11_26_084048_add_locale_to_users_table.php` instead of running it. The column must be nullable, with null meaning no choice yet: `Locale::resolve()` takes any saved value as the user's choice, ahead of the `locale` cookie.

### 4. Move the project's own language code to the template's

If the project wrote its own `Locale`, language middleware or switch, or its own `t()`, keep the template's. The template's pieces are `App\Enums\Locale` (`zh_CN` and `en`), `SetLocale` (the user's saved choice, then the `locale` cookie, then `config('app.locale')`), `PUT /locale`, `users.locale`, `resources/js/lib/i18n.ts` (`t()`, `tChoice()`, `msg()`) and `components/language-switch.tsx`.

- Step 1 has already taken the template's version of any file with the same name. Delete the project's other copies, with their routes, middleware registrations, shared props and imports, and point every import at `@/lib/i18n`. A sentence is its own key: `t('Hello, :name', { name })`, `tChoice('one task|:count tasks', count)`; text that is translated where it is shown (menu labels, a layout's props) is written with `msg('…')`. The `ant-design-ui` skill has the rules.
- The project's own sentences stay in `lang/zh_CN.json`, which the project owns and which wins over the template's on the same key. Drop the entries that repeat the template's. This removes the entries with the same Chinese and prints the ones where the project's Chinese differs (those stay, and win, so change them to the template's wording unless the project wants its own):

    ```bash
    node -e '
    const fs = require("fs");
    const template = JSON.parse(fs.readFileSync("lang/template/zh_CN.json", "utf8"));
    const project = JSON.parse(fs.readFileSync("lang/zh_CN.json", "utf8"));
    for (const [sentence, chinese] of Object.entries(project)) {
        if (template[sentence] === chinese) {
            delete project[sentence];
        } else if (sentence in template) {
            console.log(`${sentence}: yours "${chinese}", template "${template[sentence]}"`);
        }
    }
    fs.writeFileSync("lang/zh_CN.json", JSON.stringify(project, null, 4) + "\n");
    '
    ```

- A key that is not an English sentence (`nav.dashboard`) is not read by `t()`: re-key it by the English text.
- Every literal sentence the code shows needs Chinese, or `composer check` fails: `t()`, `tChoice()` and `msg()` in `resources/js`, and `__()`, `trans()` and `trans_choice()` in `app`, `routes` and `resources/views`. List the missing ones with their files, then add each to `lang/zh_CN.json`:

    ```bash
    php artisan test --compact --filter=TranslationsTest
    ```

### 5. Port the project's own front end

Find every file that still imports something removed. This prints nothing when the port is done; `npm run types:check` finds the rest (the types `NavItem`, `BreadcrumbItem`, `ResourceCollection`, `AppLayoutProps`, `AuthLayoutProps`, `AppVariant` and `FlashToast`, which `@/types` no longer exports):

```bash
grep -rnE "'(@/(components/(shared|ui)|layouts/(app|auth|settings))/|(@radix-ui/|class-variance-authority|clsx|tailwind-merge|tw-animate-css|sonner|lucide-react|input-otp)|@/(components/(alert-error|app-content|app-header|app-logo-icon|app-shell|app-sidebar-header|app-sidebar|appearance-tabs|breadcrumbs|delete-user|heading|input-error|manage-passkeys|manage-two-factor|nav-footer|nav-main|nav-user|passkey-item|passkey-register|passkey-verify|text-link|two-factor-recovery-codes|two-factor-setup-modal|user-info|user-menu-content)|hooks/(use-appearance|use-clipboard|use-current-url|use-flash-toast|use-initials|use-mobile-navigation|use-mobile|use-network-error-toast|use-validation-error-toasts)|lib/(pagination|utils)|types/(resource|ui))')" resources/js tests/js
```

Rewrite each page and component the grep names. Build it as the `ant-design-ui` skill says, starting from the example of its page type (`/examples/...`, or its file in `resources/js/pages/examples/`), and use the table below to find what replaced each removed file.

- A page's layouts come from its name (`ui/page-shell.tsx`): `auth/*` sits in the sign-in card, `settings/*` in the app layout and the settings layout, `welcome` and `error` in the root layout only, and every other page in the app layout. A page of the project's own that is public (no sign-in, no app menu) sets `Page.layout = RootLayout`, imported from `@/layouts/root-layout`, so that antd has its theme and language. Without it, the app layout reads the user and crashes for a guest (`TypeError … 'avatar'`).
- A list page spreads `useInertiaTable`'s props onto `ProTable` (`{...table}`), its search form's settings among them (`table.search`). A page that changes them writes `search={{ ...table.search, … }}` after the spread, as the `ant-design-ui` skill says: a `search` of its own without them would fail the hydration of the server's page.
- The server renders the computer's layout, as it cannot see the screen. A project page that changes its layout with `Grid.useBreakpoint()` jumps once it hydrates. Render it the same on every screen, or lay out a phone in CSS, as `resources/js/ui/responsive.css` does for the template's side menu and settings menu.
- Each signed-in page has one h1, its title (`PageTitle` inside `PageContainer`'s `title`). `<Head title={t('…')} />` stays.
- The look: the colours the project set in `app.css` (`--primary` and the rest of the shadcn palette) become antd tokens in `resources/js/theme.ts`, such as `token.colorPrimary`; `layout` there puts the menu on the side, at the top or both. The brand colour and font are pinned in `tests/js/project-theme.test.ts`, which the project owns (step 6): change them there too. The page background is repeated in `resources/views/app.blade.php`; `tests/js/theme-background.test.ts` fails when a change in `theme.ts` makes them differ.
- The menu: the entries the project added to `mainNavItems` in the old `components/app-sidebar.tsx` go into `appMenu` in `resources/js/navigation.ts`.
- The project's `dashboard.tsx` keeps its own content; port its imports. Its `Page.layout = { breadcrumbs: [] }` is gone. Change `welcome.tsx` and `dashboard.tsx` together with their tests, which the project owns (step 6).

Paths in the table are under `resources/js/`. The last column of a row says where the removed code's job went; "no replacement needed" says why none is.

#### Layout and menu

| Removed                                                                                                                                                  | Use instead                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/app-shell.tsx`, `components/app-content.tsx`, `components/app-sidebar.tsx`, `components/app-header.tsx`, `components/app-sidebar-header.tsx` | `layouts/app-layout.tsx`, one layout on Pro's `ProLayout`. Where the menu sits (side, top or both) is `layout` in `theme.ts`.                                                                                                                                                |
| `layouts/app/app-sidebar-layout.tsx`, `layouts/app/app-header-layout.tsx`                                                                                | `layouts/app-layout.tsx`. A page no longer sets `Page.layout = { breadcrumbs }`: breadcrumbs are `PageContainer`'s `breadcrumb`, as the `components/breadcrumbs.tsx` row says.                                                                                               |
| `components/nav-main.tsx`, `components/nav-footer.tsx`                                                                                                   | `appMenu` in `navigation.ts`. Move the project's own `mainNavItems` there as `MenuItem`s (`key`, `label` marked with `msg()`, `href` from `route.url()`, `icon` from `@ant-design/icons`). The starter kit's footer links have no place: add them to `appMenu` or drop them. |
| `components/nav-user.tsx`, `components/user-info.tsx`, `components/user-menu-content.tsx`                                                                | `components/user-menu.tsx`: antd `Dropdown` and `Avatar`. The trigger's `data-test` is `user-menu-button` (it was `sidebar-menu-button`); `logout-button` is unchanged.                                                                                                      |
| `components/breadcrumbs.tsx`, `components/ui/breadcrumb.tsx`                                                                                             | `PageContainer`'s `breadcrumb={{ items: [{ title }] }}`, as in `pages/examples/orders/show.tsx`.                                                                                                                                                                             |
| `layouts/auth/auth-simple-layout.tsx`, `layouts/auth/auth-card-layout.tsx`, `layouts/auth/auth-split-layout.tsx`                                         | `layouts/auth-layout.tsx`, one card in the middle of the screen. A page sets `Page.layout = { title: msg('…'), description: msg('…') }`, as `pages/auth/login.tsx` does.                                                                                                     |
| `layouts/settings/layout.tsx`                                                                                                                            | `layouts/settings-layout.tsx`.                                                                                                                                                                                                                                               |
| `components/app-logo-icon.tsx`                                                                                                                           | Gone: the mark is in `components/app-logo.tsx` (an `<svg>` filled with the theme's primary colour). Put the project's own `<path>` there.                                                                                                                                    |
| `components/ui/sidebar.tsx`                                                                                                                              | `ProLayout`'s own menu, in `layouts/app-layout.tsx`.                                                                                                                                                                                                                         |
| `components/ui/navigation-menu.tsx`                                                                                                                      | antd `Menu` (`layouts/settings-layout.tsx`) or `ProLayout`'s menu.                                                                                                                                                                                                           |
| `components/ui/sheet.tsx`                                                                                                                                | antd `Drawer`. A form or short dialog that is a sheet on phones: `ResponsiveModal` (`ui/dialog.tsx`).                                                                                                                                                                        |
| `components/ui/collapsible.tsx`                                                                                                                          | antd `Collapse`.                                                                                                                                                                                                                                                             |

#### Page structure

| Removed                                 | Use instead                                                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/heading.tsx`                | The page's one h1: `PageContainer title={<PageTitle>{title}</PageTitle>}` (`ui/page-title.tsx`). A part's smaller heading: `ProCard title={…} headerBordered`, as in `components/settings/password-form.tsx`. |
| `components/shared/page-header.tsx`     | `PageContainer` with `title={<PageTitle>…</PageTitle>}` and the page's buttons in `extra={[…]}`.                                                                                                              |
| `components/shared/section.tsx`         | `ProCard title={…} headerBordered`.                                                                                                                                                                           |
| `components/ui/card.tsx`                | `ProCard`, or antd `Card`.                                                                                                                                                                                    |
| `components/ui/separator.tsx`           | antd `Divider`.                                                                                                                                                                                               |
| `components/shared/labeled-divider.tsx` | `Divider plain` with its text, as in `components/auth/passkey-sign-in.tsx`.                                                                                                                                   |
| `components/shared/dashboard-grid.tsx`  | `Row` and `Col` holding `StatisticCard`s, as in `pages/dashboard.tsx` and `pages/examples/dashboard.tsx`. Not `StatisticCard.Group`: it decides its columns in JavaScript.                                    |
| `components/ui/placeholder-pattern.tsx` | No replacement needed: it only filled the starter kit's placeholder dashboard, which `pages/dashboard.tsx` replaces.                                                                                          |
| `components/shared/quick-links.tsx`     | A `Flex` of Inertia `Link`s with `as={Typography.Link}` and an icon, as in `pages/auth/login.tsx`.                                                                                                            |

#### Home and marketing pages

| Removed                                                                                                  | Use instead                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/shared/hero.tsx`, `components/shared/feature-grid.tsx`, `components/shared/closing-call.tsx` | No shared replacement. `pages/welcome.tsx` builds the same blocks in a Tailwind layout out of antd `Typography`, `Card`, `Flex`, `Space` and `Button` (a link as a button: `<Link as={Button} href={…}>`). Copy its structure into the project's own page. |
| `components/shared/public-header.tsx`, `components/shared/public-footer.tsx`                             | No shared replacement: `pages/welcome.tsx` has its own header, with `components/language-switch.tsx`. A project's public page sets `Page.layout = RootLayout` (`layouts/root-layout.tsx`) so that antd has its theme and language.                         |

#### Forms and fields

| Removed                                                                                  | Use instead                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/shared/stacked-form.tsx`                                                     | antd `Form` or Pro's `ProForm`, with `useInertiaForm` (`ui/form.ts`): `<Form {...formProps}>`. Labels sit above the fields and the buttons under them, on the left, as in `components/settings/password-form.tsx`. |
| `components/shared/text-field.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx` | `Form.Item` (its `label` and `name`) with `Input`, or Pro's `ProFormText`. The server's error for the field shows under it by itself. Mark a required field with `required` on the `Form.Item`.                    |
| `components/shared/password-field.tsx`                                                   | `Input.Password` inside a `Form.Item`, as in `pages/auth/login.tsx`, or `ProFormText.Password`.                                                                                                                    |
| `components/shared/select-field.tsx`, `components/ui/select.tsx`                         | `Select` inside a `Form.Item`, or `ProFormSelect`, as in `pages/examples/queue.tsx`.                                                                                                                               |
| `components/shared/checkbox-field.tsx`, `components/ui/checkbox.tsx`                     | `Checkbox` inside a `Form.Item` with `valuePropName="checked"`, as "Remember me" in `pages/auth/login.tsx`.                                                                                                        |
| `components/shared/form-field.tsx`                                                       | No replacement needed: it held the classes of the floating label. antd's labels sit above the field.                                                                                                               |
| `components/ui/input-otp.tsx`                                                            | `Input.OTP`, as in `components/settings/two-factor.tsx`.                                                                                                                                                           |
| `components/shared/submit-button.tsx`                                                    | `Button type="primary" htmlType="submit" loading={processing}`, with `processing` from `useInertiaForm`.                                                                                                           |
| `components/shared/actions.tsx`                                                          | A `Flex` or `Space` of `Button`s under the form. In a dialog, the dialog's own buttons (`okText`, `cancelText` on `ResponsiveModal` or `ResponsiveModalForm`).                                                     |
| `components/input-error.tsx`                                                             | No replacement needed: `useInertiaForm` shows each server error under its field. An error that belongs to no field is in `unplacedErrors`: show it in an `Alert type="error"`.                                     |
| `components/alert-error.tsx`                                                             | `Alert type="error"` with `unplacedErrors`; the sign-in pages use `components/auth/form-alerts.tsx`.                                                                                                               |
| `components/shared/status-message.tsx`                                                   | `Alert type="success"`, which `components/auth/form-alerts.tsx` shows for the server's status message.                                                                                                             |
| `hooks/use-validation-error-toasts.ts`                                                   | No replacement needed: errors show under their fields, never as toasts.                                                                                                                                            |

#### Dialogs, confirmations and menus

| Removed                                                                        | Use instead                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/shared/responsive-dialog.tsx`, `components/ui/dialog.tsx`          | `ResponsiveModal` and `ResponsiveModalForm` (`ui/dialog.tsx`): a modal on a computer, a sheet from the bottom on a phone. The body and footer parts are gone: the buttons are the modal's `okText` and `cancelText`. |
| `components/shared/confirm-dialog.tsx`, `components/shared/confirm-button.tsx` | antd `Popconfirm` before an action that cannot be undone, as in `pages/examples/orders/show.tsx`. A high-risk action asks for the password in a `ResponsiveModal`, as in `components/settings/delete-account.tsx`.   |
| `components/delete-user.tsx`                                                   | `components/settings/delete-account.tsx`.                                                                                                                                                                            |
| `components/ui/popover.tsx`                                                    | antd `Popover`.                                                                                                                                                                                                      |
| `components/ui/dropdown-menu.tsx`                                              | antd `Dropdown`, as in `components/user-menu.tsx`.                                                                                                                                                                   |
| `components/ui/tooltip.tsx`                                                    | antd `Tooltip`.                                                                                                                                                                                                      |
| `components/shared/icon-button.tsx`                                            | `Button type="text"` with an `icon` from `@ant-design/icons` and an `aria-label`, in a `Tooltip` when it needs one.                                                                                                  |
| `components/ui/icon.tsx`                                                       | No replacement needed: icons are `@ant-design/icons` components used directly, as in `navigation.ts`. lucide-react is gone.                                                                                          |

#### Lists, empty and loading states

| Removed                                                                   | Use instead                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/shared/pagination.tsx`, `lib/pagination.ts`                   | `useInertiaTable` (`ui/list.ts`) with a `ListRequest` subclass on the server (`pages/examples/orders/index.tsx`). `ProTable` pages, sorts and filters through the URL. `withPerPage` has no replacement: the page-size menu is part of the table. |
| `types/resource.ts`                                                       | `ListProps` (`ui/list.ts`), which the controller fills with `ListRequest::toProps()`. The `ResourceCollection` shape is gone.                                                                                                                     |
| `components/shared/empty-state.tsx`                                       | antd `Empty`: one line and the action for a first empty list, one sentence for a search with no results, as in `pages/examples/orders/index.tsx`.                                                                                                 |
| `components/shared/loading-state.tsx`                                     | antd `Skeleton`, or `ProTable`'s own `loading`.                                                                                                                                                                                                   |
| `components/shared/error-state.tsx`, `components/shared/region-state.tsx` | antd `Result` or `Alert type="error"` for a region that failed, `Empty` for no rows, `Skeleton` while loading.                                                                                                                                    |
| `components/shared/feed-list.tsx`, `components/shared/feed-row.tsx`       | antd `Listy` with Inertia's `InfiniteScroll` (`pages/examples/dashboard.tsx`), or `Timeline` (`pages/examples/orders/show.tsx`).                                                                                                                  |
| `components/shared/error-content.tsx`                                     | `pages/error.tsx` (antd `Result`), which the server renders for 403, 404, 419, 429, 500 and 503 (`bootstrap/app.php`). A page no longer renders it.                                                                                               |

#### Display

| Removed                                                      | Use instead                                                                                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/alert.tsx`                                    | antd `Alert`.                                                                                                                                                     |
| `components/ui/avatar.tsx`                                   | antd `Avatar`, as in `components/user-menu.tsx`.                                                                                                                  |
| `hooks/use-initials.tsx`                                     | No replacement needed: `Avatar` shows the user's picture or an icon. For initials, give `Avatar` the text as its children.                                        |
| `components/ui/badge.tsx`                                    | antd `Tag` in antd's preset status colours (`statusTag` in `pages/examples/orders/order.ts`), or `Badge`.                                                         |
| `components/ui/button.tsx`                                   | antd `Button`: `type` is `primary`, `default`, `dashed`, `text` or `link`; add `danger` for a destructive one. A link as a button: `<Link as={Button} href={…}>`. |
| `components/ui/skeleton.tsx`                                 | antd `Skeleton`.                                                                                                                                                  |
| `components/ui/spinner.tsx`                                  | antd `Spin`, or a `Button`'s `loading`.                                                                                                                           |
| `components/ui/toggle.tsx`, `components/ui/toggle-group.tsx` | antd `Segmented`, as in `pages/settings/appearance.tsx`, or `Radio.Group` or `Switch`.                                                                            |
| `components/text-link.tsx`                                   | `<Link as={Typography.Link} href={…}>` with Inertia's `Link`, as in `pages/auth/login.tsx`.                                                                       |

#### Feedback

| Removed                            | Use instead                                                                                                                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/sonner.tsx`         | `ui/feedback.ts`: a toast the controller flashes shows as an antd `message`, and a network failure as a `notification`. In a page, take `message`, `notification` and `modal` from `App.useApp()`. |
| `hooks/use-flash-toast.ts`         | `useFlashFeedback()` in `ui/feedback.ts`. The root layout mounts it: nothing to call.                                                                                                              |
| `hooks/use-network-error-toast.ts` | `useNetworkErrorFeedback()` in `ui/feedback.ts`, mounted by the root layout too.                                                                                                                   |

#### Account and security

| Removed                                                                                                                 | Use instead                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/appearance-tabs.tsx`                                                                                        | `pages/settings/appearance.tsx`: an antd `Segmented` over `useAppearance` (`ui/appearance.ts`).                                                                                                                                                                                                                                       |
| `hooks/use-appearance.tsx`                                                                                              | `useAppearance()` from `ui/appearance.ts`. It returns `{ appearance, resolved, setAppearance }` where the old hook returned `{ appearance, resolvedAppearance, updateAppearance }`. The choice lives in the `appearance` cookie only: the old `localStorage` key is no longer read or written, and nothing calls `initializeTheme()`. |
| `components/manage-passkeys.tsx`, `components/passkey-item.tsx`, `components/passkey-register.tsx`                      | `components/settings/passkeys.tsx`.                                                                                                                                                                                                                                                                                                   |
| `components/passkey-verify.tsx`                                                                                         | `components/auth/passkey-sign-in.tsx`.                                                                                                                                                                                                                                                                                                |
| `components/manage-two-factor.tsx`, `components/two-factor-setup-modal.tsx`, `components/two-factor-recovery-codes.tsx` | `components/settings/two-factor.tsx` (`hooks/use-two-factor-auth.ts` stays).                                                                                                                                                                                                                                                          |
| `hooks/use-clipboard.ts`                                                                                                | `copyable` on antd's `Typography.Text` or `Typography.Paragraph`, as in `components/settings/two-factor.tsx`.                                                                                                                                                                                                                         |

#### Browser and URL helpers

| Removed                          | Use instead                                                                                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hooks/use-mobile.tsx`           | `Grid.useBreakpoint()` from antd: `md === false` is a phone (`layouts/app-layout.tsx`).                                                                                                                                                |
| `hooks/use-mobile-navigation.ts` | No replacement needed: it removed the `pointer-events` style that Radix's dialogs leave on `<body>`, and antd's overlays leave none.                                                                                                   |
| `hooks/use-current-url.ts`       | No replacement needed: the menus follow the URL themselves (`layouts/app-layout.tsx`). Elsewhere, `usePage().url`, which holds the query string too, where the old hook compared only the path: compare `usePage().url.split('?')[0]`. |
| `lib/utils.ts`                   | `cn()`: no replacement needed in an app page, which uses no Tailwind classes. A marketing page that still wants it adds `clsx` and `tailwind-merge` back and writes its own `cn`. `toUrl()`: a Wayfinder route's `.url()`.             |

#### Types

| Removed       | Use instead                                                                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types/ui.ts` | `AppLayoutProps`, `AppVariant` and `AuthLayoutProps`: no replacement needed, the layouts take `children`, and the auth layout takes `title` and `description`. `FlashToast`: no type needed, the server flashes `{ type, message }` and `ui/feedback.ts` shows it. |

`types/navigation.ts` stays, with other types: `NavItem` is now `MenuItem` (`label` where `title` was, `href` a path string, `icon` an element), and `BreadcrumbItem` is `PageContainer`'s `breadcrumb`.

**Marketing pages.** Tailwind stays, for `welcome.tsx` and the project's own home and product pages, and they may use antd components in a Tailwind layout. `resources/css/app.css` no longer defines the shadcn palette (`--background`, `--primary`, `--sidebar` and the rest, light and dark), so the Tailwind classes built on it do nothing: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-primary`, `text-primary-foreground`, `border-border`, `ring-ring`, `text-destructive`, `bg-sidebar` and their kin. `text-display`, `text-display-lg`, the `field-empty:` variant and `tw-animate-css`'s classes (`animate-in`, `fade-in` and the like) are gone too. Find them, and use Tailwind's own colours (`bg-white dark:bg-neutral-950`) or an antd component that follows the theme:

```bash
grep -rnE '(^|[^[:alnum:]_-])((bg|text|border|ring|fill|stroke|divide|outline|decoration|from|via|to)-(background|foreground|card|popover|primary|secondary|muted|accent|destructive|success|warning|input|ring|sidebar|chart)|text-display|field-empty|animate-(in|out)|(fade|zoom)-(in|out)|slide-(in|out))' resources/js resources/views
```

### 6. Tests

- The template deleted the tests of the code it removed: `tests/js/components/shared/*` (14 files), `tests/js/components/ui/button.test.tsx`, `tests/js/components/breadcrumbs.test.tsx`, `tests/js/hooks/use-flash-toast.test.tsx`, `use-network-error-toast.test.tsx` and `use-validation-error-toasts.test.tsx`, `tests/js/lib/pagination.test.ts`, `tests/js/lib/utils.test.ts`, and `tests/js/cursor.test.ts`, `display-size.test.ts`, `field-focus.test.ts` and `press-states.test.ts`, and `tests/js/pages/top-level-pages.test.tsx`, which is now `tests/js/pages/error.test.tsx` (the template's tests of its error page; git may show the change as a rename, and the `owned` command of step 1 takes the template's file either way). Delete them here too (step 1 does, unless the project changed one). That removes the tests with their code, not coverage of anything that stays. Rewrite the project's own tests of its own components as you port them. If the project's own tests were in `top-level-pages.test.tsx` (of its dashboard, say), move them to the files for the project's look below: `git show HEAD:tests/js/pages/top-level-pages.test.tsx` has them.
- Browser tests find elements by `data-test`. `sidebar-menu-button` is now `user-menu-button`. These stay: `login-button`, `logout-button`, `register-user-button`, `email-password-reset-link-button`, `reset-password-button`, `confirm-password-button`, `update-profile-button`, `update-password-button` and `delete-user-button`. A test that looked for the old DOM (shadcn classes, `data-sidebar`, a floating label) needs the new one.
- Merge by hand: `tests/js/setup.ts` (the template adds stubs for `ResizeObserver` and `matchMedia`, which antd needs in jsdom), and `tests/Feature/Http/Middleware/HandleInertiaRequestsTest.php` (the template's tests check that `perPageOptions` is no longer shared, and that `sidebarOpen` follows the `sidebar_state` cookie). Keep the project's own tests.
- The project owns the tests of its own look, and the template owns every other test, which holds for any look. The template ships five files for the project's look and leaves them alone afterwards: `tests/js/project-theme.test.ts` (the brand colour and the font in `theme.ts`), `tests/js/pages/dashboard.test.tsx` and `tests/js/pages/welcome.test.tsx` (the two pages), `tests/js/ssr/project-pages.test.tsx` (the two pages rendered on the server, and the dashboard's entry in the menu) and `tests/Browser/ProjectLookTest.php` (the dashboard's heading, its menu entry, and the home page's links). They hold the template's own `#155dfc`, dashboard, welcome page and menu: edit them when you port the pages, set the colour and change `navigation.ts`.
- Do not edit a template-owned test to make it pass for the project's own colour, menu, layout, dashboard or welcome page. None of them names those. They open the template's own pages (the profile settings, the examples); `tests/js/ssr/render.test.tsx`, `tests/js/layouts/root-layout.test.tsx` and `tests/js/layouts/app-layout.test.tsx` give the layouts the template's own theme and menu; `tests/Browser/LayoutTest.php` checks that the theme's primary colour reaches the menu, whatever it is, and skips its side-menu tests when `theme.ts` puts the menu at the top (`layout: 'top'`). One that fails after you port your pages is a template bug: report it, and leave the file as the template has it.
- The page sweep (`tests/Browser/PageSweepTest.php`, template-owned) renders every page on the server, as production does, and opens it on a desktop and a phone: the signed-in pages, and the pages a guest opens (the sign-in pages, the home page, a 404). It fails when the server could not render a page or rendered a Pro field as "…", when React's hydration found the server's page different, on any console message, on a page without exactly one h1, and on a page that scrolls sideways. `composer check:browser` now builds with `npm run build:dev`, a development build, so antd's and React's warnings reach the console and fail the sweep too, and then builds the SSR bundle, which the sweep renders through on an SSR server of the test run's own (`tests/Support/Template/SsrServer.php`, on a free port). The other browser tests run without the server's render. List the project's own signed-in pages in a `projectSweptPages()` of its own, and the pages guests open in a `projectSweptGuestPages()`, in a file under `tests/Support/` that is not in `Template/` (never in the sweep's own lists, which the template adds to):

    ```php
    <?php

    /**
     * The project's own signed-in pages, for the page sweep.
     *
     * @return array<string, string>
     */
    function projectSweptPages(): array
    {
        return [
            'the invoices' => '/invoices',
        ];
    }

    /**
     * The project's own pages for guests, for the page sweep.
     *
     * @return array<string, string>
     */
    function projectSweptGuestPages(): array
    {
        return [
            'the pricing page' => '/pricing',
        ];
    }
    ```

### 7. Agent guidance

- The `ant-design-ui` skill (`.ai/skills/ant-design-ui`) is template-owned. The `frontend-components` skill, `components.json` and Boost's `tailwindcss-development` skill are gone.
- The project's own components and UI decisions go in `.ai/skills/project-ui/SKILL.md`, which the template does not ship. Create it, moving over what the project's own `frontend-components` notes said about its own components:

    ```markdown
    ---
    name: project-ui
    description: "This project's own UI components and decisions. Use after ant-design-ui, for any frontend task in resources/js."
    ---

    # Project UI

    - …
    ```

- Generate `CLAUDE.md`, `AGENTS.md`, `boost.json` and the skill folders. Never pass `-q`. `git status` must then show no template file rewritten besides those generated ones, and no `tailwindcss-development` skill (`config/boost.php` excludes it):

    ```bash
    php artisan boost:update
    git status --short
    ```

### 8. Smaller changes

- Fortify's features are switched in `config/fortify.php`, and the `features` shared prop tells the pages which are on (`registration`, `resetPasswords`, `emailVerification`, `twoFactorAuthentication`, `passkeys`). Every way into a feature (a link, a button, a section, a notice) shows only while it is on. If the project turned registration off by editing pages (deleting the link or the page, or a route), undo those edits and take `Features::registration()` out of the `features` array in `config/fortify.php` instead. With the feature off, Fortify has no registration route and the sign-in and home pages hide their links. The same goes for the other four features.
- The `perPageOptions` shared prop is gone. A list gets its page sizes from `ListRequest` (`list.perPageOptions`), which reads them from `config/lists.php`: `per_page_options` is `[10, 20, 50, 100]` and `per_page` is 20. Code or a test that read `usePage().props.perPageOptions` reads the list's own instead (step 5 maps `Pagination` and `withPerPage` to it).
- A form built with `useInertiaForm` is checked by the server while the user types: its route runs `HandlePrecognitiveRequests` and its FormRequest holds the rules. Fortify's own forms are submit-only.
- The appearance is kept in the `appearance` cookie only. The old `localStorage` key `appearance` is no longer read or written, and a visitor who chose a theme keeps it, because the old code wrote the cookie too. Delete project code that reads that key or calls `initializeTheme()`.
- The examples are local-only and need nothing: `/examples`, the Examples menu group, `app/Http/Controllers/Examples` and `resources/js/pages/examples` exist when `APP_ENV` is `local` or `testing`, and a production build leaves them out. Leave them in: the `ant-design-ui` skill points at them.

### 9. Check

```bash
composer check
composer check:browser
```

Run both and merge into `develop` only when both pass.

## sp-v1.3.0

chisel is removed. The Stop hook now checks only what a session changed, with a SessionStart hook that records what was there before.

- If the merge stops with delete conflicts on chisel files (`chisel.php`, `chisel-paths.php`, `app/Console/Commands/InstallFeaturesCommand.php`), keep them deleted.
- Make sure `composer.json` no longer requires `laravel/chisel` and no longer runs `php artisan install:features` (under `post-update-cmd` and `extra.laravel.installer`). A `composer.json` conflict can keep them on your side; take them out there too. Then take `laravel/chisel` out of `composer.lock`, and run what `--no-scripts` skipped:

    ```bash
    composer update laravel/chisel --no-scripts
    php artisan package:discover
    php artisan boost:update
    ```

- Find the files that still hold chisel markers:

    ```bash
    grep -rlE '@(end-)?chisel-' . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=vendor \
        --exclude=UPGRADING.md --exclude=project.md --exclude=CLAUDE.md --exclude=AGENTS.md
    ```

    It leaves out `UPGRADING.md`, `.ai/guidelines/project.md`, `CLAUDE.md` and `AGENTS.md`: they are documentation that describes the markers. A marker is a comment: `/* @chisel-x */` and `/* @end-chisel-x */`, written `{/* @chisel-x */}` inside JSX. chisel also accepted `<!-- @chisel-x -->` and `{{-- @chisel-x --}}`. Delete the comments and keep all the code, including everything between a start and an end marker. Delete a whole line only when the marker is all that is on it. When code shares the line, delete just the comment and the space beside it. The template had one such line pair, in `resources/js/pages/settings/security.tsx`:

    ```tsx
    } /* @chisel-passkeys */ & ManagePasskeysProps /* @end-chisel-passkeys */ /* @chisel-2fa */ &
        ManageTwoFactorProps; /* @end-chisel-2fa */
    ```

    which becomes:

    ```tsx
    } & ManagePasskeysProps &
        ManageTwoFactorProps;
    ```

- Install the new frontend packages. The merge moves `vite-plus` to 1.8.0 and swaps the Babel React Compiler (`@rolldown/plugin-babel`, `babel-plugin-react-compiler`) for the Oxc one (`oxc-transform-react`, set up as `react({ compiler: true })` in `vite.config.ts`). A plain `npm install`, like the `npm update` that the merge rules run, stops with `ERESOLVE could not resolve`, because your `package-lock.json` still pins the exact peers of `vite-plus` 1.4.0 (`oxfmt`, `oxlint`, `vitest`) and npm cannot move them. npm then suggests `--force` or `--legacy-peer-deps`: use neither, as both install peers that do not fit `vite-plus` 1.8.0. Delete the `vite-plus` family from the lock instead, so npm resolves it again against 1.8.0 and leaves every other package where it is:

    ```bash
    node -e '
    const fs = require("fs");
    const raw = fs.readFileSync("package-lock.json", "utf8");
    const lock = JSON.parse(raw);
    const family = /^node_modules\/(vite-plus|vitest|oxfmt|oxlint|oxlint-tsgolint|@vitest\/|@oxfmt\/|@oxlint\/|@oxlint-tsgolint\/|@voidzero-dev\/vite-plus-)/;
    for (const key of Object.keys(lock.packages)) {
        if (family.test(key)) delete lock.packages[key];
    }
    fs.writeFileSync("package-lock.json", JSON.stringify(lock, null, /\n( +)"/.exec(raw)[1]) + "\n");
    '
    npm install
    ```

- `package.json` now has a `"name"`, the template's own (`laravel-superpowers`), and the merge brings it in without a conflict. Give it your project's own name, in lowercase, and let npm write it into `package-lock.json`:

    ```bash
    npm pkg set name=<your-app>
    npm install
    ```

- If `DB_DATABASE` in your `.env` is still `laravel`, give it a name no other project uses. The tests run in `<DB_DATABASE>_test`, so two projects that share a name also share a test database and break each other's runs. Then run `php artisan migrate --force`, which creates the new database.
- Install superpowers for Claude Code (user scope) and for Codex, as in step 6 of "Start a new project" in the [README](README.md#start-a-new-project).
- The merge adds a SessionStart hook to `.claude/settings.json`. Claude Code rewrites that file with 2-space indentation when it saves a setting, so your working copy may hold such a rewrite that was never committed. Committed before the merge, it makes the file conflict, and resolving that in favour of your own version drops SessionStart without a word. Take the template's file (`git checkout --theirs .claude/settings.json`), add your own permissions and settings back, and check that SessionStart is there. Do the same for `.codex/hooks.json`. This must print nothing:

    ```bash
    grep -L SessionStart .claude/settings.json .codex/hooks.json
    ```

- The new SessionStart hook in `.claude/settings.json` and `.codex/hooks.json` starts working with the next session. Until then, the Stop hook of a session that is already running has no record of what was there before, so it checks every change in the worktree it ends a turn in.
- `visitSecurityPage()` moved out of `tests/Pest.php` into the template's helper file, `tests/Support/Template/browser.php`. Delete your copy from `tests/Pest.php` unless you changed it. If you changed it, keep it, in `tests/Pest.php` or in a `tests/Support/<name>.php` of your own: it replaces the template's. When `tests/Pest.php` conflicts, take the template's version and add your own setup and helpers back.
- If you added your own helper functions, custom expectations or classes to `tests/Pest.php`, you can move them into `tests/Support/*.php`, which `tests/Pest.php` loads, so that less of that file is yours to merge. Keep `pest()` and `uses()` configuration in `tests/Pest.php`, and leave `tests/Support/Template/` to the template.
