---
name: frontend-components
description: "Catalog of this app's React components (resources/js/components/shared and components/ui), its form and error rules, and its design tokens. Use for any frontend task: building or changing a page, layout, form, dialog, list, empty or loading state, toast, or styling in resources/js. Read it before writing a new component or reaching for raw Tailwind colours. Do not use for backend-only tasks."
---

# Frontend components

## Rules

- Build from `@/components/shared/*` first. Use a `@/components/ui/*` primitive only when no shared component does the job.
- Create a new component only when the same piece is needed in more than one place, or when no shared component can do it without a prop only one page would use. Put it in `components/shared/`, give it a doc comment that says what it is and when to use it (as the existing ones have), and add a test in `tests/js/components/shared/`.
- Colour with the design tokens below (`text-destructive-foreground`, `bg-muted`), never with raw palette colours (`text-red-600`) or hex values.
- `ui/button`'s `Button` defaults to `type="button"`. A form's main button is `SubmitButton`; a plain `Button` that submits needs `type="submit"`.

## Forms and errors

1. New pages use the boxed fields: `TextField`, `PasswordField`, `SelectField`, and `FormField` for a control without a box (a one-time code, a file picker). An error marks the box red, shows as a toast and moves the focus to the first failing field; nothing is written under the box.
2. An input that is not in a boxed field (a raw `ui/input`) must have `InputError` under it. Its error is not a toast, so without `InputError` it shows nowhere.

How this works: `useValidationErrorToasts` (registered once by the `Toaster` in `app.tsx`) toasts an error when its input sits in a boxed field, or when no input on the page has its name. It recognises a boxed field by the hidden mark `FieldError` renders. Never call the hook yourself.

The starter kit's auth and settings pages, and their dialogs, use these components too. An error that does not come from an Inertia request (a failed passkey prompt) is a `toast.error` too; never show a field's error both under it and as a toast.

## Feedback

- A toast after an action: in the controller, `Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')])`. The type is `success`, `info`, `warning` or `error`.
- Validation and network errors become toasts on their own.
- `StatusMessage`: a status that belongs to the page the user lands on (Fortify's `status`).

## Catalog (`@/components/shared/*`)

### Page structure

| Component        | Use                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `PageHeader`     | The top of every page with its own title: the title (the page's one h1) and the page's actions.    |
| `Section`        | One titled part of a page (h2): each part of a settings page.                                      |
| `DashboardGrid`  | The dashboard's two columns: main block two thirds wide, side block beside it; stacked on a phone. |
| `QuickLinks`     | One row per page the user comes back to: icon and linked name.                                     |
| `LabeledDivider` | A line with a few words in the middle ("Or continue with email").                                  |

`components/heading` (`Heading`) is what `PageHeader` and `Section` use. It renders an h1 by default and an h2 with `variant="small"`, and it has no description. Put any description in a `<p className="text-sm text-muted-foreground">` under it, as the settings pages do.

### Public pages

| Component      | Use                                                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PublicHeader` | The top bar: logo, page links, "Log in" and "Get started" (or "Dashboard"). Pass `signedIn={Boolean(auth.user)}` from the page props. "Get started" exists only when registration is enabled. |
| `Hero`         | The opening of a landing page: display-size heading, one sentence, one or two buttons.                                                                                                        |
| `FeatureGrid`  | What a product offers: icon, title and one line per feature, three columns.                                                                                                                   |
| `ClosingCall`  | The last line of a public page: one sentence and one button.                                                                                                                                  |
| `PublicFooter` | One row of links and the copyright line.                                                                                                                                                      |

### Forms

| Component       | Use                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StackedForm`   | Every form on a page (not in a dialog): an Inertia `<Form>` that takes the Wayfinder route's `.form()` and gives `errors` to its children. `wideButtons` for the narrow sign-in column. |
| `TextField`     | Any one-line value: name, email, number, code. Label required, floats in the box; `error` from the server.                                                                              |
| `PasswordField` | Every password, with a show/hide button; `revealable={false}` drops the button for a secret that stays masked (an API key).                                                             |
| `SelectField`   | One value from a fixed list in a box. `name` sends it with a form.                                                                                                                      |
| `CheckboxField` | One yes-or-no choice with its label ("Remember me").                                                                                                                                    |
| `FormField`     | A control without a box of its own: one-time code, file picker. Label above.                                                                                                            |
| `SubmitButton`  | The only button that sends a form: disabled with a spinner while sending. Inside `<Form>` it reads the state itself; otherwise pass `sending`.                                          |
| `Actions`       | Every row of action buttons: Cancel and the others first, the main one last. Right-aligned; full width and stacked when narrow.                                                         |

### Dialogs and destructive actions

| Component                                                                                      | Use                                                                                                                                              |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ResponsiveDialog` (`ResponsiveDialogBody`, `ResponsiveDialogFooter`, `ResponsiveDialogClose`) | Create, edit and confirm: a dialog on desktop, a bottom sheet on a phone. Fields in the body, buttons (`Actions`) in the footer.                 |
| `ConfirmButton`                                                                                | Every action that cannot be undone (delete, regenerate, revoke). It opens `ConfirmDialog`; `fields` are what must be typed first (the password). |
| `ConfirmDialog` (`ConfirmDialogActions`)                                                       | The confirmation itself: the action as the title and a `consequence`.                                                                            |
| `IconButton`                                                                                   | Any button with only an icon. `label` is required (screen readers and tooltip); pass a menu's or sheet's trigger as `trigger`.                   |

### Lists and states

| Component       | Use                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `FeedList`      | Rows of a feed separated by lines, with its own box (`framed={false}` inside a box that already has one).                     |
| `FeedRow`       | One message of a feed: unread dot, message, time; one button when given `onClick`.                                            |
| `Pagination`    | Under a paginated list: page links and rows per page. See below.                                                              |
| `EmptyState`    | Nothing in a list or region: faint icon, one line, the create button when the user can create.                                |
| `ErrorState`    | A region that could not load, with retry only when retrying can help. Action results and network errors are toasts, not this. |
| `LoadingState`  | Skeletons shaped like what is coming (cards on a phone, rows on desktop).                                                     |
| `RegionState`   | What a framed list shows instead of rows: failure, loading or empty.                                                          |
| `ErrorContent`  | The body of an error page for a status (403, 404, 500, 503) and its one button.                                               |
| `StatusMessage` | A one-line confirmation sent back with a page.                                                                                |

`Pagination` takes `collection` (a `ResourceCollection<T>` from `@/types/resource`) and `label`. Its rows-per-page choices come from the `perPageOptions` shared prop (`HandleInertiaRequests`: 10, 20, 50, 100), and the choice lives in the URL as `?per_page=`. In the controller, read `per_page`, fall back to 20 when it is missing or not one of the choices, and pass `XResource::collection($query->paginate($perPage)->withQueryString())` as the prop.

## Primitives (`@/components/ui/*`)

alert, avatar, badge, breadcrumb, button, card, checkbox, collapsible, dialog, dropdown-menu, icon, input (sizes `default`, `sm`, `start-icon`, `end-icon`), input-otp, label, navigation-menu, placeholder-pattern, popover, select, separator, sheet, sidebar, skeleton, sonner (`Toaster`, mounted once in `app.tsx`), spinner, toggle, toggle-group, tooltip (one `TooltipProvider` in `app.tsx`).

These are shadcn files and Oxfmt skips them. Change them only when a design change needs it.

## Design tokens (`resources/css/app.css`)

- Colours, each with a light and a dark value: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `border`, `input`, `input-focus`, `ring`, `sidebar-*`, `chart-1` to `chart-5`, each with `-foreground` where text sits on it. `primary`, `secondary`, `accent`, `destructive`, `success`, `warning` and `sidebar-accent` also have `-pressed`. Error text is `text-destructive-foreground`.
- Type: `text-display` and `text-display-lg` for display headings (`Hero`).
- Variants: `dark:` (the `.dark` class) and `field-empty:` (a floating label resting in an empty box).
- `resources/views/app.blade.php` paints the background before the CSS loads. Change it together with `--background`.
- The tests in `tests/js/*.test.ts` guard these: the pointer cursor on clickable elements, the display size pair, the input focus colour, the pressed colours in both themes, and the early background colour.
