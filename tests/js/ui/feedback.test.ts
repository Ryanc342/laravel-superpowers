import { renderHook, screen } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { setLanguage } from '@/lib/i18n';
import {
    flashToMessage,
    useFlashFeedback,
    useNetworkErrorFeedback,
} from '@/ui/feedback';

afterEach(() => {
    vi.restoreAllMocks();
    setLanguage('en', []);
});

/** antd's `App` API, as spies, for a test that is about listening and not about what antd shows. */
function spyOnApp() {
    const api = {
        message: { success: vi.fn() },
        notification: { error: vi.fn() },
    };

    vi.spyOn(App, 'useApp').mockReturnValue(
        api as unknown as ReturnType<typeof App.useApp>,
    );

    return api;
}

/** What Inertia fires when a visit's response carries flash data. */
function flash(data: unknown): void {
    document.dispatchEvent(
        new CustomEvent('inertia:flash', { detail: { flash: data } }),
    );
}

/** What Inertia fires when a request cannot reach the server. */
function failRequest(): void {
    document.dispatchEvent(
        new CustomEvent('inertia:networkError', {
            cancelable: true,
            detail: { error: new Error('offline') },
        }),
    );
}

test('a success toast becomes a success message', () => {
    expect(
        flashToMessage({
            toast: { type: 'success', message: 'Profile updated.' },
        }),
    ).toEqual({ type: 'success', content: 'Profile updated.' });
});

test.each(['success', 'error', 'info', 'warning'])(
    'a %s toast keeps its type',
    (type) => {
        expect(flashToMessage({ toast: { type, message: 'Text' } })?.type).toBe(
            type,
        );
    },
);

test.each([
    ['no flash', undefined],
    ['a flash without a toast', { other: 'value' }],
    ['an unknown type', { toast: { type: 'loading', message: 'Text' } }],
    ['no message', { toast: { type: 'success' } }],
    ['a message that is not text', { toast: { type: 'info', message: 7 } }],
])('%s is not shown', (_name, data) => {
    expect(flashToMessage(data)).toBeNull();
});

test("the server's flashed toast shows as an antd message of its type", async () => {
    renderHook(() => useFlashFeedback(), { wrapper: App });

    flash({ toast: { type: 'error', message: 'Too many attempts.' } });

    const text = await screen.findByText('Too many attempts.');

    expect(text.closest('.ant-message-notice')?.innerHTML).toContain(
        'anticon-close-circle',
    );
});

test('a flash without a toast shows nothing', () => {
    renderHook(() => useFlashFeedback(), { wrapper: App });

    flash({ other: 'value' });

    expect(document.querySelector('.ant-message-notice')).toBeNull();
});

test('a flash after the layout that listened is gone shows nothing', () => {
    const { message } = spyOnApp();
    const { unmount } = renderHook(() => useFlashFeedback());

    flash({ toast: { type: 'success', message: 'Profile updated.' } });
    expect(message.success).toHaveBeenCalledWith('Profile updated.');

    unmount();
    flash({ toast: { type: 'success', message: 'Profile updated.' } });

    expect(message.success).toHaveBeenCalledTimes(1);
});

test('a request that cannot reach the server shows a translated network notification', async () => {
    setLanguage('zh_CN', {
        'Network error': '网络错误',
        'Check your connection and try again': '请检查网络连接后重试',
    });
    renderHook(() => useNetworkErrorFeedback(), { wrapper: App });

    failRequest();

    expect(await screen.findByText('网络错误')).toBeTruthy();
    expect(screen.getByText('请检查网络连接后重试')).toBeTruthy();
});

test('several failures share one notification', async () => {
    renderHook(() => useNetworkErrorFeedback(), { wrapper: App });

    failRequest();
    failRequest();
    await screen.findByText('Network error');

    expect(screen.getAllByText('Network error')).toHaveLength(1);
});

test('a failure after the layout that listened is gone shows nothing', () => {
    const { notification } = spyOnApp();
    const { unmount } = renderHook(() => useNetworkErrorFeedback());

    failRequest();
    expect(notification.error).toHaveBeenCalledTimes(1);

    unmount();
    failRequest();

    expect(notification.error).toHaveBeenCalledTimes(1);
});
