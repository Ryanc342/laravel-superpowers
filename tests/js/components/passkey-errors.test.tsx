import { act, render, screen } from '@testing-library/react';
import { App } from 'antd';
import { toast } from 'sonner';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import PasskeySignIn from '@/components/auth/passkey-sign-in';
import PasskeyRegistration from '@/components/passkey-register';

type HookOptions = { onError?: (error: Error) => void };

const passkeys = vi.hoisted(() => ({
    options: undefined as HookOptions | undefined,
    error: null as string | null,
}));

function fakeHook(options?: HookOptions) {
    passkeys.options = options;

    return {
        verify: vi.fn(),
        register: vi.fn(),
        isLoading: false,
        error: passkeys.error,
        errorInstance: null,
        isSupported: true,
    };
}

vi.mock('@laravel/passkeys/react', () => ({
    usePasskeyVerify: fakeHook,
    usePasskeyRegister: fakeHook,
}));
vi.mock('@inertiajs/react', () => ({ router: { visit: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

afterEach(() => {
    vi.mocked(toast.error).mockClear();
    passkeys.options = undefined;
    passkeys.error = null;
});

test('a failed passkey prompt while signing in is an antd message, not text in the page', async () => {
    passkeys.error = 'The passkey prompt was cancelled.';
    const { container } = render(
        <App>
            <PasskeySignIn />
        </App>,
    );

    act(() => {
        passkeys.options?.onError?.(
            new Error('The passkey prompt was cancelled.'),
        );
    });

    const shown = await screen.findByText('The passkey prompt was cancelled.');

    expect(shown.closest('.ant-message')).not.toBeNull();
    expect(container.contains(shown)).toBe(false);
});

test('a failed passkey prompt while adding a passkey is a toast', () => {
    passkeys.error = 'The passkey prompt was cancelled.';
    render(<PasskeyRegistration onSuccess={vi.fn()} />);

    act(() => {
        passkeys.options?.onError?.(
            new Error('The passkey prompt was cancelled.'),
        );
    });

    expect(toast.error).toHaveBeenCalledWith(
        'The passkey prompt was cancelled.',
    );
    expect(screen.queryByText('The passkey prompt was cancelled.')).toBeNull();
});
