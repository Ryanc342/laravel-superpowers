import type {
    DrawerFormProps,
    ModalFormProps,
    ProFormProps,
    StepFormProps,
} from '@ant-design/pro-components';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert, Button, Form, Input } from 'antd';
import type { FormProps } from 'antd';
import { useEffect, useState } from 'react';
import {
    afterEach,
    beforeEach,
    expect,
    expectTypeOf,
    test,
    vi,
} from 'vite-plus/test';
import { errorsToFields, toNamePath, useInertiaForm } from '@/ui/form';
import type { InertiaAntdForm, InertiaAntdFormProps } from '@/ui/form';
import type { RouteDefinition } from '@/wayfinder';

type Errors = Record<string, string>;

type VisitOptions = {
    preserveScroll?: boolean;
    onSuccess?: () => void;
    onError?: (errors: Errors) => void;
    onFinish?: () => void;
};

type ValidationConfig = {
    only?: string[];
    onStart?: () => void;
    onSuccess?: () => void;
    onValidationError?: () => void;
    onFinish?: () => void;
};

/**
 * A stand-in for Inertia's `useForm`: it keeps its errors as React state, as
 * Inertia does, and records what the glue asks of it. The test plays the
 * server through `inertia.setErrors` and the options `submit` was given.
 */
const inertia = {
    setErrors: (_errors: Errors) => {},
    setData: vi.fn(),
    clearErrors: vi.fn(),
    reset: vi.fn(),
    submit: vi.fn(),
    validate: vi.fn(),
    validator: { setTimeout: vi.fn() },
    withPrecognition: vi.fn(),
};

function useFakeForm() {
    const [errors, setErrors] = useState<Errors>({});

    useEffect(() => {
        inertia.setErrors = setErrors;
    }, []);

    const form = {
        errors,
        processing: false,
        setData: inertia.setData,
        reset: inertia.reset,
        submit: inertia.submit,
        validate: inertia.validate,
        validator: () => inertia.validator,
        clearErrors: (...fields: string[]) => {
            inertia.clearErrors(...fields);
            setErrors((current) =>
                Object.fromEntries(
                    Object.entries(current).filter(
                        ([key]) => !fields.includes(key),
                    ),
                ),
            );
        },
        withPrecognition: (route: unknown) => {
            inertia.withPrecognition(route);

            return form;
        },
    };

    return form;
}

vi.mock('@inertiajs/react', () => ({
    useForm: () => useFakeForm(),
}));

type Order = { token: string; email: string; items: { name: string }[] };

const route: RouteDefinition<'post'> = { url: '/orders', method: 'post' };

/** `token` has no field, like a reset link's token: it is sent all the same. */
const initialValues: Order = { token: 'abc', email: '', items: [{ name: '' }] };

const rendered: { hook?: InertiaAntdForm<Order> } = {};

/** What the hook returned to the form on screen. */
function hook(): InertiaAntdForm<Order> {
    if (!rendered.hook) {
        throw new Error('The order form is not rendered.');
    }

    return rendered.hook;
}

beforeEach(() => {
    inertia.setData = vi.fn();
    inertia.clearErrors = vi.fn();
    inertia.reset = vi.fn();
    inertia.submit = vi.fn();
    inertia.validate = vi.fn();
    inertia.validator = { setTimeout: vi.fn() };
    inertia.withPrecognition = vi.fn();
    rendered.hook = undefined;
});

afterEach(() => {
    vi.restoreAllMocks();
});

/** The order form a page would build: an email, a list of items, an Alert for errors with no field. */
function OrderForm({
    precognitive,
    resetOnSuccess,
    onSuccess,
}: {
    precognitive?: boolean;
    resetOnSuccess?: (keyof Order)[];
    onSuccess?: () => void;
}) {
    const form = useInertiaForm(route, initialValues, {
        precognitive,
        resetOnSuccess,
        onSuccess,
    });

    useEffect(() => {
        rendered.hook = form;
    });

    return (
        <Form {...form.formProps}>
            {form.unplacedErrors.length > 0 && (
                <Alert type="error" title={form.unplacedErrors.join(' ')} />
            )}
            <Form.Item name="email" label="Email" required>
                <Input />
            </Form.Item>
            <Form.List name="items">
                {(fields, { add, remove }) => (
                    <>
                        {fields.map((field) => (
                            <Form.Item
                                key={field.key}
                                name={[field.name, 'name']}
                                label={`Item ${field.name + 1}`}
                            >
                                <Input />
                            </Form.Item>
                        ))}
                        <Button onClick={() => add({ name: '' })}>
                            Add item
                        </Button>
                        <Button onClick={() => remove(0)}>
                            Remove first item
                        </Button>
                    </>
                )}
            </Form.List>
            <Button htmlType="submit" loading={form.processing}>
                Save
            </Button>
        </Form>
    );
}

/** The server's errors, as Inertia hands them to the form. */
function serverErrors(errors: Errors): void {
    act(() => inertia.setErrors(errors));
}

/**
 * The error antd shows under the field with this label, or null. antd shows a
 * new error a tick after it is set, so a test waits for it.
 */
function errorUnder(label: string): string | null {
    const item = screen.getByLabelText(label).closest('.ant-form-item');

    return (
        item?.querySelector('.ant-form-item-explain-error')?.textContent ?? null
    );
}

/** The text of the form-level Alert, or null when there is none. */
function alertText(): string | null {
    return document.querySelector('.ant-alert')?.textContent ?? null;
}

/** The fields the form asked the server to check, one call at a time. */
function checkedFields(): unknown[] {
    return inertia.validate.mock.calls.map(([field]) => field);
}

/** What the last submit was given. */
function lastSubmit(): [unknown, VisitOptions] {
    return inertia.submit.mock.lastCall as [unknown, VisitOptions];
}

/** What a promise settled to by now, or `'pending'` while it has not. */
function settled<T>(promise: Promise<T>): Promise<T | 'pending'> {
    return Promise.race([
        promise,
        new Promise<'pending'>((resolve) =>
            setTimeout(() => resolve('pending'), 50),
        ),
    ]);
}

/** Submits the form as antd does once its own checks pass. */
function submitForm(): Promise<boolean> {
    let finished = Promise.resolve(false);

    act(() => {
        finished = hook().formProps.onFinish(
            hook().formProps.form.getFieldsValue(),
        );
    });

    return finished;
}

/** The server accepts the submit. */
function serverAccepts(): void {
    const [, options] = lastSubmit();

    act(() => {
        options.onSuccess?.();
        options.onFinish?.();
    });
}

/** The server rejects the submit with these errors, which Inertia has set first. */
function serverRejects(errors: Errors): void {
    const [, options] = lastSubmit();

    act(() => {
        inertia.setErrors(errors);
        options.onError?.(errors);
        options.onFinish?.();
    });
}

test('a Laravel error key becomes an antd name path', () => {
    expect(toNamePath('email')).toEqual(['email']);
    expect(toNamePath('items.0.name')).toEqual(['items', 0, 'name']);
    expect(toNamePath('a.b')).toEqual(['a', 'b']);
});

test('errors go to the fields they name, and an error with no field is kept apart', () => {
    const known = [['email'], ['items', 0, 'name']];

    expect(
        errorsToFields(
            { 'items.0.name': 'Name is required', token: 'Invalid token' },
            known,
        ),
    ).toEqual({
        fields: [
            { name: ['email'], errors: [] },
            { name: ['items', 0, 'name'], errors: ['Name is required'] },
        ],
        unplaced: ['Invalid token'],
    });
});

test('formProps spread onto antd Form and every Pro form', () => {
    expectTypeOf<InertiaAntdFormProps<Order>>().toExtend<FormProps<Order>>();
    expectTypeOf<InertiaAntdFormProps<Order>>().toExtend<ProFormProps<Order>>();
    expectTypeOf<InertiaAntdFormProps<Order>>().toExtend<
        ModalFormProps<Order>
    >();
    expectTypeOf<InertiaAntdFormProps<Order>>().toExtend<
        DrawerFormProps<Order>
    >();
    expectTypeOf<InertiaAntdFormProps<Order>>().toExtend<
        StepFormProps<Order>
    >();
});

test('a server error shows under its field, and goes when a submit-only field changes', async () => {
    render(<OrderForm precognitive={false} />);

    serverErrors({ email: 'Bad' });

    await waitFor(() => expect(errorUnder('Email')).toBe('Bad'));

    await userEvent.type(screen.getByLabelText('Email'), 'a');

    await waitFor(() => expect(errorUnder('Email')).toBeNull());
    expect(inertia.clearErrors).toHaveBeenCalledWith('email');
    expect(inertia.validate).not.toHaveBeenCalled();
    expect(inertia.setData).toHaveBeenLastCalledWith({
        token: 'abc',
        email: 'a',
        items: [{ name: '' }],
    });
});

test('a nested error lands under its field, and one for a field the form does not show goes to the Alert', async () => {
    render(<OrderForm />);

    serverErrors({
        'items.0.name': 'Name is required',
        token: 'Invalid token',
    });

    await waitFor(() => expect(errorUnder('Item 1')).toBe('Name is required'));
    expect(errorUnder('Email')).toBeNull();
    expect(alertText()).toBe('Invalid token');
});

test('a precognitive form checks the changed field on the server, with a 500ms debounce set once', async () => {
    render(<OrderForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'ab');
    await userEvent.type(screen.getByLabelText('Item 1'), 'c');

    expect(inertia.withPrecognition).toHaveBeenCalledWith(route);
    expect(checkedFields()).toEqual(['email', 'email', 'items.0.name']);
    expect(inertia.validator.setTimeout.mock.calls).toEqual([[500]]);
});

test('changing a list checks the list, not the fields of the row it added', async () => {
    render(<OrderForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Add item' }));

    expect(checkedFields()).toEqual(['items']);
});

test('a precognitive field that became valid loses its error', async () => {
    render(<OrderForm />);

    serverErrors({ email: 'Bad' });
    await waitFor(() => expect(errorUnder('Email')).toBe('Bad'));

    serverErrors({});

    await waitFor(() => expect(errorUnder('Email')).toBeNull());
});

test('changing a list on a submit-only form clears the errors of its rows', async () => {
    render(<OrderForm precognitive={false} />);

    serverErrors({ 'items.0.name': 'Name is required', email: 'Bad' });
    await waitFor(() => expect(errorUnder('Item 1')).toBe('Name is required'));

    await userEvent.click(
        screen.getByRole('button', { name: 'Remove first item' }),
    );

    expect(inertia.clearErrors).toHaveBeenCalledWith('items.0.name');
    expect(errorUnder('Email')).toBe('Bad');
    expect(alertText()).toBeNull();
});

test('submitting sends the form through Inertia and keeps the scroll', async () => {
    render(<OrderForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'a');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(inertia.submit).toHaveBeenCalledTimes(1));

    const [submittedRoute, options] = lastSubmit();

    expect(submittedRoute).toBe(route);
    expect(options.preserveScroll).toBe(true);
    expect(inertia.setData).toHaveBeenLastCalledWith({
        token: 'abc',
        email: 'a',
        items: [{ name: '' }],
    });
});

test('a failed submit scrolls to the first field with an error, in form order', async () => {
    render(<OrderForm />);
    const scrollToField = vi.spyOn(hook().formProps.form, 'scrollToField');

    void submitForm();
    serverRejects({ 'items.0.name': 'Name is required', email: 'Bad' });

    expect(scrollToField).toHaveBeenCalledWith(['email']);
});

test('a failed submit with errors for no field scrolls to the top of the form, where the Alert is', () => {
    render(<OrderForm />);
    const scrollToField = vi.spyOn(hook().formProps.form, 'scrollToField');

    void submitForm();
    serverRejects({ token: 'Invalid token' });

    expect(scrollToField).toHaveBeenCalledWith(['email'], { block: 'center' });
});

test('onFinish resolves true after a successful submit, false after a failed one', async () => {
    render(<OrderForm />);

    const succeeded = submitForm();
    serverAccepts();

    const failed = submitForm();
    serverRejects({ email: 'Bad' });

    await expect(succeeded).resolves.toBe(true);
    await expect(failed).resolves.toBe(false);
});

test('a successful submit empties the fields named in resetOnSuccess and calls onSuccess', async () => {
    const onSuccess = vi.fn();
    render(<OrderForm resetOnSuccess={['email']} onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Email'), 'a');
    void submitForm();
    serverAccepts();

    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
    expect(inertia.reset).toHaveBeenCalledWith('email');
    expect(onSuccess).toHaveBeenCalledTimes(1);
});

test('validateFields checks the named fields on the server and resolves whether they passed', async () => {
    render(<OrderForm />);

    const passed = hook().validateFields(['email']);
    const [config] = inertia.validate.mock.lastCall as [ValidationConfig];
    expect(config.only).toEqual(['email']);
    act(() => {
        config.onSuccess?.();
        config.onFinish?.();
    });

    const failed = hook().validateFields(['items.0.name']);
    const [failing] = inertia.validate.mock.lastCall as [ValidationConfig];
    act(() => {
        failing.onValidationError?.();
        failing.onFinish?.();
    });

    await expect(passed).resolves.toBe(true);
    await expect(failed).resolves.toBe(false);
});

test('validateFields on a submit-only form passes at once, since only the submit is checked', async () => {
    render(<OrderForm precognitive={false} />);

    await expect(hook().validateFields(['email'])).resolves.toBe(true);
    expect(inertia.validate).not.toHaveBeenCalled();
});

test('validateFields resolves false when the check ends with no verdict, as on a network error', async () => {
    render(<OrderForm />);

    const result = hook().validateFields(['email']);
    const [config] = inertia.validate.mock.lastCall as [ValidationConfig];
    act(() => config.onFinish?.());

    await expect(result).resolves.toBe(false);
});

test('a step check that a keystroke replaces within the debounce window resolves false', async () => {
    render(<OrderForm />);

    // The debounce holds the step check back: a check went out just before.
    const passed = hook().validateFields(['email']);
    await userEvent.type(screen.getByLabelText('Email'), 'a');

    // It sends only the latest call, the keystroke's, and the step check's
    // callbacks never run.
    const [, keystroke] = inertia.validate.mock.lastCall as [
        string,
        ValidationConfig?,
    ];
    act(() => {
        keystroke?.onStart?.();
        keystroke?.onSuccess?.();
        keystroke?.onFinish?.();
    });

    await expect(settled(passed)).resolves.toBe(false);
});

test('a step check held back behind a keystroke’s check keeps its verdict', async () => {
    render(<OrderForm />);

    // The keystroke's check goes out at once, and the step check waits.
    await userEvent.type(screen.getByLabelText('Email'), 'a');
    const [, keystroke] = inertia.validate.mock.lastCall as [
        string,
        ValidationConfig?,
    ];
    act(() => keystroke?.onStart?.());
    const passed = hook().validateFields(['email']);
    const [step] = inertia.validate.mock.lastCall as [ValidationConfig];

    // The keystroke's answer comes back, then the step check is sent.
    act(() => {
        keystroke?.onSuccess?.();
        keystroke?.onFinish?.();
        step.onStart?.();
        step.onSuccess?.();
        step.onFinish?.();
    });

    await expect(passed).resolves.toBe(true);
});
