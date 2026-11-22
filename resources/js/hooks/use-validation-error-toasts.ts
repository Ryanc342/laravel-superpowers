import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

/** How many error toasts one burst shows before "And N more errors". */
const SHOWN_ERRORS = 5;

/**
 * The field errors of a failed submit as `name => message`. Errors that sit in
 * an error bag (Fortify's two-factor confirmation arrives as
 * `{ confirmTwoFactorAuthentication: { code: '…' } }`) are flattened to the
 * field names inside it; anything that is not a message is left out.
 */
function fieldErrors(errors: unknown): Record<string, string> {
    const found: Record<string, string> = {};

    if (typeof errors !== 'object' || errors === null) {
        return found;
    }

    for (const [name, value] of Object.entries(errors)) {
        if (typeof value === 'string') {
            found[name] = value;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(found, fieldErrors(value));
        }
    }

    return found;
}

/**
 * The names an input may carry for an error key. Laravel keys an error for a
 * list as `items.0.quantity`; an input of such a list is named
 * `items[0][quantity]`, so both are looked for.
 */
function fieldNames(key: string): string[] {
    const [first, ...rest] = key.split('.');

    return rest.length === 0
        ? [key]
        : [key, `${first}${rest.map((part) => `[${part}]`).join('')}`];
}

/** A selector for the inputs that may carry these error keys. */
function selectorFor(names: string[]): string {
    return names
        .flatMap(fieldNames)
        .map((name) => `[name="${CSS.escape(name)}"]`)
        .join(',');
}

/**
 * Where fields are looked for. Inside an open dialog only the dialog is
 * searched, so a field of the page behind it with the same name (`password`)
 * is not taken.
 */
function searchScope(): ParentNode {
    const dialogs = document.querySelectorAll('[role="dialog"]');

    return dialogs.item(dialogs.length - 1) ?? document;
}

/**
 * Whether an input belongs to a boxed field (TextField, PasswordField,
 * SelectField, or a control inside FormField): the box holds a FieldError,
 * whose `field-error` mark is there before any error is.
 */
function isBoxedField(field: Element): boolean {
    for (
        let parent = field.parentElement;
        parent !== null;
        parent = parent.parentElement
    ) {
        if (parent.querySelector(':scope > [data-slot="field-error"]')) {
            return true;
        }
    }

    return false;
}

/**
 * Whether an error is a toast. A boxed field never shows its error under the
 * box, and an error with no input on the page shows nowhere else, so both are.
 * A plain input (the official pages') has its InputError under it, so its
 * error is not, or it would show twice.
 */
function isToast(name: string): boolean {
    const field = searchScope().querySelector(selectorFor([name]));

    return field === null || isBoxedField(field);
}

/** The first boxed field in page order whose name has an error. */
function firstFieldWithError(names: string[]): HTMLElement | null {
    const selector = selectorFor(names);

    if (!selector) {
        return null;
    }

    return (
        Array.from(searchScope().querySelectorAll<HTMLElement>(selector)).find(
            isBoxedField,
        ) ?? null
    );
}

function focusField(field: HTMLElement): void {
    const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
    ).matches;

    field.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
    });
    field.focus({ preventScroll: true });
}

/**
 * A failed submit: each error of a boxed field, and each error no input on the
 * page shows, is one toast, at most five and then one "And N more errors", and
 * the first boxed field with an error is scrolled into view and focused. An
 * error of a plain input is left to the InputError under it. Inertia fires `error` for every
 * failed visit, so the same error after a second submit is announced again.
 * The red border is `FormField`'s. Registered once, by the Toaster.
 */
export function useValidationErrorToasts(): void {
    useEffect(() => {
        return router.on('error', (event) => {
            const errors = fieldErrors((event as CustomEvent).detail?.errors);
            const names = Object.keys(errors).filter(isToast);

            for (const name of names.slice(0, SHOWN_ERRORS)) {
                toast.error(errors[name], { id: `field-error-${name}` });
            }

            const more = names.length - SHOWN_ERRORS;

            if (more > 0) {
                toast.error(
                    more === 1
                        ? 'And 1 more error.'
                        : `And ${more} more errors.`,
                    { id: 'field-error-more' },
                );
            }

            // After the render that shows the errors (a dialog may be opening).
            setTimeout(() => {
                const field = firstFieldWithError(names);

                if (field) {
                    focusField(field);
                }
            }, 0);
        });
    }, []);
}
