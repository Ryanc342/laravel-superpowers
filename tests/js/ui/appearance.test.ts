import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { resolveAppearance, useAppearance } from '@/ui/appearance';

/** The browser's `prefers-color-scheme: dark` setting, which the test can change. */
function systemSetting(prefersDark: boolean) {
    const listeners = new Set<() => void>();
    const query = {
        get matches() {
            return prefersDark;
        },
        addEventListener: (_type: string, listener: () => void) =>
            listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) =>
            listeners.delete(listener),
    };

    vi.stubGlobal('matchMedia', () => query);

    return {
        change(next: boolean) {
            prefersDark = next;
            listeners.forEach((listener) => listener());
        },
        listenerCount: () => listeners.size,
    };
}

function clearCookie(): void {
    document.cookie = 'appearance=;path=/;max-age=0';
}

const root = document.documentElement;

afterEach(() => {
    clearCookie();
    localStorage.clear();
    root.classList.remove('dark');
    root.style.colorScheme = '';
    vi.restoreAllMocks();
    systemSetting(false);
});

test.each([
    ['light', true, 'light'],
    ['light', false, 'light'],
    ['dark', true, 'dark'],
    ['dark', false, 'dark'],
    ['system', true, 'dark'],
    ['system', false, 'light'],
] as const)(
    '%s with a system preference for dark = %s is %s',
    (appearance, prefersDark, resolved) => {
        expect(resolveAppearance(appearance, prefersDark)).toBe(resolved);
    },
);

test('a first visit follows the system and is light on a light system', () => {
    const { result } = renderHook(() => useAppearance());

    expect(result.current.appearance).toBe('system');
    expect(result.current.resolved).toBe('light');
    expect(root.classList.contains('dark')).toBe(false);
});

test('setting dark writes the cookie for a year, remembers it and turns the page dark', () => {
    const { result } = renderHook(() => useAppearance());

    act(() => result.current.setAppearance('dark'));

    expect(document.cookie).toContain('appearance=dark');
    expect(localStorage.getItem('appearance')).toBe('dark');
    expect(result.current.appearance).toBe('dark');
    expect(result.current.resolved).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
});

test('the cookie lives a year and is sent with same-site navigation', () => {
    const cookie = vi.spyOn(document, 'cookie', 'set');
    const { result } = renderHook(() => useAppearance());

    act(() => result.current.setAppearance('dark'));

    expect(cookie).toHaveBeenCalledWith(
        'appearance=dark;path=/;max-age=31536000;SameSite=Lax',
    );
});

test('setting light after dark turns the page light again', () => {
    const { result } = renderHook(() => useAppearance());

    act(() => result.current.setAppearance('dark'));
    act(() => result.current.setAppearance('light'));

    expect(result.current.resolved).toBe('light');
    expect(root.classList.contains('dark')).toBe(false);
});

test('light stays light on a dark system', () => {
    systemSetting(true);
    const { result } = renderHook(() => useAppearance());

    act(() => result.current.setAppearance('light'));

    expect(result.current.resolved).toBe('light');
    expect(root.classList.contains('dark')).toBe(false);
});

test('system follows the browser, and a change of the browser setting', () => {
    const system = systemSetting(true);
    const { result } = renderHook(() => useAppearance());

    expect(result.current.appearance).toBe('system');
    expect(result.current.resolved).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);

    act(() => system.change(false));

    expect(result.current.resolved).toBe('light');
    expect(root.classList.contains('dark')).toBe(false);
});

test('a returning visitor starts with the appearance in the cookie', () => {
    document.cookie = 'appearance=dark;path=/';

    const { result } = renderHook(() => useAppearance());

    expect(result.current.appearance).toBe('dark');
    expect(result.current.resolved).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
});

test('a visitor whose cookie has expired keeps the appearance in local storage', () => {
    localStorage.setItem('appearance', 'dark');

    const { result } = renderHook(() => useAppearance());

    expect(result.current.appearance).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
});

test('a cookie that names no appearance is ignored', () => {
    document.cookie = 'appearance=purple;path=/';

    const { result } = renderHook(() => useAppearance());

    expect(result.current.appearance).toBe('system');
});

test('every place that shows the appearance follows a change made in another', () => {
    const first = renderHook(() => useAppearance());
    const second = renderHook(() => useAppearance());

    act(() => first.result.current.setAppearance('dark'));

    expect(second.result.current.appearance).toBe('dark');
});

test('it stops listening to the browser when the layout goes away', () => {
    const system = systemSetting(false);
    const { unmount } = renderHook(() => useAppearance());

    unmount();

    expect(system.listenerCount()).toBe(0);
});

function Setting() {
    const { appearance, resolved } = useAppearance();

    return createElement('span', null, `${appearance} ${resolved}`);
}

test('a page the server rendered hydrates without a mismatch, and then shows the saved appearance', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(createElement(Setting));
    document.body.append(container);
    document.cookie = 'appearance=dark;path=/';
    const mismatches: unknown[] = [];

    await act(async () => {
        hydrateRoot(container, createElement(Setting), {
            onRecoverableError: (error) => mismatches.push(error),
        });
    });

    expect(mismatches).toEqual([]);
    expect(container.textContent).toBe('dark dark');
    expect(root.classList.contains('dark')).toBe(true);

    container.remove();
});
