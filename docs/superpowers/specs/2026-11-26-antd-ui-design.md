# Template UI on Ant Design: design

Release: `sp-v2.0.0`. Branch: `feature/antd-ui`, worktree `.worktrees/antd-ui`.

## Intent

The user wants every project built from this template to have one complete UI/UX system that needs almost no upkeep. Today's system is the template's own rules plus 84 home-made components on shadcn/ui. It grew by adding a rule each time the user spotted a problem, and the user, who knows only basic UI design, found that the result looks inconsistent ("四不像").

So the template drops all of it, rules and shared components alike ("一个不留"), and takes a ready-made system instead: **Ant Design 6 (`antd`) with Ant Design Pro components (`@ant-design/pro-components`, beta)**. Components, page skeletons and design rules then all come from one maintained source. The template keeps only what Ant Design cannot know: the theme (brand colour, font), the glue to Laravel and Inertia, bilingual text, and Fortify feature switches.

The downstream projects (MyCompany, then DulaBot, then FC-ERP-Suite) are migrated after this release, one at a time and each with its own spec. That migration is a real UI/UX refactor onto the new pages, not a restyle. This spec covers only the template.

## Goals

1. Every app page (auth, settings, dashboard, error, and every page a project adds) is built from antd and Pro components, so it looks and behaves the Ant Design way.
2. The template ships a working example of each common back-office page type. An agent building a new page starts from the matching example.
3. The template's own front-end code is only the thin glue that antd/Pro cannot provide (see "The glue"). There are no home-made UI components.
4. Bilingual UI: Chinese by default, switchable to English. Ant Design's own text (pagination, date pickers, empty states) switches with it.
5. Turning a Fortify feature off in `config/fortify.php` hides every way into it in the UI, and the app keeps working end to end.
6. Template syncs stop conflicting on UI files: the template no longer owns files that projects must edit.

## Non-goals

- Migrating the downstream projects. That is step 3, with one spec per project.
- A chart library. Dashboards and reports use `Statistic`, `StatisticCard`, `Progress` and tables. A project that needs charts adds `@ant-design/plots` itself; the skill says so.
- Custom lint rules or screenshot tests that police UI usage. The examples, the skill and the browser tests are the guardrails.
- Languages other than Chinese and English, although adding one later should mean only a new `Locale` case, its lang files and its antd locale.
- Marketing pages beyond the template's simple welcome page.

## Anti-goals (would make this a failure even if it works)

- A layer of our own page components wrapping Pro (`<ListPage>` and the like). The user chose against it, because it is our code to maintain and a second API for agents to learn.
- A mixed state, where app pages use some Tailwind or shadcn styling next to antd.
- Validation rules written twice, on the server and in the browser.
- A file that every project has to edit but the template also changes, so that it conflicts at every sync. Today's `frontend-components/SKILL.md` is the example to avoid.
- A first paint without styles, or in the wrong theme, on server-rendered pages.

## Decisions already made with the user

- antd 6 plus Pro components (beta) rather than shadcn or another library. The beta is acceptable with its version pinned. A throwaway spike (`.worktrees/spike-antd`) showed:
    - antd and Tailwind v4 styles survive Inertia navigation when antd sits in its own CSS layer;
    - ProLayout and ProTable render and hydrate under SSR;
    - with pre-generated styles (zeroRuntime), server-rendered pages are styled correctly before any JavaScript runs.
- Remove all of the template's UI rules and shared components.
- Follow Ant Design everywhere. The user reviewed 28 points where today's rules differ from Ant Design and chose Ant Design for all 28, including the 10 where the old rule was kept for a reason (listed under "UI behaviour" below).
- Five things Ant Design does not cover keep the user's own approach:
    - on phones, dialogs rise from the bottom;
    - the home and product pages keep their own design (see Tailwind below);
    - the font;
    - the error page's button depends on whether the user is signed in;
    - rows per page live only in the URL.
- Page templates (the user's word) cover all common back-office page types, not only the ones today's projects use:
    - list, detail, create/edit, step-by-step form, work queue, dashboard, report, settings, result, error and sign-in pages.
    - Each one is a working example page. Examples are reachable only in local development and in tests, never in production.
- Approach A (below): use Pro components directly, with examples and thin glue. No wrapper layer.
- Bilingual text in the template: Chinese by default, English selectable.
- chisel is gone (sp-v1.3.0). A Fortify feature is turned off in `config/fortify.php`, and the UI follows.
- One release, `sp-v2.0.0`. Not a gradual swap over several releases.

## Approaches considered

|                | A. Pro components directly + examples + glue (chosen)                               | B. Our own page components on top of Pro               |
| -------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| What a page is | PageContainer + ProTable / ProForm / StepsForm / ProDescriptions, composed per page | `<ListPage columns=…>` and similar, filled with config |
| Our code       | glue only                                                                           | glue plus a page-component layer                       |
| Upkeep         | follows Ant Design releases                                                         | our layer must follow every Pro change                 |
| Consistency    | from examples, the skill and the browser tests                                      | enforced by the wrapper                                |
| Agents learn   | Pro's documented API                                                                | Pro and our wrapper                                    |

The user chose A because the goal is the least upkeep. Also rejected:

- Ant Design Pro's own scaffold (umi/max): it brings its own router and framework, which fight Laravel and Inertia.
- A gradual replacement over several template releases: downstream syncs would see a shadcn/antd mix in between.

## Design

### Dependencies

Add:

- `antd` 6.x;
- `@ant-design/pro-components` 3.x beta, pinned exactly (the spike used `3.1.15-9`; take the latest beta that works and pin it);
- `@ant-design/icons`;
- `@ant-design/cssinjs`;
- `dayjs`, if it is not already pulled in as antd's dependency, for date locales.

Remove:

- every `@radix-ui/*` package;
- `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`;
- `sonner`, `lucide-react`, `input-otp` (antd has `Input.OTP`);
- anything else only the removed components used.

Keep:

- `tailwindcss` and `@tailwindcss/vite`, for the welcome page and projects' own marketing pages;
- `@laravel/passkeys`;
- Inertia, Wayfinder and the rest of the toolchain.

No new Composer packages: Laravel's Precognition is built in.

### Styling

- **antd in its own CSS layer, with styles pre-generated at build time** (antd's zeroRuntime mode), as in the spike.
    - The layer order is `@layer theme, base, antd, components, utilities;`.
    - The generated CSS covers antd, the theme's CSS variables (light and dark) and the Pro components' styles. In the spike, Pro's styles had to be extracted through its CommonJS build.
    - Generation runs on its own as part of `npm run dev` and `npm run build`. It is never a manual step, and its output is not committed.
- **One theme file**, `resources/js/theme.ts`, is the only place a project changes the look.
    - The project owns it. It holds the brand colour (`#155dfc`, today's brand blue) and the font: Instrument Sans, then system Chinese fonts, which keeps the font as today. It may also hold any other antd tokens a project wants to set.
    - What the template needs fixed (zeroRuntime, cssVar, the dark algorithm switch) lives in a template-owned module. That module merges `theme.ts` over the template's defaults.
    - Both the runtime `ConfigProvider` and the build-time style generation use the merged result.
    - Sizes are antd's defaults: the user chose 32px controls over today's 40px.
- **Dark mode stays.** The appearance setting (light, dark or system, in the `appearance` cookie, as now) picks antd's default or dark algorithm. The first paint must already be in the right theme for all three settings, including "system", with no hydration warnings. The spike did not test dark mode; see "Risks".
- **Tailwind is for marketing pages only:** the welcome page and any project's home or product pages.
    - App pages (everything inside the app or auth layout) use antd layout components only: `Flex`, `Space`, `Row`/`Col`, `ProCard` and the like. No Tailwind classes, and no `style` props for colours or spacing.
    - Marketing pages may use antd components (a `Button`, for example) inside a Tailwind layout.

### App shell

- `app.tsx` wraps every page in a `StyleProvider` (layer), a `ConfigProvider` (theme, current antd locale, zeroRuntime and cssVar), and antd's `App`, so that `message`, `notification` and `modal` follow the theme.
- **Signed-in layout: `ProLayout`.**
    - The menu is on the left by default; one setting in the theme file moves it to the top.
    - Menu items are links that make Inertia visits, and the current item comes from the Inertia URL.
    - The breadcrumb ends with the current page (Ant Design's way; the user chose it).
    - The collapsed state of the side menu stays in the `sidebar_state` cookie, as now.
    - The header holds the language switch and the user menu (settings, sign out).
    - The app's own menu items are in a project-owned file, which the template ships with only the dashboard.
    - On local and testing environments the menu also has an "Examples" group. The template's code adds it; it is not in that file.
- **Auth layout**: Pro's login form layout, with the language switch available before sign-in.
- **Public layout**: the welcome page, with sign-in and register links that follow the feature switches.
- The settings pages use a Pro layout with a menu for each settings section: Profile, Security, Appearance.

### The glue: the only front-end code the template owns

Each piece is small, typed and covered by tests. The builder chooses the names and file layout under `resources/js/`. The behaviour is fixed here.

1. **Lists.** A hook connects `ProTable` to Inertia.
    - The search form, filters, sort, page and rows per page all live in the URL query. Changing any of them makes an Inertia visit that preserves state and scroll, and reloads only the list's prop.
    - Rows and totals come from a Laravel paginator prop.
    - Two lists on one page don't share query keys: each list has its own parameter prefix. Today's `withPerPage` keeps the other list's `*_page`, which is a known bug.
    - Coming back from a detail page shows the same page and filters, because the state is in the URL.
    - The choices for rows per page are defined once on the server and used both to validate and to fill the page-size menu. This replaces today's `perPageOptions` middleware prop, which every controller had to validate again. The choices are 10, 20, 50 and 100.
    - Rows per page is never stored anywhere else, such as user preferences.
    - On the server, a single helper reads and validates `page`, `per_page`, `sort` (against a list of allowed columns) and the filters, and returns the paginator. A natural home is a base FormRequest in `App\Http\Requests`, which the architecture rules allow controllers to use.
2. **Forms.** One way connects antd `Form`, `ProForm`, `ModalForm`, `DrawerForm` and `StepsForm` to Inertia.
    - It submits through Inertia, taking a Wayfinder route object. While a request is in flight, the submit button shows that it is processing.
    - Server errors appear under their fields, and after a failed submit the page scrolls to the first error.
    - Fields are validated while the user types, through Inertia's built-in Precognition, against the same FormRequest rules.
    - `StepsForm` checks each step's fields on the server (`validate({ only: [...] })`) before moving on.
    - Rules exist only on the server. Any endpoint that has a form uses a FormRequest and Laravel's precognitive middleware.
    - The red asterisk on a required field is a display mark the page sets on the field (`Form.Item`'s `required`). No browser-side rule checks it, so it is not a second copy of the rule.
    - Limits such as `max:255` are not repeated as `maxLength`. The server's message reports them.
    - Fortify's own endpoints validate inside their action classes, which Precognition cannot reach. The builder either brings them under Precognition, for example by validating in FormRequests that Fortify's actions reuse, or documents that only those forms are checked on submit only. Either way, rules must not be duplicated in the browser.
3. **Feedback.** A flash message from the server (Inertia's flash data) shows as `message.success` or `message.error`. Network errors show as a `notification`. Validation errors never show as pop-ups; they are under the fields.
4. **Dialogs on phones.** Below antd's `md` breakpoint, a dialog opens as a bottom sheet (`Drawer` from the bottom), and above it as a `Modal`. This is one small component or hook that `ModalForm` and confirm-style dialogs use.
5. **Error pages.** Use Inertia v3's exception handling.
    - Outside debug mode, 403, 404, 419, 429, 500 and 503 render one `error` page, built on antd `Result` with its illustrations.
    - The button goes to the dashboard for a signed-in user and to the home page for a guest.
    - The text is translated.
    - This also fixes today's unconnected `ErrorContent`.

### Bilingual text

- **Mechanism:** the one DulaBot and MyCompany already use, moved into the template.
    - An `App\Enums\Locale` enum with the cases `ZhCn` (`zh_CN`) and `En` (`en`).
    - A middleware sets the language on every request: the signed-in user's saved choice, then a `locale` cookie, then `config('app.locale')`.
    - `APP_LOCALE` defaults to `zh_CN` and `APP_FALLBACK_LOCALE` to `en`. The browser's language is not consulted, which is my call: "Chinese by default" stays predictable.
- **Saving the choice:** a nullable `locale` column on `users`, written when a signed-in user switches. Guests get the cookie. A route updates both, and the language switch in the header and on the auth pages calls it.
- **Shared props:** `locale`, `locales` (value and label) and `translations`. `translations` is the current language's sentences, sent once per language with `Inertia::once`.
- **In React:** `t()`, `tChoice()` and `msg()` from DulaBot's `resources/js/lib/i18n.ts`.
    - Every sentence is keyed by its English text, so English needs no table.
    - Placeholders (`:name`) and plurals follow Laravel's rules.
- **In Laravel:**
    - The template's sentences (front end and back end: mail, notifications, flash) go in a template-owned JSON file, for example `lang/template/zh_CN.json`, which a service provider registers with `addJsonPath()`.
    - A project's own sentences go in `lang/zh_CN.json`. The template does not ship that file. Laravel merges both, and on the same key the project's file wins (check this order in a test).
    - `lang/zh_CN/{auth,pagination,passwords,validation}.php` hold Laravel's own messages, taken from DulaBot's hand-written files.
    - `lang/en/*` is Laravel's published files.
    - Both sets of PHP files are template-owned. A project names its fields through its FormRequests' `attributes()`, run through `__()`, and not by editing `validation.php`.
- **antd and Pro:** the `ConfigProvider` locale and the dayjs locale follow `locale`. That is `zh_CN` with `zh-cn`, or `en_US` with `en`. The builder checks that Pro's built-in text (table toolbar, search form "查询/重置", step labels) switches too.
- **`<html lang>`** follows the current language.
- **A test fails** when a sentence used in `t()`/`tChoice()` in `resources/js` or in `__()` in `app/` is in neither Chinese JSON file. This stops a forgotten translation from shipping.
- **Copy rules** (Ant Design's, from the 28 points):
    - Chinese addresses the user as "你";
    - put a space between Chinese and Latin letters or numbers;
    - dates are written `2026-11-26`;
    - no full stop at the end of short English UI text such as labels, buttons, titles and hints;
    - "登录", not "登陆".

### Fortify feature switches

- A shared prop `features` says which of Fortify's features are on: `registration`, `resetPasswords`, `emailVerification`, `twoFactorAuthentication` and `passkeys`.
- The pages hide every way into a feature that is off:
    - the sign-up links on the login and welcome pages;
    - "Forgot password";
    - the passkey sign-in button;
    - the Security page's two-factor and passkey sections;
    - the verification notices.
- Turning any one of them off leaves the app working end to end. In particular, turning `emailVerification` off must not leave routes behind `verified` redirecting to a verification route that no longer exists. The builder decides how, for example through whether `User` implements `MustVerifyEmail`.
- There is a feature test for each switch turned off, and a browser test for registration off.

### Pages the template rebuilds

All of these are written fresh on antd and Pro, and every string goes through `t()`.

- **Auth:** `login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `confirm-password`, `two-factor-challenge`. The two-factor challenge uses `Input.OTP`. Passkey sign-in stays.
- **Settings:**
    - `profile`, which includes deleting the account in a modal that asks for the password, Ant Design's way for high-risk actions;
    - `security`, with the password, two-factor setup (QR code, recovery codes) and passkeys;
    - `appearance`.
    - The controllers and routes stay. Only the pages and their props change.
- **Dashboard:** a real page built like the dashboard example.
- **`welcome`:** a simple public page: Tailwind for the layout, antd buttons, and the feature-aware links.
- **`error`:** see "The glue", item 5.

### Page-type examples

The examples live in `resources/js/pages/examples/*`. Their routes are in `routes/examples.php`, which loads only in the `local` and `testing` environments. Controllers go in `App\Http\Controllers\Examples\`.

The data is generated in memory and deterministic (Faker with a fixed seed), so there are no migrations or models. List data is still paginated, sorted and filtered on the server, so the example exercises the real glue.

| Type              | What the example shows                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List              | `PageContainer` with the title, breadcrumb and a "New" button, and a `ProTable` with:<ul><li>search form, filters, sort, pagination, row actions;</li><li>status `Tag`s;</li><li>`Popconfirm` before deleting;</li><li>a short create form in a `ModalForm`;</li><li>the first-time empty state (one hint and an action) and the no-results state (one sentence);</li><li>coming back from detail keeps the page and filters.</li></ul> |
| Detail            | `PageContainer` with actions, `ProDescriptions`, tabs, and a related `ProTable`.                                                                                                                                                                                                                                                                                                                                                        |
| Create / edit     | A long form on its own page: `ProForm` in `ProCard` sections, required asterisks, checks while typing, and buttons under the fields on the left.                                                                                                                                                                                                                                                                                        |
| Step-by-step form | `StepsForm`, where each step is checked on the server before "Next".                                                                                                                                                                                                                                                                                                                                                                    |
| Work queue        | Tabs by status with counts, row selection with batch actions, and Popconfirm for batch actions that cannot be undone.                                                                                                                                                                                                                                                                                                                   |
| Dashboard         | `StatisticCard`s, `Progress`, and an activity feed that loads more at the end (Inertia's merge/infinite-scroll props) instead of paging.                                                                                                                                                                                                                                                                                                |
| Report            | A date-range filter, summary statistics, a `ProTable` with a summary row, and an export button (it can download a CSV of the fake data).                                                                                                                                                                                                                                                                                                |
| Settings          | The template's real settings pages.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Result            | antd `Result` for success and failure, with the next actions.                                                                                                                                                                                                                                                                                                                                                                           |
| Error             | The real `error` page, with a local-only preview route for each status.                                                                                                                                                                                                                                                                                                                                                                 |
| Sign-in           | The real auth pages.                                                                                                                                                                                                                                                                                                                                                                                                                    |

### UI behaviour fixed by the user's 28 choices

Most of these come with antd and Pro as they are. The table names the ones the glue or the examples must get right.

| #   | Behaviour                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A focused input gets antd's primary border and glow.                                                                                            |
| 2   | Controls are 32px (antd's default size).                                                                                                        |
| 3   | Input text is 14px (antd's default). iPhone zooms in on focus, which the user accepted.                                                         |
| 4   | Outline buttons turn the primary colour on hover.                                                                                               |
| 5   | The breadcrumb includes the current page.                                                                                                       |
| 6   | Fields are checked while typing, through Precognition.                                                                                          |
| 7   | Form buttons sit under the fields, on the left.                                                                                                 |
| 8   | On a phone, a wide table scrolls sideways inside itself (`scroll={{ x: 'max-content' }}`). The page itself never scrolls sideways.              |
| 9   | Required fields show the red asterisk.                                                                                                          |
| 10  | Notification and activity feeds load more at the end instead of paging.                                                                         |
| 11  | A form error shows under its field, in the space antd keeps there, so the field below doesn't move. A failed submit scrolls to the first error. |
| 12  | Labels go above inputs.                                                                                                                         |
| 13  | A status message (such as "Reset link sent") is an `Alert` above the form, and it stays.                                                        |
| 14  | A section or card description is at most one line, and only when the title alone is unclear. Dialogs have none.                                 |
| 15  | antd `Pagination` shows the total and the page-size menu, becomes the simple version on phones, and is hidden when there is one page.           |
| 16  | Back from detail keeps the list's page and filters (URL state).                                                                                 |
| 17  | A `Popconfirm` before an action that can't be undone. High-risk actions, such as deleting the account, use a modal with the password.           |
| 18  | A short create or edit form goes in a modal, a long one on its own page.                                                                        |
| 19  | A first-time empty list shows one guidance line and an action. A search with no results shows one sentence.                                     |
| 20  | Error pages use `Result` illustrations.                                                                                                         |
| 21  | Status tags have a light background and coloured text, from antd's preset status colours.                                                       |
| 22  | The selected menu item is in the light primary colour.                                                                                          |
| 23  | A disabled control is grey, with the not-allowed cursor.                                                                                        |
| 24  | Body text is 14px with a 22px line height.                                                                                                      |
| 25  | Menu icons are the same colour as their text.                                                                                                   |
| 26  | Dark-mode text is antd's 85% white.                                                                                                             |
| 27  | Links lighten on hover, with no underline.                                                                                                      |
| 28  | The copy rules under "Bilingual text".                                                                                                          |

### Guidance for agents

- **Delete the `frontend-components` skill:** `.ai/skills/frontend-components`, its entry in `boost.json`, and the copies `boost:update` generated. Remove every mention of the old rules from `.ai/guidelines/project.md`.
- **Add one template-owned skill**, for example `.ai/skills/ant-design-ui/SKILL.md`, short and for any front-end task. It says:
    - pick the page type, then start from its example;
    - build with antd and Pro, and never hand-roll a component they already have;
    - use the glue for lists, forms, feedback and dialogs;
    - send every sentence through `t()` and add it to `lang/zh_CN.json`;
    - follow the feature switches;
    - apply the five own-approach exceptions;
    - keep Tailwind to marketing pages.
    - It links to Ant Design's and Pro's documentation for anything else.
- **A project's own components and notes go in a project-owned file** that the template never ships with content: for example `.ai/skills/project-ui/SKILL.md`, which the template leaves out, or `.ai/guidelines/` of the project's own. The template skill points to it. This ends the sync conflicts of today's skill table.
- **Boost's `tailwindcss-development` skill** would steer agents to Tailwind for app pages. Leave it out of `boost.json`, or otherwise keep it from being generated, and check that `boost:update` respects that. No agent-facing text may suggest Tailwind for app pages.
- **The upstream sync rules** in `.ai/guidelines/project.md` (merging laravel/react-starter-kit) get a rule like the chisel one. The starter kit's front end stays out, as the user was told when choosing antd ("页面和组件用我们的，官方的页面更新直接忽略"):
    - its pages, components, layouts, hooks and styles stay deleted;
    - new UI files it adds are not taken;
    - its shadcn, Radix and other UI packages stay out of `package.json`, even when it bumps their versions.
    - Its backend, configuration and tooling changes merge as before.

### Who owns which file

This list is what keeps template syncs from conflicting (goal 6). It goes into `.ai/guidelines/project.md` and the skill.

| Template-owned (projects don't edit)                                       | Project-owned (the template ships it once and leaves it alone) |
| -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| the glue, `app.tsx`, the layouts, the theme defaults module                | `resources/js/theme.ts`                                        |
| auth, settings, error and example pages, with their routes and controllers | the app menu file, `dashboard.tsx`, `welcome.tsx`              |
| `lang/template/*.json`, `lang/en/*.php`, `lang/zh_CN/*.php`                | `lang/zh_CN.json`                                              |
| the `ant-design-ui` skill                                                  | the project's UI notes file                                    |

A project that needs to change a template-owned page copies it into its own page and points its route there, instead of editing the template's page.

### Removed

- `resources/js/components/ui/*` (27 files), `components/shared/*` (31), and the other files in `components/` (26), each replaced by antd/Pro or by the glue.
- The layouts under `resources/js/layouts/` (6 files).
- The hooks and lib code only those used: `use-appearance` (it moves into the glue), `use-mobile*`, `use-initials`, `use-flash-toast`, `use-network-error-toast`, `use-validation-error-toasts`, `lib/utils.ts` (`cn`) and `lib/pagination.ts`. Keep a hook only if the new pages still need it.
- In `vite.config.ts`: the Oxlint override for the starter kit's auth screens (positive `tabIndex` and `autofocus`), since those screens are rewritten, and the lint and format ignores for `components/ui/*`.
- The `perPageOptions` and `sidebarOpen` shared props, once their replacements exist.
- In `tests/js`: the tests of what is removed. That is `components/*`, the removed hooks and lib, `pages/*`, and the rule tests `cursor`, `display-size`, `field-focus`, `press-states` and `theme-background`.
    - `ai-hooks/*` and `test-runner/*` stay.
    - Approving this spec approves deleting those test files, since the code they test is deleted.

### Tests

- **Vitest** for the glue:
    - mapping list state to and from the URL, including the prefix for two lists;
    - mapping server errors to form fields;
    - flash-to-message;
    - the phone bottom-sheet switch;
    - `t()`, `tChoice()` and placeholders.
- **Pest feature tests:**
    - the shared props (`features`, `locale`, `locales`, `translations`);
    - the language middleware order and the saving route;
    - each feature switch turned off;
    - the error pages for each status, outside debug mode;
    - the list helper: per-page validation, sorting only by allowed columns, and filters;
    - the example routes exist in local and testing and not in production;
    - the missing-translation check.
- **Browser tests** (Pest + Playwright). Rewrite the 9 existing ones (authentication, email verification, passkeys, password confirmation, password reset, registration, settings, two-factor; `BrowserActionTimeoutTest` stays) for the new markup, and add:
    - every app and example page loads without console errors, at desktop and phone width, with no sideways page scroll on the phone;
    - a list search goes into the URL, and back from detail restores it;
    - a field error appears while typing, and the next field doesn't move: measure its position;
    - a failed submit scrolls to the first error;
    - a modal is a bottom sheet on the phone;
    - the first paint is in the right theme for light, dark and system dark;
    - the language switch changes antd's text and persists after sign-in;
    - registration turned off hides its links.
- `composer check` and `composer check:browser` pass.

### Release and downstream

- **Release as `sp-v2.0.0`.** The major version marks the break: every downstream page that imports a removed component stops compiling.
- **`UPGRADING.md` gets a `sp-v2.0.0` section**, which step 3's migrations follow:
    - what was removed;
    - a mapping table from each removed component or pattern to its antd/Pro replacement or its glue piece;
    - how a project that already has its own `Locale`/`t()` (DulaBot, MyCompany) moves to the template's: keep the template's code, keep the project's own sentences in its `lang/zh_CN.json`, and drop the entries that only repeat the template's;
    - that the theme lives in `resources/js/theme.ts`;
    - where the project's own UI notes go;
    - that examples are local-only.
- Delete the spike worktree and its branch, `spike/antd`, once the implementation plan is written. What it taught is recorded here.
- This spec and its plan are deleted from `docs/superpowers/` before the branch merges into `develop`, as the project rules say.

## Constraints

- Everything in `CLAUDE.md` applies.
    - Test-driven for behaviour.
    - `composer check` and `composer check:browser` must pass.
    - The architecture presets apply. For example, controllers have only resource methods, so the language switch is something like `LocaleController@update`.
    - Wayfinder is used for routes.
    - No new dependencies beyond those listed above without asking.
- SSR stays on. Nothing may depend on `window` during server rendering.
- Nothing in production may expose the example routes.
- The Pro beta is pinned exactly. Upgrading it is a deliberate change with the browser tests as the check.
- Every user-visible string is translated in both languages. That includes mail and notifications from the template, such as verify email and reset password.

## Left to the builder

- File names and module layout for the glue, the theme file's exact shape, and how the style generation plugs into Vite: a plugin, or a pre-step of `dev`/`build`.
- How dark mode reaches a correct first paint with zeroRuntime CSS for "system".
- Whether Fortify's forms get Precognition (see "The glue", item 2).
- How turning off email verification keeps working (see "Fortify feature switches").
- The fake-data shapes and the domain of the examples, as long as each example shows what its row in the table says.
- The order of the work. It is one release, but the plan may split it into several plans. Every step on the branch must keep both checks passing.

## Risks and accepted trade-offs

- **Pro is beta.** Pinned and covered by the browser tests. If a blocker turns up, the fallback for that page type is plain antd, not our own wrapper.
- **Dark mode with pre-generated styles** is untested. A browser test catches a wrong first paint, and the builder solves it before moving on.
- **Bundle size.** The generated CSS was about 174 KB compressed in the spike. That is accepted for back-office apps. Trimming it to the components used is a later improvement.
- **iPhone zoom** on 14px inputs. The user chose antd's size.
- **Upstream starter-kit page updates** no longer merge, since every page is ours now. This was accepted when the user chose antd.
