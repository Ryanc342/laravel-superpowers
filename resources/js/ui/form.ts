import { useForm } from '@inertiajs/react';
import { Form } from 'antd';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import type { RouteDefinition } from '@/wayfinder';

/**
 * The glue between antd's forms (`Form`, `ProForm`, `ModalForm`, `DrawerForm`,
 * a `StepsForm` step) and Inertia's `useForm`. The server is the only
 * validator: a form passes antd no `rules` that check values, marks a required
 * field with `Form.Item`'s `required` and repeats no limit as `maxLength`.
 * Fields are checked on the server while the user types (Precognition), and
 * the server's errors show under their fields. Prefer Pro's date fields, which
 * format their own value; a plain antd picker with a time names its format in
 * `dateFormats`.
 *
 * Fortify's forms are submit-only (`precognitive: false`), because Fortify
 * validates inside its actions, which Precognition cannot reach.
 */

/** A field's name as antd writes it: `['items', 0, 'name']`. */
export type NamePath = (string | number)[];

/** A route a form submits to, from Wayfinder: `store()`, `update(user)`. */
export type FormRoute = RouteDefinition<'post' | 'put' | 'patch' | 'delete'>;

/** Inertia's errors: one message for each Laravel error key (`items.0.name`). */
type ServerErrors = Record<string, string>;

/**
 * The form's values as Inertia's `useForm` holds them. Its types follow
 * every value down, which a generic `T` cannot satisfy, and `any` is the case
 * they stop at. The values are T's: `initialValues`, then the form's store.
 */
type InertiaData = Record<string, any>;

/** How long after the last change the server check is sent. The first change is checked at once. */
const VALIDATION_TIMEOUT_MS = 500;

/** How a date reaches the server when nothing formats it: the local calendar date. */
const DATE_FORMAT = 'YYYY-MM-DD';

/** dayjs formats by field dot path, where `*` is any row index. */
type DateFormats = Record<string, string>;

/** The props to spread onto antd's `Form` or one of Pro's forms. */
export type InertiaAntdFormProps<T> = {
    form: FormInstance<T>;
    initialValues: T;
    layout: 'vertical';
    scrollToFirstError: true;
    onValuesChange: (changedValues: object, values: object) => void;
    /**
     * Submits through Inertia. It resolves `true` when the server accepted the
     * form, so a `ModalForm` or `DrawerForm` closes, and `false` when not.
     */
    onFinish: (values: T) => Promise<boolean>;
};

export type InertiaAntdFormOptions<T> = {
    /**
     * Check fields on the server while the user types. On by default. Off for
     * a route whose checks Precognition cannot run, because they are not in a
     * FormRequest: such a form is checked when it is submitted.
     */
    precognitive?: boolean;
    /** Fields emptied after a successful submit, such as a password. */
    resetOnSuccess?: (keyof T)[];
    /**
     * How a plain antd picker's date reaches the server, by field dot path,
     * where `*` is any row index: `{ starts_at: 'YYYY-MM-DD HH:mm:ss',
     * 'items.*.at': 'HH:mm:ss' }`. A range's path formats both its ends. A
     * Pro date field formats its own value, and that format wins. Any other
     * date goes out as its local calendar date, `YYYY-MM-DD`.
     */
    dateFormats?: DateFormats;
    /** Runs after a successful submit. */
    onSuccess?: () => void;
};

export type InertiaAntdForm<T> = {
    formProps: InertiaAntdFormProps<T>;
    /** True while the form is being sent: the submit button's `loading`. */
    processing: boolean;
    /**
     * Errors for fields the form does not show, such as an expired token. The
     * page shows them in an `Alert` (`type="error"`) above the fields.
     */
    unplacedErrors: string[];
    /**
     * Checks these fields (Laravel keys) on the server, and resolves whether
     * they passed: a `StepsForm` step's `onFinish`. It always settles: a check
     * that is cancelled, fails on the network, or is replaced within the
     * debounce by a keystroke's check resolves `false`. A form that is not
     * precognitive is checked on submit only, so its fields pass here.
     */
    validateFields: (names: string[]) => Promise<boolean>;
};

/** A Laravel error key as an antd name path: `items.0.name` is `['items', 0, 'name']`. */
export function toNamePath(key: string): NamePath {
    return key
        .split('.')
        .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

/** Whether two name paths name the same field, whether an index is a number or a string. */
function samePath(a: NamePath, b: NamePath): boolean {
    return (
        a.length === b.length &&
        a.every((segment, index) => String(segment) === String(b[index]))
    );
}

/** Whether `inner` is a field inside `outer`, such as a list's row inside the list. */
function isInside(inner: NamePath, outer: NamePath): boolean {
    return (
        inner.length > outer.length &&
        samePath(inner.slice(0, outer.length), outer)
    );
}

/** The dotted key Laravel and Inertia give this field. */
function errorKey(name: NamePath): string {
    return name.join('.');
}

/**
 * What each field of the form shows, from the server's errors: its message, or
 * no error. `known` is the form's field names. An error for a field the form
 * does not have is `unplaced`, so that it can still be shown.
 */
export function errorsToFields(
    errors: ServerErrors,
    known: NamePath[],
): {
    fields: { name: NamePath; errors: string[] }[];
    unplaced: string[];
} {
    const fields = known.map((name) => ({ name, errors: [] as string[] }));
    const unplaced: string[] = [];

    for (const [key, message] of Object.entries(errors)) {
        const field = fields.find(({ name }) =>
            samePath(name, toNamePath(key)),
        );

        if (field) {
            field.errors.push(message);
        } else {
            unplaced.push(message);
        }
    }

    return { fields, unplaced };
}

/** The names of the fields the form has, in the order they were rendered. */
function fieldNames(form: FormInstance): NamePath[] {
    return form.getFieldsError().map(({ name }) => name);
}

/** The value at a name path, or `found: false` when the path is not there. */
function valueAt(
    values: unknown,
    name: NamePath,
): { found: boolean; value?: unknown } {
    let current = values;

    for (const segment of name) {
        if (
            typeof current !== 'object' ||
            current === null ||
            !(segment in current)
        ) {
            return { found: false };
        }

        current = (current as Record<string | number, unknown>)[segment];
    }

    return { found: true, value: current };
}

/** Whether a value is a plain object, as opposed to an array, a date or a file. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return prototype === Object.prototype || prototype === null;
}

/** Whether two field values are the same: dates by their instant, lists and objects by what they hold. */
function sameValue(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) {
        return true;
    }

    if (dayjs.isDayjs(a) && dayjs.isDayjs(b)) {
        return a.valueOf() === b.valueOf();
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        return (
            a.length === b.length &&
            a.every((item, index) => sameValue(item, b[index]))
        );
    }

    if (isPlainObject(a) && isPlainObject(b)) {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

        return [...keys].every((key) => sameValue(a[key], b[key]));
    }

    return false;
}

/** Whether a list gained or lost rows. */
function isResized(before: unknown, after: unknown): boolean {
    const rows = (value: unknown): number =>
        Array.isArray(value) ? value.length : 0;

    return (
        (Array.isArray(before) || Array.isArray(after)) &&
        rows(before) !== rows(after)
    );
}

/**
 * The fields a change is about, from the form's store before and after it.
 * A list that gained or lost rows is the changed field, not the rows that
 * moved. Otherwise it is the innermost field whose value changed: one input
 * when it was typed in, not the list around it.
 *
 * It compares values and does not use antd's `changedValues`: Pro's forms
 * rebuild that object and format its dates.
 */
function changedFields(
    before: object,
    after: object,
    known: NamePath[],
): NamePath[] {
    const valuesOf = (name: NamePath): [unknown, unknown] => [
        valueAt(before, name).value,
        valueAt(after, name).value,
    ];
    const changed = known.filter((name) => !sameValue(...valuesOf(name)));
    const resized = changed.filter((name) => isResized(...valuesOf(name)));

    return changed.filter((name) => {
        if (resized.some((list) => isInside(name, list))) {
            return false;
        }

        return (
            resized.some((list) => samePath(list, name)) ||
            !changed.some((inner) => isInside(inner, name))
        );
    });
}

/** Whether a `dateFormats` key names this path: `items.*.at` names `['items', 0, 'at']`. */
function namesPath(key: string, path: NamePath): boolean {
    const segments = key.split('.');

    return (
        segments.length === path.length &&
        segments.every(
            (segment, index) =>
                segment === '*' || segment === String(path[index]),
        )
    );
}

/**
 * The format `dateFormats` gives the date at this path: the format of its own
 * path, or of the field it is in, such as the range one of its ends belongs
 * to. Without one, the local calendar date.
 */
function dateFormatFor(path: NamePath, dateFormats: DateFormats): string {
    for (let length = path.length; length > 0; length--) {
        const key = Object.keys(dateFormats).find((candidate) =>
            namesPath(candidate, path.slice(0, length)),
        );

        if (key !== undefined) {
            return dateFormats[key];
        }
    }

    return DATE_FORMAT;
}

/**
 * The form's values as Inertia sends them, for checks and submits alike.
 * - Every value is the store's, as its field holds it, so values with no
 *   field (a token, a row's id) and empty ones are kept.
 * - A date that the form formatted (`formatted`: a Pro date field's own
 *   `valueType` or `dateFormatter` format) takes that text or number. Nothing
 *   else is taken from `formatted`, and no method is called on its values:
 *   Pro's `transform` handling copies the dates it leaves into objects that
 *   look like dayjs but have no methods. Only the store's dates are formatted.
 * - Any other date takes its `dateFormats` format, or else its local calendar
 *   date, `YYYY-MM-DD`. No date goes out as a dayjs object or a UTC instant.
 */
function toInertiaData(
    store: object,
    formatted: object,
    dateFormats: DateFormats,
): InertiaData {
    const convert = (value: unknown, path: NamePath): unknown => {
        if (dayjs.isDayjs(value)) {
            const fromForm = valueAt(formatted, path).value;

            return typeof fromForm === 'string' || typeof fromForm === 'number'
                ? fromForm
                : value.format(dateFormatFor(path, dateFormats));
        }

        if (Array.isArray(value)) {
            return value.map((item, index) => convert(item, [...path, index]));
        }

        if (isPlainObject(value)) {
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    convert(item, [...path, key]),
                ]),
            );
        }

        return value;
    };

    return convert(store, []) as InertiaData;
}

/**
 * After a failed submit, scrolls to the first field with an error, in the
 * order of the form. When no error has a field, it brings the top of the form
 * into view, where the page shows them in an `Alert`.
 */
function scrollToFirstError(form: FormInstance, errors: ServerErrors): void {
    const known = fieldNames(form);
    const first = errorsToFields(errors, known).fields.find(
        (field) => field.errors.length > 0,
    );

    if (first) {
        form.scrollToField(first.name);
    } else if (known.length > 0) {
        form.scrollToField(known[0], { block: 'center' });
    }
}

/**
 * Connects an antd or Pro form to Inertia: spread `formProps` onto the form.
 * The form's values are the Inertia form's data, `route` (Wayfinder) is where
 * it is submitted and checked, and the server's errors show under the fields
 * they name.
 */
export function useInertiaForm<T extends Record<string, unknown>>(
    route: FormRoute,
    initialValues: T,
    options: InertiaAntdFormOptions<T> = {},
): InertiaAntdForm<T> {
    const {
        precognitive = true,
        resetOnSuccess = [],
        dateFormats = {},
        onSuccess,
    } = options;
    const [form] = Form.useForm<T>();
    // antd types a form's field names from T; the glue handles any name.
    const fieldStore: FormInstance = form;
    const inertiaForm = useForm<InertiaData>(
        toInertiaData(initialValues, {}, dateFormats),
    );
    // `withPrecognition(route)` is what `useForm(route, data)` does on every
    // render, and it is not a hook, so it can depend on the option.
    const precognitiveForm = precognitive
        ? inertiaForm.withPrecognition(route)
        : null;
    // Each call starts the debounce over, so it is set once and not on every
    // render: this is `setValidationTimeout`, on the validator itself.
    const validator = precognitiveForm?.validator() ?? null;
    const { errors } = inertiaForm;
    const [unplacedErrors, setUnplacedErrors] = useState<string[]>([]);
    const errorsShown = useRef(false);
    // The step check that the debounce holds back, until it is sent.
    const queuedCheck = useRef<((passed: boolean) => void) | null>(null);
    // The form's store as it was last handed to Inertia, to tell what changed.
    const lastStore = useRef<object>(initialValues);

    useEffect(() => {
        validator?.setTimeout(VALIDATION_TIMEOUT_MS);
    }, [validator]);

    useEffect(() => {
        const messages = errors as ServerErrors;
        const hasErrors = Object.keys(messages).length > 0;

        // Nothing is shown, so there is nothing to clear, and a closed modal's
        // form is not mounted yet.
        if (!hasErrors && !errorsShown.current) {
            return;
        }

        errorsShown.current = hasErrors;

        const { fields, unplaced } = errorsToFields(
            messages,
            fieldNames(fieldStore),
        );

        fieldStore.setFields(fields);
        setUnplacedErrors(unplaced);
    }, [errors, fieldStore]);

    /**
     * Hands the form's values to Inertia (`formatted`: as the form passes them
     * to its callbacks). It returns the field names and the store before and
     * after.
     */
    const syncData = (
        formatted: object,
    ): { known: NamePath[]; before: object; after: object } => {
        const known = fieldNames(fieldStore);
        const before = lastStore.current;
        const after = fieldStore.getFieldsValue(true) as object;

        lastStore.current = after;
        inertiaForm.setData(toInertiaData(after, formatted, dateFormats));

        return { known, before, after };
    };

    const onValuesChange = (_changedValues: object, values: object): void => {
        const { known, before, after } = syncData(values);
        const changed = changedFields(before, after, known);

        // The errors under a changed list's rows no longer match its rows,
        // which have moved. A submit-only field's own error goes too: the
        // server checks it again on submit.
        const stale = Object.keys(errors).filter((key) => {
            const path = toNamePath(key);

            return changed.some(
                (name) =>
                    isInside(path, name) ||
                    (!precognitiveForm && samePath(path, name)),
            );
        });

        if (stale.length > 0) {
            inertiaForm.clearErrors(...stale);
        }

        changed.forEach((name) =>
            precognitiveForm?.validate(errorKey(name), {
                // The debounce sends only its latest call, so once this
                // check is sent, a step check it held back never will be.
                onStart: () => queuedCheck.current?.(false),
            }),
        );
    };

    const onFinish = (values: T): Promise<boolean> =>
        new Promise((resolve) => {
            let accepted = false;

            syncData(values);
            inertiaForm.submit(route, {
                preserveScroll: true,
                onSuccess: () => {
                    accepted = true;

                    if (resetOnSuccess.length > 0) {
                        const names = resetOnSuccess.map(String);

                        inertiaForm.reset(...names);
                        fieldStore.resetFields(names);
                        lastStore.current = fieldStore.getFieldsValue(true);
                    }

                    onSuccess?.();
                },
                onError: (failed) =>
                    scrollToFirstError(fieldStore, failed as ServerErrors),
                onFinish: () => resolve(accepted),
            });
        });

    const validateFields = (names: string[]): Promise<boolean> => {
        if (!precognitiveForm) {
            return Promise.resolve(true);
        }

        return new Promise((resolve) => {
            const settle = (passed: boolean): void => {
                leaveQueue();
                resolve(passed);
            };
            const leaveQueue = (): void => {
                if (queuedCheck.current === settle) {
                    queuedCheck.current = null;
                }
            };

            // This call replaces a step check still held back.
            queuedCheck.current?.(false);
            queuedCheck.current = settle;

            precognitiveForm.validate({
                only: names,
                onStart: leaveQueue,
                onSuccess: () => settle(true),
                onValidationError: () => settle(false),
                // A sent check always finishes, also when it was cancelled
                // or failed on the network. Without a verdict, it does not
                // pass; after one, this does nothing.
                onFinish: () => settle(false),
            });
        });
    };

    return {
        formProps: {
            form,
            initialValues,
            layout: 'vertical',
            scrollToFirstError: true,
            onValuesChange,
            onFinish,
        },
        processing: inertiaForm.processing,
        unplacedErrors,
        validateFields,
    };
}
