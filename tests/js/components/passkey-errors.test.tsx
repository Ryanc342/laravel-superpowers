import { act, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import PasskeyRegistration from '@/components/passkey-register';
import PasskeyVerify from '@/components/passkey-verify';

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

test.each([
    ['signing in', () => <PasskeyVerify />],
    ['adding a passkey', () => <PasskeyRegistration onSuccess={vi.fn()} />],
])('a failed passkey prompt while %s is a toast', (_, component) => {
    passkeys.error = 'The passkey prompt was cancelled.';
    render(component());

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
