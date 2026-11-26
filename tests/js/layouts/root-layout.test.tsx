import { act, render, screen } from '@testing-library/react';
import { Empty, theme } from 'antd';
import dayjs from 'dayjs';
import { memo } from 'react';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { t } from '@/lib/i18n';
import { useAppearance } from '@/ui/appearance';

const page = vi.hoisted(() => ({
    props: {} as Record<string, unknown>,
}));
const listeners = vi.hoisted(() => new Map<string, (event: Event) => void>());
const subscriptions = vi.hoisted(() => ({ count: 0 }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => page,
    router: {
        on: (name: string, listener: (event: Event) => void) => {
            subscriptions.count++;
            listeners.set(name, listener);

            return () => listeners.delete(name);
        },
    },
}));

// The project's own theme (`theme.ts`) is not this layout's to test: the
// layout gives antd whatever it lists, and these tests read antd's defaults.
vi.mock('@/theme', () => ({ default: {} }));

import RootLayout from '@/layouts/root-layout';

// What antd's Empty says when it has no data: its own text, in the antd locale.
function emptyText(): string | null | undefined {
    return document.querySelector('.ant-empty-description')?.textContent;
}

const chinese = { locale: 'zh_CN', translations: { 'Log in': '登录' } };
const english = { locale: 'en', translations: [] };

// It takes no props and is memoized, like a component that nothing above can
// make render again.
const LogInLabel = memo(function LogInLabel() {
    return <span data-test="label">{t('Log in')}</span>;
});

function layout() {
    return (
        <RootLayout>
            <LogInLabel />
            <Empty />
        </RootLayout>
    );
}

afterEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.classList.remove('dark');
    document.cookie = 'appearance=;path=/;max-age=0';
});

test('a Chinese page gets Chinese sentences, antd text, dates and <html lang>', () => {
    page.props = chinese;
    render(layout());

    expect(screen.getByText('登录')).toBeTruthy();
    expect(emptyText()).toBe('暂无数据');
    expect(dayjs.locale()).toBe('zh-cn');
    expect(document.documentElement.lang).toBe('zh-CN');
});

test('an English page gets English sentences, antd text, dates and <html lang>', () => {
    page.props = english;
    render(layout());

    expect(screen.getByText('Log in')).toBeTruthy();
    expect(emptyText()).toBe('No data');
    expect(dayjs.locale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
});

test('a switch without a page load changes every sentence, even in a component that takes no props', () => {
    page.props = chinese;
    const { rerender } = render(layout());

    page.props = english;
    rerender(layout());

    expect(screen.getByText('Log in')).toBeTruthy();
    expect(emptyText()).toBe('No data');
    expect(document.documentElement.lang).toBe('en');
});

/** The page background antd makes for the theme it is given. */
function Background() {
    const { token } = theme.useToken();

    return <span data-test="background">{token.colorBgContainer}</span>;
}

function background(): string | null | undefined {
    return document.querySelector('[data-test="background"]')?.textContent;
}

function ChooseDark() {
    const { setAppearance } = useAppearance();

    return <button onClick={() => setAppearance('dark')}>Dark</button>;
}

test('a light page gets the light theme and a dark page the dark one', () => {
    page.props = english;
    const { unmount } = render(
        <RootLayout>
            <Background />
        </RootLayout>,
    );

    expect(background()).toBe('#ffffff');

    unmount();
    document.cookie = 'appearance=dark;path=/';
    render(
        <RootLayout>
            <Background />
        </RootLayout>,
    );

    expect(background()).toBe('#141414');
});

test('choosing dark in the page changes antd to the dark theme without a reload', () => {
    page.props = english;
    render(
        <RootLayout>
            <Background />
            <ChooseDark />
        </RootLayout>,
    );

    act(() => screen.getByRole('button', { name: 'Dark' }).click());

    expect(background()).toBe('#141414');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
});

test('a flash from the server shows as an antd message, in the page', async () => {
    page.props = english;
    render(
        <RootLayout>
            <span>Page</span>
        </RootLayout>,
    );

    act(() =>
        listeners.get('flash')?.(
            new CustomEvent('flash', {
                detail: {
                    flash: {
                        toast: { type: 'success', message: 'Profile updated.' },
                    },
                },
            }),
        ),
    );

    expect(await screen.findByText('Profile updated.')).toBeTruthy();
});

test('a failed request shows an antd notification, in the language of the page', async () => {
    page.props = {
        locale: 'zh_CN',
        translations: { 'Network error': '网络错误' },
    };
    render(
        <RootLayout>
            <span>Page</span>
        </RootLayout>,
    );

    act(() => listeners.get('networkError')?.(new CustomEvent('networkError')));

    expect(await screen.findByText('网络错误')).toBeTruthy();
});

test('the listeners are not renewed when the language switches', () => {
    page.props = chinese;
    const { rerender } = render(layout());
    const before = subscriptions.count;

    page.props = english;
    rerender(layout());

    expect(before).toBeGreaterThan(0);
    expect(subscriptions.count).toBe(before);
    expect(listeners.has('flash')).toBe(true);
    expect(listeners.has('networkError')).toBe(true);
});
