import { render, screen } from '@testing-library/react';
import { expect, test } from 'vite-plus/test';
import FormField from '@/components/shared/form-field';
import PasswordField from '@/components/shared/password-field';
import SelectField from '@/components/shared/select-field';
import TextField from '@/components/shared/text-field';
import { TooltipProvider } from '@/components/ui/tooltip';

function Name({ error }: { error?: string }) {
    return (
        <>
            <TextField
                id="name"
                label="Name"
                aria-describedby="help"
                error={error}
            />
            <p id="help">Help</p>
        </>
    );
}

test("a field's error is tied to it next to its own description, and the link goes when the error is corrected", () => {
    const { rerender } = render(<Name error="Enter a name." />);
    const field = screen.getByLabelText('Name');
    const message = screen.getByText('Enter a name.');

    expect(message.id).not.toBe('');
    expect(field.getAttribute('aria-describedby')).toBe(`help ${message.id}`);
    expect(field.getAttribute('aria-invalid')).toBe('true');

    rerender(<Name />);

    expect(field.getAttribute('aria-describedby')).toBe('help');
    expect(field.hasAttribute('aria-invalid')).toBe(false);
});

function Fields({ withErrors }: { withErrors: boolean }) {
    return (
        <TooltipProvider>
            <PasswordField
                id="password"
                label="Password"
                error={withErrors ? 'Enter your password.' : undefined}
            />
            <SelectField
                id="country"
                label="Country"
                options={[{ value: 'nz', label: 'New Zealand' }]}
                error={withErrors ? 'Choose a country.' : undefined}
            />
            <FormField
                label="File"
                htmlFor="file"
                error={withErrors ? 'Choose a file.' : undefined}
            >
                <input id="file" type="file" aria-describedby="hint" />
            </FormField>
            <p id="hint">A CSV file.</p>
        </TooltipProvider>
    );
}

test('a password, a choice from a list and a control without a box are tied to their errors, and let go of them when corrected', () => {
    const { rerender } = render(<Fields withErrors />);
    const cases: [string, string, string | null][] = [
        ['Password', 'Enter your password.', null],
        ['Country', 'Choose a country.', null],
        ['File', 'Choose a file.', 'hint'],
    ];

    for (const [label, message, ownDescription] of cases) {
        const control = screen.getByLabelText(label);
        const errorId = screen.getByText(message).id;

        expect(errorId).not.toBe('');
        expect(control.getAttribute('aria-describedby')).toBe(
            ownDescription ? `${ownDescription} ${errorId}` : errorId,
        );
        expect(control.getAttribute('aria-invalid')).toBe('true');
    }

    rerender(<Fields withErrors={false} />);

    for (const [label, , ownDescription] of cases) {
        const control = screen.getByLabelText(label);

        expect(control.getAttribute('aria-describedby')).toBe(ownDescription);
        expect(control.hasAttribute('aria-invalid')).toBe(false);
    }
});
