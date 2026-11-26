---
name: ant-design-ui
description: "How this app's UI is built: Ant Design 6 and Pro components, the template's glue to Laravel and Inertia, and a working example of each page type. Use for any frontend task in resources/js: building or changing a page, layout, form, list, dialog or feedback. Do not use for backend-only tasks."
---

# Ant Design UI

App pages are built from Ant Design 6 (`antd`) and Ant Design Pro (`@ant-design/pro-components`), composed directly in each page and wired to Laravel and Inertia by a thin glue in `resources/js/ui/`. There are no home-made UI components and no wrapper layer over Pro.

## Start from the page type's example

Pick the page type and copy its example. Signed in on a local app, the examples are in the menu's Examples group, under `/examples/`. They exist only in the `local` and `testing` environments. Their controllers are in `App\Http\Controllers\Examples` and their requests in `App\Http\Requests\Examples`.

| Page type                                         | Page                                                                               | Server                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| List: search, filters, sort, paging, empty states | `resources/js/pages/examples/orders/index.tsx`                                     | `OrderController@index`, `OrderListRequest`                       |
| Short create form in a dialog                     | `QuickAdd` in the list example                                                     | `OrderController@store`, `OrderRequest`                           |
| Detail: actions, fields, tabs, a related table    | `resources/js/pages/examples/orders/show.tsx`                                      | `OrderController@show`                                            |
| Create / edit: a long form on its own page        | `resources/js/pages/examples/orders/form.tsx`                                      | `OrderController@store` and `@update`, `OrderRequest`             |
| Step-by-step form                                 | `resources/js/pages/examples/steps.tsx`                                            | `StepsFormController`, `StepsFormRequest`                         |
| Work queue: status tabs, selection, batch actions | `resources/js/pages/examples/queue.tsx`                                            | `QueueController`, `QueueListRequest`, `QueueUpdateRequest`       |
| Dashboard                                         | `resources/js/pages/examples/dashboard.tsx`                                        | `DashboardController`                                             |
| Report: date range, totals, CSV export            | `resources/js/pages/examples/report.tsx`                                           | `ReportController`, `ReportExportController`, `ReportListRequest` |
| Result                                            | `resources/js/pages/examples/result.tsx`                                           | `ResultController`                                                |
| Settings                                          | `resources/js/pages/settings/*.tsx`, in `resources/js/layouts/settings-layout.tsx` | `App\Http\Controllers\Settings\*`, `routes/settings.php`          |
| Error                                             | `resources/js/pages/error.tsx`, previewed at `/examples/errors/{status}`           | `bootstrap/app.php`                                               |
| Sign-in                                           | `resources/js/pages/auth/*.tsx`, in `resources/js/layouts/auth-layout.tsx`         | Fortify                                                           |

- **Dashboard:** lay `StatisticCard`s out in `Row`/`Col`, not in `StatisticCard.Group`. Group decides its column count in JavaScript, so the server-rendered page re-flows once it hydrates.
- **CSV export:** use the `App\Concerns\DownloadsCsv` trait (`csvDownload()`). It writes a byte order mark, without which Excel reads the file in the system's code page and garbles Chinese, and it puts `'` before a cell that would start a formula.

## Build with antd and Pro

- Never hand-roll what antd or Pro already has: a table, a form field, a card, a tag, an empty state, a skeleton. Pro gives the page skeletons (`PageContainer`, `ProTable`, `ProForm` and its fields, `StepsForm`, `ProDescriptions`, `ProCard`, `StatisticCard`); antd gives the rest.
- Docs: [antd's components](https://ant.design/components/overview) (an index for agents: <https://ant.design/llms.txt>), [Pro's components](https://pro-components.antdigital.dev), and the guidelines the installed Pro ships for its own version, in `node_modules/@ant-design/pro-components/guidelines/`. Pro is a pinned beta: check a prop against the installed package's types.
- Where those docs load data or check values in the browser (`ProTable`'s `request`, a field's `rules`, a step's own `onFinish`, `transform`), use the glue below instead.
- Pro's styles are generated at build time from the components in `proTree` in `resources/js/ui/antd-styles.ts`, and the browser makes none (zeroRuntime). A Pro component that is not there, or a part of one the sample does not render, may show unstyled: check it in the browser. Adding it to the sample is a change to the template. antd's own components are all sampled.
- App pages (everything in the app or auth layout) are laid out with `Flex`, `Space`, `Row`/`Col` and `ProCard`, with no Tailwind classes and no `style` props for colours or spacing.
- A page's title is its one h1: `title={<PageTitle>{title}</PageTitle>}` on `PageContainer` (`@/ui/page-title`), with `<Head title={title} />`.
- SSR is on: nothing reads `window` or `document` while rendering. Do it in an effect.
- Ant Design's way, as the examples show it: labels above fields; form buttons under the fields, on the left; a short form in a dialog and a long one on its own page; a `Popconfirm` before an action that can't be undone, and a modal that asks for the password before a high-risk one (`resources/js/components/settings/delete-account.tsx`); a first empty list shows one line and the action, a search with no results one sentence; status `Tag`s in antd's preset status colours; the server's status message is an `Alert` above the form, and it stays.
- No chart library ships. `Statistic`, `StatisticCard`, `Progress` and tables cover dashboards and reports; a project that needs charts adds `@ant-design/plots` itself.

## The glue

Read each piece's docblock before you use it.

### Lists: `useInertiaTable` and `ListRequest`

`useInertiaTable` is in `resources/js/ui/list.ts`, and its server half is `App\Http\Requests\ListRequest`.

- Server: a subclass of `ListRequest` names its `sortable()` columns, its `filters()` rules, and a `$prefix` when a page has two lists. The controller sends the list as one prop: `$request->toProps($request->paginate($rows), $map)`.
- Page: `const table = useInertiaTable(list, 'propName')`, then `<ProTable rowKey="id" columns={columns} {...table} />`. A sortable column has `sorter: true` and `sortOrder: sortOrderOf(list, 'column')`. A search field's `dataIndex` is a filter's name.
- `ListRequest` never fails a query. A hand-edited or old URL falls back to the defaults, and a page past the end shows the last page. Read the values only through `perPage()`, `sort()`, `filterValues()` and `paginate()`.
- Rows per page live only in the URL, never in the user's settings, a cookie or storage. The choices and the default are in `config/lists.php`.
- Filter on presence, not truthiness, because `'0'` is a filter: `OrderController@index` reads each filter with a `''` default and compares it with `''`, where `when($value)` would skip a search for "0".
- `rowKey` names a field that is unique in the rows (`id`, an order line's `line`), not a label: two rows with one key break selection and React's rendering.
- A date range filter is an array filter: `'ordered_at' => ['array'], 'ordered_at.*' => ['date_format:Y-m-d']`, as in `ReportListRequest`.

### Forms: `useInertiaForm`

`useInertiaForm(route, initialValues, options)` is in `resources/js/ui/form.ts` and takes a Wayfinder route (`store()`, `update(id)`). Spread `formProps` onto `Form`, `ProForm` or `ResponsiveModalForm`. `processing` is the submit button's `loading`. Show `unplacedErrors` in an `Alert type="error"` above the fields.

- **Precognitive rule:** the server is the only validator. A form's route validates with a FormRequest and has the `HandlePrecognitiveRequests` middleware, so the form checks each field there while the user types. Give no `rules` that check values, and no `maxLength` that repeats a `max:` rule. A slow check (an outside service, `uncompromised()`) runs on submit only, as in `StepsFormRequest`: `...($this->isPrecognitive() ? [] : [$rule])`.
- **Fortify forms are submit-only:** Fortify validates inside its actions, which Precognition cannot reach, so its forms pass `precognitive: false`. Never add Precognition to a Fortify route.
- **Asterisk rule:** mark a required field with `required` on `Form.Item` or on the Pro field. It is a mark only, and no browser-side rule backs it.
- Declare the form's values with `type`, not `interface`: the glue's `Record<string, unknown>` constraint rejects an interface.
- Give every field an `attributes()` entry in its FormRequest, through `__()`, so the server's messages name the field the way its label does.
- The glue ignores Pro's `transform`: values go to the server as the form holds them. Shape them in `initialValues` and on the server.
- Dates:
    - prefer Pro's date fields (`ProFormDatePicker`, `ProFormDateRangePicker`): they format their own value, and that format wins;
    - a plain antd picker with a time names its format in the `dateFormats` option: `{ starts_at: 'YYYY-MM-DD HH:mm:ss' }`;
    - every other date reaches the server as its local `YYYY-MM-DD`, never as a UTC instant.
- Two forms on one page never share a name, because each field's id starts with it. The name defaults to the route's method and URL, so pass `name` when two forms share a route.

### Step-by-step forms: `useInertiaStepsForm`

- Always use `useInertiaStepsForm` (`resources/js/ui/form.ts`), never hand-wired `StepsForm` callbacks. The steps share one antd form, and naive wiring lets Next skip an empty step. Spread `stepsFormProps` onto `StepsForm` and `stepFormProps` onto every `StepsForm.StepForm`, and give the steps no `onFinish` of their own.
- The list of each step's fields follows the step order: one entry for every step, `[]` for a step with nothing to check.
- Keep the steps fixed, with no conditional step: Pro never shrinks its step count.
- When the server refuses the send, the form goes back to the first step with an error, which shows under its field.

### Dialogs: `ResponsiveModal` and `ResponsiveModalForm`

Use them (`resources/js/ui/dialog.tsx`) instead of `Modal` and `ModalForm`: on a phone, below antd's `md` breakpoint, they rise from the bottom as a sheet. A dialog's first field may take `autoFocus`, with a one-line reason and `// oxlint-disable-next-line jsx-a11y/no-autofocus` above it, as in `resources/js/components/settings/passkeys.tsx`.

### Feedback

- After an action, the controller flashes a toast, which `resources/js/ui/feedback.ts` shows as an antd `message`: `Inertia::flash('toast', ['type' => 'success', 'message' => __('Order created.')])`. The type is `success`, `error`, `info` or `warning`.
- A request that cannot reach the server shows a `notification` by itself. Validation errors never pop up: they show under their fields.
- In a page, take `message`, `notification` and `modal` from `App.useApp()`. antd's static `message.success()` ignores the theme and warns in the console.

### Appearance, theme and menu

- `useAppearance()` (`resources/js/ui/appearance.ts`) gives the user's choice (`appearance`), what the page shows (`resolved`) and `setAppearance`. The choice is kept in the `appearance` cookie.
- The look (brand colour, font, any antd token, where the menu sits) is set only in `resources/js/theme.ts`.
- The signed-in menu's entries are `appMenu` in `resources/js/navigation.ts`.

## Text

- Every sentence a user reads goes through `t()` or `tChoice()` from `@/lib/i18n`, and through `__()` in PHP. It is keyed by its English text; `:name` placeholders and `a|b` plurals follow Laravel's rules.
- `msg()` marks a sentence that is translated where it is shown: constants, menu labels, and all text passed to a layout (`Login.layout = { title: msg('Log in to your account') }`). A page's layout props are read before the root layout hands over the language, so `t()` there would give the wrong language. The layout calls `t()`.
- Add the Chinese of every new sentence: to `lang/template/zh_CN.json` for a sentence the template ships, or to `lang/zh_CN.json` in a project, whose file wins on the same key. `tests/Feature/TranslationsTest.php` fails on a sentence that has no Chinese.
- A key means the same in every context. A sentence whose meaning depends on where it is gets an English key of its own.
- Copy rules:
    - Chinese addresses the user as "你";
    - put a space between Chinese and Latin letters or numbers;
    - write dates as `2026-11-26`;
    - no full stop at the end of short English UI text (labels, buttons, titles, hints);
    - "登录", never "登陆".

## Fortify feature switches

The `features` shared prop says which of Fortify's features `config/fortify.php` has on: `registration`, `resetPasswords`, `emailVerification`, `twoFactorAuthentication` and `passkeys`. Every way into a feature (a link, a button, a section, a notice) renders only while its feature is on, as in `resources/js/pages/auth/login.tsx`.

## Where the app departs from Ant Design

Five things keep the template's own approach:

1. On phones, dialogs rise from the bottom (`ResponsiveModal`, `ResponsiveModalForm`).
2. The home and product pages keep their own design, in Tailwind.
3. The font: Instrument Sans, then the system's Chinese fonts (`resources/js/theme.ts`).
4. The error page's button goes to the dashboard for a signed-in user and to the home page for a guest (`resources/js/pages/error.tsx`).
5. Rows per page live only in the URL.

## Tailwind: marketing pages only

- Tailwind is for `resources/js/pages/welcome.tsx` and a project's own home and product pages, which may use antd components (a `Button`) inside a Tailwind layout. Their unsized text inherits antd's 14px from antd's `App`, so size the text that should be larger.
- App pages use no Tailwind. Boost's `inertia-react-development` skill draws loading skeletons with Tailwind; use antd's `Skeleton`.

## Example-only code

- Nothing outside `resources/js/pages/examples/` imports an example page, `@/routes/examples/…` or `@/actions/App/Http/Controllers/Examples/…`. A production build has no example routes and leaves the example pages out. Copy what you need, such as `formatMoney`, into your own code. `tests/Feature/ExamplesRoutesTest.php` and CI's production build check this.
- The menu's Examples entries come from the server's `examples` prop (`HandleInertiaRequests`), so no browser code names an example route.

## Before you finish

- Add every new page to `sweptPages()` in `tests/Browser/PageSweepTest.php`. It opens each page on a desktop and on a phone, and fails on any console message, a page without exactly one h1, or a page that scrolls sideways.
- `composer check:browser` builds in development mode (`npm run build:dev`), so antd's and React's warnings reach the console. A production build leaves them out.

## Who owns which file

| Template-owned (projects don't edit)                                                                                                             | Project-owned (the template ships it once and leaves it alone)                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| the glue (`resources/js/ui/`, `resources/js/lib/i18n.ts`), `resources/js/app.tsx`, `resources/js/ssr.tsx`, the layouts (`resources/js/layouts/`) | `resources/js/theme.ts`                                                                                           |
| auth, settings, error and example pages, with their routes and controllers                                                                       | the app menu (`resources/js/navigation.ts`), `resources/js/pages/dashboard.tsx`, `resources/js/pages/welcome.tsx` |
| `lang/template/*.json`, `lang/en/*.php`, `lang/zh_CN/*.php`                                                                                      | `lang/zh_CN.json`                                                                                                 |
| this skill                                                                                                                                       | the project's UI notes                                                                                            |

To change a template page, copy it into a page of the project's own and point its route there.

## The project's own components and notes

A project's own components and UI decisions go in `.ai/skills/project-ui/SKILL.md`. The template doesn't ship it: create it in the project, with `name` and `description` frontmatter, and run `php artisan boost:update`. When it exists, read it after this skill.
