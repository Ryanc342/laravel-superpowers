// @vitest-environment node
import type { Page } from '@inertiajs/core';
import type { ResolvedComponent } from '@inertiajs/react';
import { expect, test } from 'vite-plus/test';
import Login from '@/pages/auth/login';
import Dashboard from '@/pages/dashboard';
import ErrorPage from '@/pages/error';
import OrdersIndex from '@/pages/examples/orders/index';
import Appearance from '@/pages/settings/appearance';
import Profile from '@/pages/settings/profile';
import Security from '@/pages/settings/security';
import Welcome from '@/pages/welcome';
import { serverRenderer } from '@/ui/server-render';

/*
 * The server render, as the SSR server runs it: the page in its layouts, and
 * in the head the CSS variables of the theme providers Pro nests in its
 * layout. Vitest loads Pro the way Node does in the SSR bundle (see
 * `test.server.deps` in vite.config.ts), so Pro has to be bundled there too.
 */

const pages: Record<string, unknown> = {
    dashboard: Dashboard,
    error: ErrorPage,
    'examples/orders/index': OrdersIndex,
    welcome: Welcome,
    'auth/login': Login,
    'settings/profile': Profile,
    'settings/security': Security,
    'settings/appearance': Appearance,
};

const renderPage = serverRenderer((name) => pages[name] as ResolvedComponent);

function page(
    component: string,
    url: string,
    props: Record<string, unknown> = {},
): Page {
    return {
        component,
        url,
        version: null,
        rescuedProps: [],
        flash: {},
        rememberedState: {},
        props: {
            errors: {},
            name: 'Laravel',
            auth: {
                user: {
                    id: 1,
                    name: 'Test User',
                    email: 'test@example.com',
                    email_verified_at: null,
                    created_at: '2026-11-26',
                    updated_at: '2026-11-26',
                },
            },
            locale: 'en',
            locales: [
                { value: 'zh_CN', label: '中文' },
                { value: 'en', label: 'English' },
            ],
            translations: [],
            features: {
                registration: true,
                resetPasswords: true,
                emailVerification: true,
                twoFactorAuthentication: true,
                passkeys: true,
            },
            examples: [
                {
                    key: 'examples',
                    label: 'Examples',
                    href: '/examples',
                    children: [
                        {
                            key: 'examples.orders',
                            label: 'Orders',
                            href: '/examples/orders',
                        },
                    ],
                },
            ],
            sidebarOpen: true,
            perPageOptions: [10, 20, 50, 100],
            ...props,
        },
    } as unknown as Page;
}

/** The CSS of the style the server render adds to the head, if it adds one. */
function serverStyles(head: string[]): string | undefined {
    return head
        .find((element) => element.startsWith('<style'))
        ?.replace(/^<style[^>]*>/, '')
        .replace(/<\/style>$/, '');
}

/** The keys of antd's nested theme providers that the markup uses. */
function nestedKeys(body: string): string[] {
    return [...new Set(body.match(/\bcss-var-[\w-]+/g) ?? [])];
}

/** The declarations of the variable block for a selector. */
function block(css: string, selector: string): string | undefined {
    const start = css.indexOf(`${selector}{`);

    return start === -1
        ? undefined
        : css.slice(start + selector.length + 1, css.indexOf('}', start));
}

test('the dashboard renders on the server inside the app shell', async () => {
    const { body } = await renderPage(page('dashboard', '/dashboard'));

    // Pro's statistic cards are part of the server's page, in columns that
    // follow the screen in CSS: the server cannot know the screen's width.
    expect(body).toContain('ant-pro-statistic-card');
    expect(body).toContain('12,846');
    expect(body).toContain('ant-col-xl-6');

    expect(body).toContain('ant-pro-layout');
    expect(body).toContain('data-test="user-menu-button"');
    expect(body).toContain('href="/dashboard"');
    // antd's elements carry the class of the theme's CSS variable key, `app`.
    expect(body).toMatch(/class="[^"]*\bant-layout\b[^"]*\bapp\b/);
});

// Pro marks the current entry only once its JavaScript runs.
test('the server marks the menu entry of the current page', async () => {
    const { body } = await renderPage(page('dashboard', '/dashboard'));

    expect(body).toMatch(
        /<li[^>]*class="[^"]*\bant-menu-item-selected\b[^"]*"(?:(?!<\/li>).)*href="\/dashboard"/,
    );
});

// A page inside a group: Pro would open the group only once its JavaScript
// runs, so the page would paint with it closed, then open it.
test('the server renders the group of the current page open, with its entry marked', async () => {
    const { body } = await renderPage(
        page('examples/orders/index', '/examples/orders', {
            orders: {
                rows: [],
                total: 0,
                page: 1,
                perPage: 20,
                perPageOptions: [10, 20, 50, 100],
                sort: null,
                filters: [],
                prefix: '',
            },
            hasOrders: true,
        }),
    );

    expect(body).toMatch(
        /<li[^>]*class="[^"]*\bant-menu-submenu-open\b[^"]*"(?:(?!<\/li>).)*Examples/,
    );
    expect(body).toMatch(
        /<li[^>]*class="[^"]*\bant-menu-item-selected\b[^"]*"(?:(?!<\/li>).)*href="\/examples\/orders"/,
    );
});

test('every nested theme the dashboard uses has its variables in the head, light and dark', async () => {
    const { head, body } = await renderPage(page('dashboard', '/dashboard'));
    const css = serverStyles(head) ?? '';
    const keys = nestedKeys(body);

    expect(keys.length).toBeGreaterThan(0);
    expect(css.startsWith('@layer antd{')).toBe(true);

    for (const key of keys) {
        const light = block(css, `.${key}`);
        const dark = block(css, `:where(html.dark) .${key}`);

        expect(light).toContain('--ant-color-bg-container:#ffffff');
        expect(dark).toContain('--ant-color-bg-container:#141414');
    }
});

test('the dark copies come after the light ones, so they win under html.dark', async () => {
    const { head, body } = await renderPage(page('dashboard', '/dashboard'));
    const css = serverStyles(head) ?? '';
    const [key] = nestedKeys(body);

    expect(css.indexOf(`:where(html.dark) .${key}{`)).toBeGreaterThan(
        css.indexOf(`.${key}{`),
    );
});

test('the styles stay out of the head elements Inertia replaces on a visit', async () => {
    const { head } = await renderPage(page('dashboard', '/dashboard'));
    const style = head.find((element) => element.startsWith('<style'));

    expect(style).toBeDefined();
    expect(style).not.toContain('data-inertia');
});

test('a page with no nested theme gets no extra styles', async () => {
    const { head, body } = await renderPage(page('auth/login', '/login'));

    expect(nestedKeys(body)).toEqual([]);
    expect(serverStyles(head)).toBeUndefined();
});

// The settings pages touch no browser API while they render: the server
// renders them, and the browser hydrates what it rendered.
test('the settings pages render on the server, with their sections', async () => {
    const profile = await renderPage(
        page('settings/profile', '/settings/profile', {
            mustVerifyEmail: true,
        }),
    );
    const security = await renderPage(
        page('settings/security', '/settings/security', {
            passwordRules: '',
            canManageTwoFactor: true,
            twoFactorEnabled: true,
            requiresConfirmation: true,
            canManagePasskeys: true,
            passkeys: [],
        }),
    );
    const appearance = await renderPage(
        page('settings/appearance', '/settings/appearance'),
    );

    expect(profile.body).toContain('Delete account');
    expect(profile.body).toContain('Your email address is unverified.');
    expect(security.body).toContain('Update password');
    expect(security.body).toContain('Disable 2FA');
    expect(security.body).toContain('No passkeys yet');
    expect(appearance.body).toContain('ant-segmented');
});

test('the security page leaves out the sections of the features that are off', async () => {
    const { body } = await renderPage(
        page('settings/security', '/settings/security', {
            passwordRules: '',
            canManageTwoFactor: false,
            canManagePasskeys: false,
            passkeys: [],
        }),
    );

    // The page's own props, which name the features, are in a script tag.
    const markup = body.replace(/<script[\s\S]*?<\/script>/, '');

    expect(markup).toContain('Update password');
    expect(markup).not.toContain('Two-factor authentication');
    expect(markup).not.toContain('Passkeys');
});

// The pages outside the app shell: a visitor's first paint, before any script runs.
test('the error page renders on the server for a guest, with its way home', async () => {
    const { body } = await renderPage(
        page('error', '/no/such/page', { status: 404, auth: { user: null } }),
    );

    expect(body).toContain('ant-result-404');
    expect(body).toContain('Page not found');
    expect(body).toContain('Back to home');
    expect(body).not.toContain('ant-pro-layout');
});

test('the welcome page renders on the server, with the links a guest has', async () => {
    const { body } = await renderPage(
        page('welcome', '/', { auth: { user: null } }),
    );

    expect(body).toContain('Build on an app that checks itself');
    expect(body).toContain('href="/login"');
    expect(body).toContain('href="/register"');
});
