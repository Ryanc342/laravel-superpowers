import {
    ProForm,
    ProFormDatePicker,
    ProFormDateTimePicker,
    ProFormList,
    ProFormText,
} from '@ant-design/pro-components';
import type {
    DrawerFormProps,
    ModalFormProps,
    ProFormProps,
    StepFormProps,
} from '@ant-design/pro-components';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert, Button, DatePicker, Form, Input, TimePicker } from 'antd';
import type { FormProps } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
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
    setErrors: (() => {}) as Dispatch<SetStateAction<Errors>>,
    initialData: undefined as unknown,
    setData: vi.fn(),
    clearErrors: vi.fn(),
    reset: vi.fn(),
    submit: vi.fn(),
    validate: vi.fn(),
    validator: { setTimeout: vi.fn() },
    withPrecognition: vi.fn(),
};

function useFakeForm(initialData: unknown) {
    const [errors, setErrors] = useState<Errors>({});

    useEffect(() => {
        inertia.setErrors = setErrors;
        inertia.initialData = initialData;
    }, [initialData]);

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
    useForm: (initialData: unknown) => useFakeForm(initialData),
}));

type Order = {
    token: string;
    email: string;
    ordered_at: Dayjs | null;
    items: { name: string }[];
};

const route: RouteDefinition<'post'> = { url: '/orders', method: 'post' };

/** `token` has no field, like a reset link's token: it is sent all the same. */
const initialValues: Order = {
    token: 'abc',
    email: '',
    ordered_at: dayjs('2026-11-01'),
    items: [{ name: '' }],
};

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
    inertia.initialData = undefined;
    rendered.hook = undefined;
});

afterEach(() => {
    vi.restoreAllMocks();
});

/** The order form a page would build: an email, a list of items, an Alert for errors with no field. */
function OrderForm({
    values = initialValues,
    precognitive,
    resetOnSuccess,
    onSuccess,
}: {
    values?: Order;
    precognitive?: boolean;
    resetOnSuccess?: (keyof Order)[];
    onSuccess?: () => void;
}) {
    const form = useInertiaForm(route, values, {
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
            <Form.Item name="ordered_at" label="Ordered at">
                <DatePicker />
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

/** A check's answer, which Precognition merges into the errors it has. */
function serverAddsErrors(errors: Errors): void {
    act(() => inertia.setErrors((current) => ({ ...current, ...errors })));
}

/** The order form on a Pro form: a date, a date-time and a ProFormList. */
type Delivery = {
    customer: string;
    ordered_on: Dayjs | null;
    delivered_at: Dayjs | null;
    items: { name: string }[];
};

function ProDeliveryForm() {
    const form = useInertiaForm<Delivery>(route, {
        customer: '',
        ordered_on: dayjs('2026-11-01'),
        delivered_at: dayjs('2026-11-01 09:30:00'),
        items: [{ name: '' }],
    });

    return (
        <ProForm {...form.formProps}>
            <ProFormText name="customer" label="Customer" />
            <ProFormDatePicker name="ordered_on" label="Ordered on" />
            <ProFormDateTimePicker name="delivered_at" label="Delivered at" />
            <ProFormList
                name="items"
                creatorButtonProps={{ creatorButtonText: 'Add row' }}
            >
                <ProFormText name="name" label="Name" />
            </ProFormList>
        </ProForm>
    );
}

/** Plain antd pickers with a time, which name their formats in `dateFormats`. */
type Schedule = {
    note: string;
    starts_at: Dayjs | null;
    window: [Dayjs, Dayjs] | null;
    items: { at: Dayjs | null }[];
};

function ScheduleForm() {
    const form = useInertiaForm<Schedule>(
        route,
        {
            note: '',
            starts_at: dayjs('2026-11-01 09:30:00'),
            window: [dayjs('2026-11-01 08:00'), dayjs('2026-11-02 17:00')],
            items: [{ at: dayjs('2026-11-01 14:45:00') }],
        },
        {
            dateFormats: {
                starts_at: 'YYYY-MM-DD HH:mm:ss',
                window: 'YYYY-MM-DD HH:mm',
                'items.*.at': 'HH:mm:ss',
            },
        },
    );

    return (
        <Form {...form.formProps}>
            <Form.Item name="note" label="Note">
                <Input />
            </Form.Item>
            <Form.Item name="starts_at" label="Starts at">
                <DatePicker showTime />
            </Form.Item>
            <Form.Item name="window" label="Window">
                <DatePicker.RangePicker showTime />
            </Form.Item>
            <Form.List name="items">
                {(fields) =>
                    fields.map((field) => (
                        <Form.Item
                            key={field.key}
                            name={[field.name, 'at']}
                            label={`At ${field.name + 1}`}
                        >
                            <TimePicker />
                        </Form.Item>
                    ))
                }
            </Form.List>
            <Button htmlType="submit">Save</Button>
        </Form>
    );
}

/** A Pro form with a `transform` field, a plain antd picker and an object value. */
type Ticket = {
    code: string;
    plain_on: Dayjs | null;
    address: { street: string; city: string; zip: string | null };
};

function AddressInput({ value }: { value?: Ticket['address'] }) {
    return <span>{value?.city}</span>;
}

function ProTicketForm() {
    const form = useInertiaForm<Ticket>(route, {
        code: 'a',
        plain_on: dayjs('2026-11-01'),
        address: { street: '', city: 'Hangzhou', zip: null },
    });

    return (
        <ProForm {...form.formProps}>
            <ProFormText
                name="code"
                label="Code"
                transform={(value: string) => value.trim()}
            />
            <ProForm.Item name="plain_on" label="Plain on">
                <DatePicker />
            </ProForm.Item>
            <ProForm.Item name="address" label="Address">
                <AddressInput />
            </ProForm.Item>
        </ProForm>
    );
}

/** Picks 15 November 2026 in the date picker with this label. Pro loads its pickers lazily. */
async function pickNovember15(label: string): Promise<void> {
    await userEvent.click(
        await screen.findByLabelText(label, undefined, { timeout: 4000 }),
    );

    const cell = await waitFor(() => {
        const found = document.querySelector(
            '.ant-picker-cell-in-view[title="2026-11-15"] .ant-picker-cell-inner',
        );

        if (!(found instanceof HTMLElement)) {
            throw new Error('The calendar is not open.');
        }

        return found;
    });

    await userEvent.click(cell);
}

/** The data the form last handed to Inertia. */
function lastData(): Record<string, unknown> {
    return inertia.setData.mock.lastCall?.[0] as Record<string, unknown>;
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

test.each([
    ['antd Form', () => <OrderForm />],
    ['ProForm', () => <ProDeliveryForm />],
])(
    'the %s turns off the browser checks, so only the server validates',
    (_, form) => {
        const { container } = render(form());

        expect(
            container.querySelector('form')?.hasAttribute('novalidate'),
        ).toBe(true);
    },
);

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
        ordered_at: '2026-11-01',
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
        ordered_at: '2026-11-01',
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

    // The emptied field is not taken for a change the user made.
    inertia.validate.mockClear();
    await userEvent.type(screen.getByLabelText('Item 1'), 'b');

    expect(checkedFields()).toEqual(['items.0.name']);
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

test('on a Pro form, adding a row checks the list', async () => {
    render(<ProDeliveryForm />);

    await userEvent.click(screen.getByRole('button', { name: /Add row/ }));

    expect(checkedFields()).toEqual(['items']);
});

test('on a Pro form, picking a date checks the date field', async () => {
    render(<ProDeliveryForm />);

    await pickNovember15('Ordered on');

    expect(checkedFields()).toEqual(['ordered_on']);
});

test('a DatePicker value reaches Inertia as its calendar date, for the check and the submit', async () => {
    render(<OrderForm />);

    expect(inertia.initialData).toMatchObject({ ordered_at: '2026-11-01' });

    await pickNovember15('Ordered at');

    expect(checkedFields()).toEqual(['ordered_at']);
    expect(lastData()).toMatchObject({ ordered_at: '2026-11-15' });

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(inertia.submit).toHaveBeenCalledTimes(1));

    expect(lastData()).toEqual({
        token: 'abc',
        email: '',
        ordered_at: '2026-11-15',
        items: [{ name: '' }],
    });
});

test('a Pro date field keeps the format Pro gives it, for the check and the submit', async () => {
    render(<ProDeliveryForm />);

    await pickNovember15('Delivered at');
    await userEvent.click(screen.getByRole('button', { name: /OK|确\s?定/ }));

    expect(lastData()).toMatchObject({
        ordered_on: '2026-11-01',
        delivered_at: '2026-11-15 09:30:00',
    });

    await userEvent.click(
        screen.getByRole('button', { name: /Submit|提\s?交/ }),
    );
    await waitFor(() => expect(inertia.submit).toHaveBeenCalledTimes(1));

    expect(lastData()).toMatchObject({
        ordered_on: '2026-11-01',
        delivered_at: '2026-11-15 09:30:00',
    });
});

test('removing a row on a precognitive form clears the errors of the rows, which no longer match them', async () => {
    render(
        <OrderForm
            values={{ ...initialValues, items: [{ name: '' }, { name: '' }] }}
        />,
    );

    serverErrors({
        'items.0.name': 'Row A required',
        'items.1.name': 'Row B required',
    });
    await waitFor(() => expect(errorUnder('Item 2')).toBe('Row B required'));

    await userEvent.click(
        screen.getByRole('button', { name: 'Remove first item' }),
    );

    expect(checkedFields()).toEqual(['items']);
    expect(inertia.clearErrors).toHaveBeenCalledWith(
        'items.0.name',
        'items.1.name',
    );

    // A later answer is merged into the errors Precognition still has.
    serverAddsErrors({ email: 'Bad' });

    await waitFor(() => expect(errorUnder('Email')).toBe('Bad'));
    await waitFor(() => expect(errorUnder('Item 1')).toBeNull());
    expect(alertText()).toBeNull();
});

test('a plain antd picker with a time sends the format dateFormats names, a row path and both ends of a range too', async () => {
    render(<ScheduleForm />);

    const expected = {
        note: 'x',
        starts_at: '2026-11-01 09:30:00',
        window: ['2026-11-01 08:00', '2026-11-02 17:00'],
        items: [{ at: '14:45:00' }],
    };

    expect(inertia.initialData).toEqual({ ...expected, note: '' });

    await userEvent.type(screen.getByLabelText('Note'), 'x');

    expect(lastData()).toEqual(expected);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(inertia.submit).toHaveBeenCalledTimes(1));

    expect(lastData()).toEqual(expected);
});

test('a Pro form with a transform field and a plain picker keeps working, and sends what its fields hold', async () => {
    render(<ProTicketForm />);

    await userEvent.type(screen.getByLabelText('Code'), 'b');

    const expected = {
        code: 'ab',
        plain_on: '2026-11-01',
        address: { street: '', city: 'Hangzhou', zip: null },
    };

    expect(lastData()).toEqual(expected);

    await userEvent.click(
        screen.getByRole('button', { name: /Submit|提\s?交/ }),
    );
    await waitFor(() => expect(inertia.submit).toHaveBeenCalledTimes(1));

    expect(lastData()).toEqual(expected);
});
