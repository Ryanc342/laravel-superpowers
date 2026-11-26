import { useForm } from '@inertiajs/react';
import { Form } from 'antd';
import type { FormInstance } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { RouteDefinition } from '@/wayfinder';

/**
 * The glue between antd's forms (`Form`, `ProForm`, `ModalForm`, `DrawerForm`,
 * a `StepsForm` step) and Inertia's `useForm`. The server is the only
 * validator: a form passes antd no `rules` that check values, marks a required
 * field with `Form.Item`'s `required` and repeats no limit as `maxLength`.
 * Fields are checked on the server while the user types (Precognition), and
 * the server's errors show under their fields.
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

/** The props to spread onto antd's `Form` or one of Pro's forms. */
export type InertiaAntdFormProps<T> = {
    form: FormInstance<T>;
    initialValues: T;
    layout: 'vertical';
    scrollToFirstError: true;
    onValuesChange: (changedValues: object) => void;
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
     * they passed: a `StepsForm` step's `onFinish`. A form that is not
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

/**
 * The field an antd change is about. antd hands over the changed field's own
 * value, the very one in the form's store, inside new objects that lead to it.
 * So the outermost field whose value is the store's is the one that changed: a
 * whole list when a row was added or removed, one input when it was typed in.
 */
function changedFields(
    changedValues: object,
    store: object,
    known: NamePath[],
): NamePath[] {
    const sameAsStore = known.filter((name) => {
        const changed = valueAt(changedValues, name);

        return changed.found && changed.value === valueAt(store, name).value;
    });

    return sameAsStore.filter(
        (name) => !sameAsStore.some((outer) => isInside(name, outer)),
    );
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
    const { precognitive = true, resetOnSuccess = [], onSuccess } = options;
    const [form] = Form.useForm<T>();
    // antd types a form's field names from T; the glue handles any name.
    const fieldStore: FormInstance = form;
    const inertiaForm = useForm<InertiaData>(initialValues as InertiaData);
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

    /** The form's values, as the data Inertia sends. The store also holds values with no field, such as a token. */
    const syncData = (): object => {
        const store = fieldStore.getFieldsValue(true) as InertiaData;

        inertiaForm.setData({ ...store });

        return store;
    };

    const onValuesChange = (changedValues: object): void => {
        const store = syncData();
        const changed = changedFields(
            changedValues,
            store,
            fieldNames(fieldStore),
        );

        if (precognitiveForm) {
            changed.forEach((name) =>
                precognitiveForm.validate(errorKey(name)),
            );

            return;
        }

        // The server checks again on submit. Until then the changed field,
        // and the rows of a changed list, have no error.
        const stale = Object.keys(errors).filter((key) => {
            const path = toNamePath(key);

            return changed.some(
                (name) => samePath(path, name) || isInside(path, name),
            );
        });

        if (stale.length > 0) {
            inertiaForm.clearErrors(...stale);
        }
    };

    const onFinish = (): Promise<boolean> =>
        new Promise((resolve) => {
            let accepted = false;

            syncData();
            inertiaForm.submit(route, {
                preserveScroll: true,
                onSuccess: () => {
                    accepted = true;

                    if (resetOnSuccess.length > 0) {
                        const names = resetOnSuccess.map(String);

                        inertiaForm.reset(...names);
                        fieldStore.resetFields(names);
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
            precognitiveForm.validate({
                only: names,
                onSuccess: () => resolve(true),
                onValidationError: () => resolve(false),
                // A check that ended with no verdict (offline, a server
                // error) does not pass. After a verdict this does nothing.
                onFinish: () => resolve(false),
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
