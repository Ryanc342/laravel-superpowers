# sp-v3.0.0 Toolkit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn laravel-superpowers into a toolkit. Its UI and app code become upstream laravel/react-starter-kit's, unchanged, and the template keeps only its tooling.

**Architecture:** Restore upstream's paths wholesale with `git restore --source=upstream/main`, re-delete chisel, and keep a short, documented list of tooling exceptions. Then trim the test tooling (no SSR, no watchdog, a sweep with no page list of its own), replace the agent guidance (two vendor skills, Boost's Tailwind skill back, a rewritten `project.md`), and write the sp-v3.0.0 upgrade path for projects on sp-v1.3.0. Prove that path with a dry run on a throwaway clone.

**Tech Stack:** Laravel 13, Inertia v3, React 19, Wayfinder, Fortify, Vite+ (`vp` lint/fmt/test), Pest 5 with pest-plugin-browser (Playwright), MySQL, Laravel Boost, the `skills` CLI.

**Spec:** `docs/superpowers/specs/2026-11-27-sp-v3-toolkit-design.md`. Read it before any task.

## Global Constraints

- **Work in the worktree.** Use `.worktrees/sp-v3-toolkit` on branch `feature/sp-v3-toolkit`, set up per `.ai/guidelines/project.md` "Git Worktrees" with `DB_DATABASE=laravel_superpowers_sp_v3`. Never work in the main checkout.
- **Upstream reference.** `upstream/main` is `50a9f6c` (2026-11-25). Do not fetch a newer one during this plan. Task 4 records this commit in UPGRADING.
- **No command quieting.** Never run `composer …` or `php artisan boost:update` with `-q`. After any composer or Boost command, `git status` must show no unexpected rewritten file.
- **Process control.** Never `pkill`, `killall` or `kill $(pgrep …)`. Stop a stuck test run only by its process group.
- **Dependencies.**
    - Remove only what removed code needed, and restore upstream's own dependencies.
    - The only additions are the two skills. Install them with `DO_NOT_TRACK=1`.
    - Add no npm or Composer package beyond upstream's.
- **chisel stays removed.** `chisel.php`, `chisel-paths.php`, `app/Console/Commands/InstallFeaturesCommand.php` and `laravel/chisel` stay deleted. Restored files carry no `@chisel` marker: delete the comment and keep the code.
- **Checks per task.** Every task ends with `composer check` passing in the worktree. Tasks 2 and 5 also end with `composer check:browser` passing.
- **Commits.** End every commit message with:

    ```
    Co-Authored-By: <the model that wrote it> <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_011e6gP41m6A3J9aZYXx9iry
    ```

- **Markdown.** Format every changed Markdown file with the worktree's `node_modules/.bin/vp fmt <file>`.
- **gh.** Always pass `-R Ryanc342/laravel-superpowers`.

## Review Focus

1. **A project upgrading from sp-v1.3.0 by the new UPGRADING steps must end up with none of its UI or app files changed.** Clean merges and template deletions included. Task 4 Step 4 (dry run on a clone) pins this.
2. **Upstream's restored files must pass the template's lint, fmt and tsc exactly as upstream wrote them,** apart from the stripped chisel markers. Task 1 Steps 8–9 pin this: the lint config follows upstream, and the acceptance diff.
3. **The template-owned path list in `project.md` and `UPGRADING.md` must match files that actually exist.** A wrong path makes `git restore` keep a stale tooling file or overwrite a project file. Task 4 Step 3 pins this.
4. **`php artisan boost:update` must neither delete the two vendor skills nor recreate `ant-design-ui`.** Task 3 Steps 3 and 6 pin this.
5. **The sweep's default pages must be real GET routes,** and a project's own list must replace them. Task 2 Steps 1–2 pin this.

---

### Task 1: Back to upstream (UI, app, config and their tests)

**Files:**

- Restore from `upstream/main`, deleting template-only files: `resources/`, `components.json`, `app/`, `bootstrap/`, `config/`, `routes/`, `database/`, `lang/`, `tests/Feature/Auth/`, `tests/Feature/Settings/`, `tests/Feature/DashboardTest.php`, `tests/Feature/ExampleTest.php`, `tests/Unit/ExampleTest.php`
- Keep from HEAD (tooling exception): `config/boost.php`
- Delete:
    - `app/Console/Commands/InstallFeaturesCommand.php`, brought back by the restore;
    - `tests/Feature/{DownloadsCsvTest,ErrorPageTest,ExamplesRoutesTest,FeatureSwitchesTest,ListRequestTest,LocaleTest,TranslationsTest}.php`, `tests/Feature/Settings/PrecognitionTest.php` if the restore left it, `tests/Feature/Http/Middleware/`, `tests/Feature/Examples/`;
    - `tests/Browser/*` except `PageSweepTest.php` and `BrowserActionTimeoutTest.php`;
    - `tests/js/*` except `ai-hooks/` and `test-runner/`, including `tests/js/setup.ts`;
    - `tests/Support/Template/fortify.php`, `tests/Support/Template/frontend-imports.php`.
- Modify:
    - `tests/TestCase.php`: upstream's file plus the template's `setUp()` and `withServerRendering()`;
    - `tests/Support/Template/browser.php`: drop `visitSecurityPage()`;
    - `package.json`, `vite.config.ts`, `.env.example`, `tests/Pest.php` if it references a deleted helper.

**Interfaces:**

- Produces:
    - **Shape after this task:** the app and UI equal `upstream/main` except for the exceptions listed in Step 9.
    - **`tests/TestCase.php`** keeps `skipUnlessFortifyHas(string $feature, ?string $message = null): void` (upstream's), `setUp()` (the template's Vite hot-file isolation and SSR off) and, until Task 2, `withServerRendering()`.

- [ ] **Step 1: Restore upstream's paths**

    ```bash
    git restore --source=upstream/main --staged --worktree -- resources components.json app bootstrap config routes database lang tests/Feature/Auth tests/Feature/Settings tests/Feature/DashboardTest.php tests/Feature/ExampleTest.php tests/Unit/ExampleTest.php
    git restore --source=HEAD --staged --worktree -- config/boost.php
    git rm -q app/Console/Commands/InstallFeaturesCommand.php
    ```

- [ ] **Step 2: Strip chisel markers from every restored file**

    The first expression deletes a line that holds only a marker; the second deletes a marker sharing a line with code.

    ```bash
    git grep -l '@chisel' -- . | xargs perl -0pi -e 's/^[ \t]*(?:\{\/\* @(?:end-)?chisel-[a-z0-9-]+ \*\/\}|\/\* @(?:end-)?chisel-[a-z0-9-]+ \*\/)[ \t]*\n//mg; s/[ \t]*(?:\{\/\* @(?:end-)?chisel-[a-z0-9-]+ \*\/\}|\/\* @(?:end-)?chisel-[a-z0-9-]+ \*\/)//g'
    git grep -n '@chisel' -- .
    ```

    Expected: the final grep prints nothing. Spot-check `resources/js/pages/settings/security.tsx`: line 22 must read `} & ManagePasskeysProps &` (the formatter may reflow it).

- [ ] **Step 3: Delete the tests of removed features**

    Delete the test files listed under **Files → Delete**. Drop `visitSecurityPage()` from `tests/Support/Template/browser.php`, because only deleted tests used it.

- [ ] **Step 4: `tests/TestCase.php`**

    Upstream's class, with the template's `setUp()` (hot-file isolation and `inertia.ssr.enabled` off) and `withServerRendering()` added back. Task 2 removes `withServerRendering()`. Remove anything in `tests/Pest.php` that names a deleted helper; keep the rest of it.

- [ ] **Step 5: `package.json`**

    - Take upstream's `dependencies` and `devDependencies` exactly.
    - Then add back the devDependency `"playwright": "^1.65.1"`, which pest-plugin-browser needs.
    - Keep the scripts `"build:dev": "NODE_ENV=development vp build"` and `"test": "vp test"`.
    - Drop `"name"`.
    - Run `npm install`. No `--force`, no `--legacy-peer-deps`.

- [ ] **Step 6: `vite.config.ts`**

    Take upstream's file, then re-apply only these tooling hunks:
    - `'**/.worktrees/**'` in `server.watch.ignored`;
    - the fmt `ignorePatterns` entries `.claude/settings.json`, `.agents/skills/**`, `.ai/rules/**`, `.claude/skills/**`, `.codex/config.toml`, `.mcp.json`, `AGENTS.md`, `boost.json`, `CLAUDE.md`;
    - `test: { include: ['tests/js/**/*.test.{ts,tsx}'], environment: 'node' }`.

    The lint `plugins`/`rules` block is not re-applied; upstream's lint config applies as is.

- [ ] **Step 7: `.env.example`**

    `APP_LOCALE=en`, plus the template's MySQL block unchanged. `tsconfig.json`, `.gitignore`, `phpunit.xml`, `phpstan.neon` and `composer.json` stay as they are in this task.

- [ ] **Step 8: Run the checks**

    Run: `php artisan wayfinder:generate --with-form && composer check`

    Expected: PASS. If an upstream file fails lint, fmt or tsc, change the template's tooling config, never the upstream file. The acceptance diff in Step 9 must stay clean.

- [ ] **Step 9: Acceptance diff**

    Run: `git diff upstream/main --stat -- resources components.json app bootstrap config routes database lang tests/Feature/Auth tests/Feature/Settings tests/Feature/DashboardTest.php tests/Feature/ExampleTest.php tests/Unit/ExampleTest.php`

    Expected, and nothing else:
    - `config/boost.php` (added);
    - `app/Console/Commands/InstallFeaturesCommand.php` (deleted);
    - files whose only change is removed `@chisel` marker lines. Check each with `git diff upstream/main -- <file>`.

    Record this exception list in the task report.

- [ ] **Step 10: Commit**

    `git add -A && git commit` with message "Put back the upstream starter kit's UI and app code".

### Task 2: Test tooling without SSR or the watchdog

**Files:**

- Create: `tests/Feature/SweptPagesTest.php`
- Modify:
    - `tests/Support/Template/browser.php`: the defaults;
    - `tests/Browser/PageSweepTest.php`: rewrite;
    - `tests/TestCase.php`: drop `withServerRendering()`;
    - `tests/bootstrap.php`: drop lines 65–72 (watchdog doc) and 105–115 (watchdog start);
    - `composer.json`: `check:browser` loses `npx vp build --ssr`; the `scripts-descriptions` text mentions neither antd nor SSR;
    - `.github/workflows/check.yml`: "Build for production" runs only `vp build`, without `--ssr`, the manifest check or the examples check; the SSR comment in the browser job goes.
- Delete: `tests/Support/Template/SsrServer.php`, `tests/process-watchdog.sh`, `tests/js/test-runner/`
- Unchanged, deliberately: `.ai/hooks/check.sh` and `tests/js/ai-hooks/`. The hook has no SSR or test-watchdog code. Its `watchdog_group` is its own deadline timer, so it stays as is. _(Controller's call on the spec's "left to the builder".)_

**Interfaces:**

- Consumes: `tests/TestCase.php` from Task 1.
- Produces, in `tests/Support/Template/browser.php` (each inside the existing `if (! function_exists(...))` guard):
    - `projectSweptPages(): array<string, string>`, name ⇒ path, opened signed in as a verified `User::factory()->create()`:
      `['dashboard' => '/dashboard', 'profile settings' => '/settings/profile', 'security settings' => '/settings/security', 'appearance settings' => '/settings/appearance', 'password confirmation' => '/user/confirm-password']`;
    - `projectSweptGuestPages(): array<string, string>`, opened as a guest:
      `['welcome' => '/', 'login' => '/login', 'registration' => '/register', 'forgot password' => '/forgot-password', 'password reset' => '/reset-password/a-token?email=taylor%40example.com']`.

- [ ] **Step 1: Write the failing test `tests/Feature/SweptPagesTest.php`**

    ```php
    test('the sweep has pages to open', function () {
        expect(projectSweptPages())->not->toBeEmpty()
            ->and(projectSweptGuestPages())->not->toBeEmpty();
    });

    test('every swept page is a GET route', function (string $path) {
        $route = app('router')->getRoutes()->match(Request::create(strtok($path, '?'), 'GET'));
        expect($route->methods())->toContain('GET');
    })->with(fn () => array_values([...projectSweptPages(), ...projectSweptGuestPages()]));
    ```

- [ ] **Step 2: Run it to see it fail**

    Run: `php artisan test --compact --filter=SweptPagesTest`

    Expected: FAIL on "the sweep has pages to open" (the defaults return `[]`).

- [ ] **Step 3: Implement the two defaults in `tests/Support/Template/browser.php`**

    Use the values in the **Interfaces** block. Update their docblocks: the sweep has no list of its own, and a project's own function replaces the default.

- [ ] **Step 4: Run it to see it pass**

    Run: `php artisan test --compact --filter=SweptPagesTest`. Expected: PASS.

- [ ] **Step 5: Rewrite `tests/Browser/PageSweepTest.php`**

    - Signed-in sweep over `projectSweptPages()` × `['desktop', 'phone']`, as a verified user.
    - Guest sweep over `projectSweptGuestPages()` × the same devices.
    - `beforeEach` keeps:
        - `withoutMiddleware(RequirePassword::class)`;
        - a `web` middleware that injects only the console recorder (wraps `console.warn`/`console.error` into `window.__pestBrowser.consoleLogs`).
    - `sweep()` asserts:
        - `assertPathIs(strtok($path, '?'))`;
        - the Inertia app mounted (keep `waitForHydration()` as is);
        - `assertNoJavaScriptErrors()`;
        - `assertNoConsoleLogs()`.
    - Keep the console-recorder self-test.
    - Delete:
        - all SSR (`withServerRendering`, `SsrServer`, the kept-HTML middleware, `serverRenderedApp()`, the `SsrRenderFailed` listener);
        - the Pro placeholder counting and its self-test;
        - the h1 and overflow assertions;
        - the layout-before-JS test, the examples-route test, the dashboard "load more" test;
        - the built-in `sweptPages()`/`sweptPagesOutsideTheApp()` lists and the key-clash test.
    - Delete `SsrServer.php` and `withServerRendering()` from `TestCase.php`.

- [ ] **Step 6: Remove the watchdog**

    Delete `tests/process-watchdog.sh` and `tests/js/test-runner/`. Edit `tests/bootstrap.php` as listed under **Files**.

- [ ] **Step 7: composer scripts and CI**

    Make the `composer.json` and `check.yml` edits listed under **Files**.

- [ ] **Step 8: Run all checks**

    Run: `composer check && composer check:browser`. Expected: both PASS.

    Then run: `git grep -nE 'SsrServer|withServerRendering|process-watchdog|vp build --ssr' -- . ':!docs/superpowers' ':!UPGRADING.md'`. Expected: hits only in `.ai/guidelines/project.md`, `CLAUDE.md` and `AGENTS.md`, which Task 3 rewrites.

- [ ] **Step 9: Commit**

    Message: "Sweep pages without SSR from the project's lists, and drop the watchdog".

### Task 3: Agent guidance

**Files:**

- Modify:
    - `tests/Unit/AgentGuidanceTest.php`: rewrite;
    - `config/boost.php`: drop the `skills.exclude` block and its Ant Design comment;
    - `.ai/guidelines/project.md`: rewrite the sections named in Step 5;
    - regenerated by Boost: `CLAUDE.md`, `AGENTS.md`, `boost.json`, `.claude/skills/`, `.agents/skills/`.
- Create, with the skills CLI: `.agents/skills/shadcn/`, `.agents/skills/web-design-guidelines/`, their `.claude/skills/` links, `skills-lock.json`.
- Delete: `.ai/skills/ant-design-ui/`.

**Interfaces:**

- Consumes: the sweep contract from Task 2, which `project.md` documents.
- Produces: the template-owned path list in `project.md`, which Task 4 copies into UPGRADING.

- [ ] **Step 1: Write the failing `tests/Unit/AgentGuidanceTest.php`**

    Replace the file. Its docblock says: the guidance holds for any project; it checks only that the skills the tooling records are really installed for both agents.

    ```php
    test('every skill boost.json lists is generated for both agents', function (string $agentDirectory) {
        $skills = json_decode(file_get_contents(base_path('boost.json')), true)['skills'] ?? [];
        foreach ($skills as $skill) {
            expect(base_path("$agentDirectory/$skill/SKILL.md"))->toBeFile();
        }
    })->with(['.claude/skills', '.agents/skills']);

    test('every skill in skills-lock.json is installed for both agents', function (string $agentDirectory) {
        expect(base_path('skills-lock.json'))->toBeFile();
        $skills = array_keys(json_decode(file_get_contents(base_path('skills-lock.json')), true)['skills'] ?? []);
        expect($skills)->not->toBeEmpty();
        foreach ($skills as $skill) {
            expect(base_path("$agentDirectory/$skill/SKILL.md"))->toBeFile();
        }
    })->with(['.claude/skills', '.agents/skills']);
    ```

    If `skills-lock.json` turns out to use a different top-level key than `skills` (Step 4 shows it), adjust the key in this test.

- [ ] **Step 2: Run it to see it fail**

    Run: `php artisan test --compact --filter=AgentGuidanceTest`. Expected: FAIL, because `skills-lock.json` does not exist yet.

- [ ] **Step 3: Remove Ant Design guidance and bring back Boost's Tailwind skill**

    Delete `.ai/skills/ant-design-ui/` and drop `skills.exclude` from `config/boost.php`. Then run `php artisan boost:update`.

    Expected:
    - `boost.json` lists `tailwindcss-development` and not `ant-design-ui`;
    - `.claude/skills/tailwindcss-development/SKILL.md` and `.agents/skills/tailwindcss-development/SKILL.md` exist;
    - no `ant-design-ui` remains under `.claude/skills` or `.agents/skills`.

- [ ] **Step 4: Install the two vendor skills**

    ```bash
    DO_NOT_TRACK=1 npx skills add shadcn-ui/ui --skill shadcn --agent claude-code codex -y
    DO_NOT_TRACK=1 npx skills add vercel-labs/agent-skills --skill web-design-guidelines --agent claude-code codex -y
    ```

    Expected:
    - `.agents/skills/shadcn/SKILL.md` and `.agents/skills/web-design-guidelines/SKILL.md` exist;
    - `.claude/skills/shadcn` and `.claude/skills/web-design-guidelines` are links to them;
    - `skills-lock.json` lists exactly these two;
    - `migrate-radix-to-base` is absent.

    Remove any other agent folder the CLI created (check `git status`).

- [ ] **Step 5: Rewrite `.ai/guidelines/project.md`**

    Keep "Definition of Done", "Development Workflow", "Git Worktrees", "Database", "Architecture Rules", "CI" and "Generated Files" as they are, apart from the edits below.

    **Delete:**
    - "Who owns which file" (lines 39–54) with its table;
    - the project-look rules (`theme.ts`, `navigation.ts`, `dashboard.tsx`, `welcome.tsx`, `theme-background`);
    - every mention of Ant Design, `ant-design-ui`, translations, `lang/`, the example pages and the SSR server.

    **Rewrite "Branches"** so it states:
    1. **The template-owned list**, exact, one path per line:
        - `tests/Pest.php`, `tests/bootstrap.php`, `tests/TestCase.php`, `tests/Support/Template/`;
        - `tests/Browser/PageSweepTest.php`, `tests/Browser/BrowserActionTimeoutTest.php`;
        - `tests/Feature/SweptPagesTest.php`, `tests/Feature/TestDatabaseTest.php`, `tests/Feature/ViteIsolationTest.php`;
        - `tests/Unit/ArchTest.php`, `tests/Unit/AgentGuidanceTest.php`, `tests/Unit/TemplateTestHelpersTest.php`;
        - `tests/js/ai-hooks/`;
        - `.ai/hooks/check.sh`;
        - `.agents/skills/shadcn/`, `.agents/skills/web-design-guidelines/`, `.claude/skills/shadcn`, `.claude/skills/web-design-guidelines`, `skills-lock.json`;
        - the hooks block of `.claude/settings.json` and `.codex/hooks.json`.

        Everything else is the project's, including all UI and app code.

    2. **Mixed files** take only the template's tooling hunks, merged by hand: `composer.json`, `package.json`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `phpunit.xml`, `.env.example`, `config/boost.php`.
    3. **Template sync procedure:**
        1. `git merge --no-commit template/main`;
        2. `git restore --source=MERGE_HEAD --staged --worktree -- <template-owned paths>`;
        3. `git restore --source=HEAD --staged --worktree -- . ':!<each template-owned path>' ':!<each mixed file>'`;
        4. merge the mixed files by hand;
        5. lock files by the existing rules;
        6. `php artisan boost:update`;
        7. both checks.

        It also states that upstream's UI and app changes no longer reach a project through the template.

    4. **Upstream sync** (laravel-superpowers only):
        - take upstream's changes;
        - on a conflict, template-owned and mixed files keep the template's tooling and take upstream's for the rest; every other file takes upstream's;
        - chisel stays removed, with the marker-stripping rule;
        - `.github/workflows/check.yml` stays, and upstream's `tests.yml` stays deleted.

    **Rewrite "Test Runs":**
    - drop the watchdog paragraph;
    - the sweep paragraph says that the sweep opens the pages `projectSweptPages()` and `projectSweptGuestPages()` return, on a desktop and a phone; that the template's defaults list the starter kit's pages; and that a project's own function in `tests/Support/*.php` replaces a default and must list the starter-kit pages it keeps.

    **Edit "Definition of Done":** `composer check:browser` builds the frontend (no SSR bundle). Add one line: the template ships no UI code or UI rules, and the installed `shadcn` and `web-design-guidelines` skills are vendor-maintained.

- [ ] **Step 6: Regenerate and verify**

    Run `php artisan boost:update`, then `php artisan test --compact --filter=AgentGuidanceTest`. Expected: PASS.

    Then run: `git grep -niE 'ant design|ant-design|antd|process-watchdog|SsrServer|zh_CN|i18n' -- CLAUDE.md AGENTS.md .ai`. Expected: no output.

    Expected `git status`: the two vendor skills are untouched by Boost.

- [ ] **Step 7: Run the checks and commit**

    Run: `composer check`. Expected: PASS.

    Commit message: "Replace the template's UI guidance with vendor skills and tooling-only ownership".

### Task 4: README, UPGRADING and an upgrade dry run

**Files:**

- Modify: `README.md` (rewrite), `UPGRADING.md` (a new `## sp-v3.0.0` entry above `## sp-v2.0.0`)

**Interfaces:**

- Consumes: the template-owned list, mixed files and sync procedure from Task 3's `project.md`.

- [ ] **Step 1: Rewrite `README.md`**

    - Line 3 describes the toolkit: Laravel's React starter kit unchanged, plus `composer check`, `check:browser`, the MySQL test database and its lock, the AI workflow (superpowers, Boost, the Stop hook) and the two vendor skills.
    - "Start a new project" and "Keep a project up to date" lose every Ant Design and translation step, and the latter points to the sync procedure in `project.md`.

- [ ] **Step 2: Write `## sp-v3.0.0` in `UPGRADING.md`**

    - **Opening:**
        - for projects on sp-v1.3.0;
        - the sp-v2.0.0 steps do not apply, since no project merged v2;
        - upstream is at `50a9f6c`;
        - upstream's UI and app changes no longer reach projects through the template.
    - **Steps (spec Goal 9),** using the exact paths from `project.md`:
        1. Cut `chore/sync-template-<YYYY-MM-DD>`, then `git merge --no-commit template/main`.
        2. Restore the template-owned paths from `MERGE_HEAD` and everything else from `HEAD`. Give the two `git restore` commands with the full pathspec written out.
        3. **Delete the sp-v1.3.0 tooling files v3 dropped**, listed explicitly. Compute the list with:
           `git diff --name-only --diff-filter=D sp-v1.3.0 HEAD -- tests/process-watchdog.sh tests/js/test-runner tests/Support/Template tests/Browser/PageSweepTest.php tests/Unit tests/Feature/TestDatabaseTest.php .ai/hooks`
           Then keep only the files that sp-v1.3.0's `project.md` called template-owned.
        4. Merge the mixed files by hand.
        5. Lock files.
        6. `php artisan boost:update`.
        7. If the project defines its own `projectSweptPages()`/`projectSweptGuestPages()`, add the starter-kit pages it keeps.
        8. `composer check` and `composer check:browser`, then merge into `develop`.
    - **One sentence:** the v1 UI (`components/shared`, `.ai/skills/frontend-components`, the edited `components/ui/*`, `app.css` tokens, the v1 UI tests and `tests/js/setup.ts`) stays and is now the project's.

- [ ] **Step 3: Check the path list**

    For each path in the template-owned list of `project.md` and UPGRADING, run `test -e <path>` (or `-L` for links). Expected: every path exists.

- [ ] **Step 4: Dry-run the upgrade on a throwaway clone**

    ```bash
    D=/private/tmp/claude-501/-Users-ryan-Projects-laravel-superpowers/b1fab300-9ad2-4290-b08a-976aff4ae688/scratchpad/dry-run-dulabot
    git clone --no-hardlinks -q /Users/ryan/Projects/DulaBot "$D"
    git -C "$D" remote add template "$PWD" && git -C "$D" fetch -q template feature/sp-v3-toolkit
    ```

    - Follow UPGRADING steps 1–3 and 4 for git only, against `template/feature/sp-v3-toolkit`. Install nothing and run no checks.
    - Expected `git -C "$D" diff --cached --name-status HEAD`: only template-owned paths, mixed files and the step-3 deletions. **No path under `resources/`, `app/`, `routes/`, `config/` (other than `config/boost.php`), `database/` or `tests/js/` outside `ai-hooks/`.**
    - Report the list. If any other path appears, fix UPGRADING/`project.md` and repeat.
    - Never touch `/Users/ryan/Projects/DulaBot` itself, and delete `$D` afterwards.

- [ ] **Step 5: Format, run the checks and commit**

    Run `node_modules/.bin/vp fmt README.md UPGRADING.md`, then `composer check`. Expected: PASS.

    Commit message: "Document the toolkit and the sp-v3.0.0 upgrade from sp-v1.3.0".

### Task 5: Final acceptance

**Files:** none new. Fix whatever a check below turns up, in the task that owns it.

- [ ] **Step 1: Leftovers**

    Run:
    `git grep -nIiE 'ant ?design|antd|@ant-design|pro-components|dayjs|lib/i18n|zh_CN|process-watchdog|SsrServer|withServerRendering|/examples|examples\.' -- . ':!UPGRADING.md' ':!docs/superpowers' ':!composer.lock' ':!package-lock.json'`

    Expected: no output.

- [ ] **Step 2: Acceptance diff**

    Repeat Task 1 Step 9. Expected: the same exception list, nothing new.

- [ ] **Step 3: Full checks**

    Run: `composer check && composer check:browser`. Expected: both PASS.

- [ ] **Step 4: Hand off to finishing**

    Use superpowers:finishing-a-development-branch. Before the branch merges into `develop`:
    - delete `docs/superpowers/specs/2026-11-27-sp-v3-toolkit-design.md` and this plan in their own commit;
    - open the PR with `gh … -R Ryanc342/laravel-superpowers`;
    - wait for its CI before merging.

    Releasing sp-v3.0.0 needs the owner's approval.
