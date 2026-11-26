// @vitest-environment node
import type { Page } from '@inertiajs/core';
import type { ResolvedComponent } from '@inertiajs/react';
import { expect, test } from 'vite-plus/test';
import Login from '@/pages/auth/login';
import Dashboard from '@/pages/dashboard';
import { serverRenderer } from '@/ui/server-render';

/*
 * The server render, as the SSR server runs it: the page in its layouts, and
 * in the head the CSS variables of the theme providers Pro nests in its
 * layout. Vitest loads Pro the way Node does in the SSR bundle (see
 * `test.server.deps` in vite.config.ts), so Pro has to be bundled there too.
 */

const pages: Record<string, unknown> = {
    dashboard: Dashboard,
    'auth/login': Login,
};

const renderPage = serverRenderer((name) => pages[name] as ResolvedComponent);

function page(component: string, url: string): Page {
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
            examples: true,
            sidebarOpen: true,
            perPageOptions: [10, 20, 50, 100],
            canResetPassword: true,
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
