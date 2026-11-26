import { act, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vite-plus/test';

const page = vi.hoisted(() => ({
    url: '/dashboard',
    props: {} as Record<string, unknown>,
}));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    usePage: () => page,
}));

const theme = vi.hoisted(() => ({
    layout: 'side' as 'side' | 'top' | 'mix',
}));

vi.mock('@/theme', () => ({ default: theme }));

vi.mock('@/ui/example-menu', () => ({
    exampleMenu: () => [
        {
            key: 'examples',
            label: 'Examples',
            href: '/examples',
            children: [
                { key: 'users', label: 'Users', href: '/examples/users' },
                { key: 'orders', label: 'Orders', href: '/examples/orders' },
            ],
        },
    ],
}));

import AppLayout from '@/layouts/app-layout';

/**
 * A browser window of the given width: `(min-width: …)` and `(max-width: …)`
 * queries, joined by `and`, as antd's and Pro's breakpoints ask them.
 */
function windowWidth(width: number): void {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: [...query.matchAll(/\((min|max)-width:\s*(\d+)px\)/g)].every(
            ([, bound, pixels]) =>
                bound === 'min'
                    ? width >= Number(pixels)
                    : width <= Number(pixels),
        ),
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
    }));
}

function signedInPage(sidebarOpen: boolean, url = '/dashboard'): void {
    page.url = url;
    page.props = {
        name: 'Laravel',
        auth: { user: { id: 1, name: 'Test User', email: 'test@example.com' } },
        locale: 'en',
        locales: [{ value: 'en', label: 'English' }],
        translations: [],
        examples: true,
        sidebarOpen,
    };
}

function sider(): Element | null {
    return document.querySelector('.ant-pro-sider');
}

afterEach(() => {
    document.cookie = 'sidebar_state=;path=/;max-age=0';
    theme.layout = 'side';
});

test('the side menu opens as the sidebar_state cookie left it', () => {
    windowWidth(1280);
    signedInPage(false);

    render(<AppLayout>Page</AppLayout>);

    expect(sider()?.classList.contains('ant-pro-sider-collapsed')).toBe(true);
});

test('collapsing the side menu is kept in the sidebar_state cookie', async () => {
    windowWidth(1280);
    signedInPage(true);
    render(<AppLayout>Page</AppLayout>);

    expect(sider()?.classList.contains('ant-pro-sider-collapsed')).toBe(false);

    await act(async () => {
        document
            .querySelector<HTMLElement>('.ant-pro-sider-collapsed-button')
            ?.click();
    });

    expect(sider()?.classList.contains('ant-pro-sider-collapsed')).toBe(true);
    expect(document.cookie).toContain('sidebar_state=false');
});

test('on a phone the menu starts closed, and closing it leaves the cookie alone', async () => {
    windowWidth(375);
    signedInPage(true);

    await act(async () => {
        render(<AppLayout>Page</AppLayout>);
    });

    expect(document.querySelector('.ant-drawer-open')).toBeNull();
    expect(document.cookie).not.toContain('sidebar_state');
});

test('a page under the URL of a menu entry keeps the entry current', () => {
    windowWidth(1280);
    signedInPage(true, '/examples/users/5/edit?tab=orders');

    render(<AppLayout>Page</AppLayout>);

    const selected = [
        ...document.querySelectorAll(
            '.ant-pro-sider .ant-menu-item-selected a',
        ),
    ].map((link) => link.getAttribute('href'));

    expect(selected).toEqual(['/examples/users']);
    expect(
        document
            .querySelector('.ant-pro-sider .ant-menu-submenu')
            ?.classList.contains('ant-menu-submenu-selected'),
    ).toBe(true);
});

// A signed-in page's one h1 is its own title; Pro writes the app's name as one.
test.each(['side', 'top', 'mix'] as const)(
    'the logo and app name link to the dashboard, the name not as a heading, in the %s layout',
    (layout) => {
        theme.layout = layout;
        windowWidth(1280);
        signedInPage(true);

        render(
            <AppLayout>
                <h1>Dashboard</h1>
            </AppLayout>,
        );

        const logo = document.querySelector(
            '.ant-pro-sider-logo, .ant-pro-global-header-logo, .ant-pro-top-nav-header-logo',
        );

        expect(
            [...document.querySelectorAll('h1')].map(
                (heading) => heading.textContent,
            ),
        ).toEqual(['Dashboard']);
        expect(logo?.textContent).toBe('Laravel');
        expect(logo?.querySelector('a')?.getAttribute('href')).toBe(
            '/dashboard',
        );
    },
);
