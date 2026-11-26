import { createContext, use, useEffect, useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearance = {
    /** What the user chose. */
    appearance: Appearance;
    /** What the page shows: `system` has become the browser's own choice. */
    resolved: ResolvedAppearance;
    setAppearance: (appearance: Appearance) => void;
};

/**
 * The name of the cookie that keeps the choice. The server reads it
 * (`HandleAppearance`) to paint the first page in the right theme.
 */
const COOKIE_NAME = 'appearance';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * What a server render shows, and so the render that hydrates it: `system`,
 * on a browser that prefers light. The server never sees the visitor's
 * choice. Only the server render that collects the dark theme's CSS variables
 * (`ui/server-render.tsx`) sets it, to `dark`; the browser never does.
 */
export const ServerAppearance = createContext<Appearance>('system');

const listeners = new Set<() => void>();

function isAppearance(value: unknown): value is Appearance {
    return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * What the page shows for a choice: `system` is dark when the browser
 * prefers dark.
 */
export function resolveAppearance(
    appearance: Appearance,
    prefersDark: boolean,
): ResolvedAppearance {
    return appearance === 'dark' || (appearance === 'system' && prefersDark)
        ? 'dark'
        : 'light';
}

/**
 * The saved choice, in the browser only: the cookie, which is also what the
 * server painted the page by. Without a valid one the choice is `system`.
 */
function savedAppearance(): Appearance {
    const cookie = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(`${COOKIE_NAME}=`))
        ?.slice(COOKIE_NAME.length + 1);

    return isAppearance(cookie) ? cookie : 'system';
}

function subscribeToChoice(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

function subscribeToBrowser(listener: () => void): () => void {
    const query = window.matchMedia(DARK_QUERY);

    query.addEventListener('change', listener);

    return () => query.removeEventListener('change', listener);
}

function browserPrefersDark(): boolean {
    return window.matchMedia(DARK_QUERY).matches;
}

function setAppearance(appearance: Appearance): void {
    document.cookie = `${COOKIE_NAME}=${appearance};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;

    listeners.forEach((listener) => listener());
}

/**
 * The light, dark or system setting: the choice, what it shows, and a way to
 * change it. A change is saved in the `appearance` cookie (a year) and shown
 * by `html.dark`, which the generated antd styles and Tailwind's dark variant
 * follow. `system` follows the browser, also when the browser changes.
 *
 * The server render, and the render that hydrates it, read neither the cookie
 * nor the browser: they see `system` on a browser that prefers light, and the
 * choice and the browser's setting arrive right after. Until then the page is
 * painted by `html.dark`, which the server sets from the cookie and the head
 * script from the browser.
 */
export function useAppearance(): UseAppearance {
    const serverAppearance = use(ServerAppearance);
    const appearance = useSyncExternalStore(
        subscribeToChoice,
        savedAppearance,
        () => serverAppearance,
    );
    const prefersDark = useSyncExternalStore(
        subscribeToBrowser,
        browserPrefersDark,
        () => false,
    );
    const resolved = resolveAppearance(appearance, prefersDark);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', resolved === 'dark');
        document.documentElement.style.colorScheme = resolved;
    }, [resolved]);

    return { appearance, resolved, setAppearance };
}
