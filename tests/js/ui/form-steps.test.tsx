import { ProFormText, StepsForm } from '@ant-design/pro-components';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert } from 'antd';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { useInertiaStepsForm } from '@/ui/form';
import type { RouteDefinition } from '@/wayfinder';

/*
 * `useInertiaStepsForm`: Pro's StepsForm over one Inertia form. Next checks
 * the shown step's fields on the server, the StepsForm's last step sends
 * every step's values, and a refused send goes back to the step with the
 * error.
 */

type Errors = Record<string, string>;

type VisitOptions = {
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

/** A stand-in for Inertia's `useForm`, as in form.test.tsx: the test plays the server. */
const inertia = {
    setErrors: (() => {}) as Dispatch<SetStateAction<Errors>>,
    setData: vi.fn(),
    submit: vi.fn(),
    validate: vi.fn(),
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
        reset: vi.fn(),
        submit: inertia.submit,
        validate: inertia.validate,
        validator: () => ({ setTimeout: vi.fn() }),
        clearErrors: vi.fn(),
        withPrecognition: () => form,
    };

    return form;
}

vi.mock('@inertiajs/react', () => ({
    useForm: () => useFakeForm(),
}));

type Supplier = { company: string; contact: string };

const route: RouteDefinition<'post'> = { url: '/suppliers', method: 'post' };

type SupplierStepsForm = ReturnType<typeof useInertiaStepsForm<Supplier>>;

/** Three steps: the company, the contact, and a summary with nothing to check. */
function SupplierStepForms({ supplier }: { supplier: SupplierStepsForm }) {
    return (
        <StepsForm<Supplier> {...supplier.stepsFormProps}>
            <StepsForm.StepForm
                name="company"
                title="Company step"
                {...supplier.stepFormProps}
            >
                <ProFormText name="company" label="Company" />
            </StepsForm.StepForm>
            <StepsForm.StepForm
                name="contact"
                title="Contact step"
                {...supplier.stepFormProps}
            >
                <ProFormText name="contact" label="Contact" />
            </StepsForm.StepForm>
            <StepsForm.StepForm
                name="confirm"
                title="Confirm step"
                {...supplier.stepFormProps}
            >
                Check the supplier, then send it.
            </StepsForm.StepForm>
        </StepsForm>
    );
}

function SupplierSteps({
    steps = [['company'], ['contact'], []],
}: {
    steps?: string[][];
}) {
    const supplier = useInertiaStepsForm<Supplier>(
        route,
        { company: '', contact: '' },
        steps,
    );

    return (
        <>
            {supplier.unplacedErrors.length > 0 && (
                <Alert type="error" title={supplier.unplacedErrors.join(' ')} />
            )}
            <SupplierStepForms supplier={supplier} />
        </>
    );
}

/** The same steps behind a button, as in a dialog: the StepsForm renders after the hook first ran. */
function SupplierStepsLater({ steps }: { steps: string[][] }) {
    const [open, setOpen] = useState(false);
    const supplier = useInertiaStepsForm<Supplier>(
        route,
        { company: '', contact: '' },
        steps,
    );

    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                Add a supplier
            </button>
            {open && <SupplierStepForms supplier={supplier} />}
        </>
    );
}

beforeEach(() => {
    inertia.setData = vi.fn();
    inertia.submit = vi.fn();
    inertia.validate = vi.fn();
});

afterEach(() => {
    vi.restoreAllMocks();
});

/** The labels of the fields in the step that shows. */
function shownFields(): string[] {
    return [
        ...document.querySelectorAll(
            '.ant-pro-steps-form-step-active .ant-form-item-label label',
        ),
    ].map((label) => label.textContent ?? '');
}

/** The error under the field with this label, or null. */
function errorUnder(label: string): string | null {
    const item = screen.getByLabelText(label).closest('.ant-form-item');

    return (
        item?.querySelector('.ant-form-item-explain-error')?.textContent ?? null
    );
}

/** The step checks sent to the server: the ones with `only`, not a keystroke's. */
function stepChecks(): ValidationConfig[] {
    return inertia.validate.mock.calls
        .map(([config]) => config as unknown)
        .filter(
            (config): config is ValidationConfig =>
                typeof config === 'object' && config !== null,
        );
}

/** Presses Next, or the last step's send button, which Pro labels in Chinese by default. */
async function press(button: 'next' | 'send'): Promise<void> {
    const name = button === 'next' ? /下一步|Next/ : /提\s?交|Submit/;

    await userEvent.click(screen.getByRole('button', { name }));
}

/** The server answers the last step check: the fields pass, or not. */
function stepCheckAnswers(passed: boolean): void {
    const check = stepChecks().at(-1);

    act(() => {
        check?.onStart?.();

        if (passed) {
            check?.onSuccess?.();
        } else {
            check?.onValidationError?.();
        }

        check?.onFinish?.();
    });
}

/** Fills in each step and passes its check, up to the summary. */
async function reachTheSummary(): Promise<void> {
    await userEvent.type(screen.getByLabelText('Company'), 'Acme Ltd');
    await press('next');
    await waitFor(() => expect(stepChecks()).toHaveLength(1));
    stepCheckAnswers(true);
    await waitFor(() => expect(shownFields()).toEqual(['Contact']));

    await userEvent.type(screen.getByLabelText('Contact'), 'Wang Fang');
    await press('next');
    await waitFor(() => expect(stepChecks()).toHaveLength(2));
    stepCheckAnswers(true);
    await waitFor(() => expect(shownFields()).toEqual([]));
}

/** The server refuses the send with these errors, which Inertia has set first. */
function serverRefuses(errors: Errors): void {
    const [, options] = inertia.submit.mock.lastCall as [unknown, VisitOptions];

    act(() => {
        inertia.setErrors(errors);
        options.onError?.(errors);
        options.onFinish?.();
    });
}

test('Next checks only the fields of the step that shows, and moves on once they pass', async () => {
    render(<SupplierSteps />);

    await press('next');
    await waitFor(() => expect(stepChecks()).toHaveLength(1));
    expect(stepChecks()[0].only).toEqual(['company']);

    stepCheckAnswers(false);
    await waitFor(() =>
        expect(document.querySelector('.ant-btn-loading')).toBeNull(),
    );
    expect(shownFields()).toEqual(['Company']);

    await press('next');
    await waitFor(() => expect(stepChecks()).toHaveLength(2));
    stepCheckAnswers(true);

    await waitFor(() => expect(shownFields()).toEqual(['Contact']));
});

test('a step with nothing to check moves on without asking the server', async () => {
    render(<SupplierSteps steps={[[], ['contact'], []]} />);

    await press('next');

    await waitFor(() => expect(shownFields()).toEqual(['Contact']));
    expect(stepChecks()).toEqual([]);
});

test('the last step sends what every step holds', async () => {
    render(<SupplierSteps />);
    await reachTheSummary();

    await press('send');

    await waitFor(() => expect(inertia.submit).toHaveBeenCalledOnce());
    expect(inertia.submit.mock.lastCall?.[0]).toBe(route);
    expect(inertia.setData.mock.lastCall?.[0]).toEqual({
        company: 'Acme Ltd',
        contact: 'Wang Fang',
    });
});

test('a refused send goes back to the first step with an error, where it shows under its field', async () => {
    render(<SupplierSteps />);
    await reachTheSummary();
    await press('send');
    await waitFor(() => expect(inertia.submit).toHaveBeenCalledOnce());

    serverRefuses({
        company: 'This company is a supplier already.',
        contact: 'The contact has left.',
    });

    await waitFor(() => expect(shownFields()).toEqual(['Company']));
    await waitFor(() =>
        expect(errorUnder('Company')).toBe(
            'This company is a supplier already.',
        ),
    );
});

test('an error for a field of no step stays on the last step, in the Alert', async () => {
    render(<SupplierSteps />);
    await reachTheSummary();
    await press('send');
    await waitFor(() => expect(inertia.submit).toHaveBeenCalledOnce());

    serverRefuses({ token: 'The page expired.' });

    await waitFor(() =>
        expect(document.querySelector('.ant-alert')?.textContent).toBe(
            'The page expired.',
        ),
    );
    expect(shownFields()).toEqual([]);
});

test('the StepsForm decides which step is the last, and a list without an entry for every step is reported', async () => {
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<SupplierSteps steps={[['company'], ['contact']]} />);

    await waitFor(() =>
        expect(reported).toHaveBeenCalledWith(
            expect.stringContaining(
                'the StepsForm has 3 steps, and the list of their fields has 2 entries',
            ),
        ),
    );

    // The summary has no entry, so it has nothing to check, and is still the step that sends.
    await reachTheSummary();
    await press('send');

    await waitFor(() => expect(inertia.submit).toHaveBeenCalledOnce());
});

test('a StepsForm that renders later, as in a dialog, is checked once it has rendered its steps', async () => {
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reports = () =>
        reported.mock.calls.filter(([message]) =>
            String(message).startsWith('useInertiaStepsForm'),
        );
    const opened = async () => {
        await userEvent.click(
            screen.getByRole('button', { name: 'Add a supplier' }),
        );
        await waitFor(() =>
            expect(screen.getByLabelText('Company')).toBeTruthy(),
        );
    };

    const { unmount } = render(
        <SupplierStepsLater steps={[['company'], ['contact'], []]} />,
    );
    await opened();

    expect(reports()).toEqual([]);
    unmount();

    render(<SupplierStepsLater steps={[['company'], ['contact']]} />);

    expect(reports()).toEqual([]);

    await opened();

    await waitFor(() =>
        expect(reports()).toEqual([
            [
                expect.stringContaining(
                    'the StepsForm has 3 steps, and the list of their fields has 2 entries',
                ),
            ],
        ]),
    );
});
