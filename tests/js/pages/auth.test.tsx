import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import ConfirmPassword from '@/pages/auth/confirm-password';
import ForgotPassword from '@/pages/auth/forgot-password';
import Login from '@/pages/auth/login';
import Register from '@/pages/auth/register';
import ResetPassword from '@/pages/auth/reset-password';
import TwoFactorChallenge from '@/pages/auth/two-factor-challenge';
import VerifyEmail from '@/pages/auth/verify-email';

const inertia = vi.hoisted(() => ({
    page: { props: {} as Record<string, unknown> },
}));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    usePage: () => inertia.page,
    Head: () => null,
}));
vi.mock('@laravel/passkeys/react', () => ({
    usePasskeyVerify: () => ({
        verify: vi.fn(),
        isLoading: false,
        isSupported: true,
    }),
}));

const everyFeatureOn = {
    registration: true,
    resetPasswords: true,
    emailVerification: true,
    twoFactorAuthentication: true,
    passkeys: true,
};

beforeEach(() => {
    inertia.page.props = { features: everyFeatureOn };
});

afterEach(() => {
    vi.restoreAllMocks();
});

function withFeatureOff(feature: keyof typeof everyFeatureOn): void {
    inertia.page.props = {
        features: { ...everyFeatureOn, [feature]: false },
    };
}

test('the login page offers sign-up, a password reset and a passkey while those features are on', () => {
    render(<Login />);

    expect(screen.getByText('Sign up')).toBeTruthy();
    expect(screen.getByText('Forgot password?')).toBeTruthy();
    expect(screen.getByText('Sign in with a passkey')).toBeTruthy();
});

test('registration off removes every sign-up link from the login page', () => {
    withFeatureOff('registration');
    render(<Login />);

    expect(screen.queryByText('Sign up')).toBeNull();
    expect(screen.queryByText("Don't have an account?")).toBeNull();
    expect(screen.getByText('Forgot password?')).toBeTruthy();
});

test('password reset off removes the forgot password link from the login page', () => {
    withFeatureOff('resetPasswords');
    render(<Login />);

    expect(screen.queryByText('Forgot password?')).toBeNull();
    expect(screen.getByText('Sign up')).toBeTruthy();
});

test('passkeys off removes the passkey button from the login and confirmation pages', () => {
    withFeatureOff('passkeys');

    render(
        <>
            <Login />
            <ConfirmPassword />
        </>,
    );

    expect(screen.queryByText('Sign in with a passkey')).toBeNull();
    expect(screen.queryByText('Confirm with passkey')).toBeNull();
});

test('a status from the server is a success alert above the form, and it stays', () => {
    render(<Login status="Your password has been reset." />);

    const alert = screen.getByRole('alert');
    const form = screen.getByRole('button', { name: 'Log in' }).closest('form');

    expect(alert.textContent).toContain('Your password has been reset.');
    expect(alert.className).toContain('ant-alert-success');
    expect(
        alert.compareDocumentPosition(form as HTMLFormElement) &
            Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByLabelText('Close')).toBeNull();
});

test('the verification notice names a sent link, and shows nothing for another status', () => {
    const { unmount } = render(<VerifyEmail status="verification-link-sent" />);

    expect(screen.getByRole('alert').textContent).toContain(
        'A new verification link has been sent',
    );

    unmount();
    render(<VerifyEmail status="something-else" />);

    expect(screen.queryByRole('alert')).toBeNull();
});

/**
 * Fortify validates inside its actions, which Precognition cannot reach, so a
 * Fortify form is checked when it is submitted: typing in it sends nothing.
 */
test.each<[string, () => ReactElement, string]>([
    ['login', () => <Login />, 'Email address'],
    ['register', () => <Register passwordRules="" />, 'Name'],
    ['forgot password', () => <ForgotPassword />, 'Email address'],
    [
        'reset password',
        () => <ResetPassword token="abc" email="a@b.test" passwordRules="" />,
        'Password',
    ],
    ['confirm password', () => <ConfirmPassword />, 'Password'],
])(
    'typing in the %s form sends no request before it is submitted',
    async (_, page, label) => {
        const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open');
        const fetch = vi.spyOn(globalThis, 'fetch');

        render(page());
        await userEvent.type(screen.getAllByLabelText(label)[0], 'abc');
        await new Promise((resolve) => setTimeout(resolve, 600));

        expect(xhr).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    },
);

test('the two-factor challenge swaps the authentication code for a recovery code and back', async () => {
    render(<TwoFactorChallenge />);

    expect(screen.getAllByRole('textbox')).toHaveLength(6);

    await userEvent.click(screen.getByText('Use a recovery code'));

    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(1));
    expect(screen.getByLabelText('Recovery code')).toBeTruthy();

    await userEvent.click(screen.getByText('Use an authentication code'));

    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(6));
});
