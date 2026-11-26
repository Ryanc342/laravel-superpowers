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
// The project's own menu entries (`navigation.ts`) are not this layout's to
// test: the layout adds the examples to whatever the project lists.
vi.mock('@/navigation', () => ({ appMenu: [] }));

import AppLayout from '@/layouts/app-layout';
import { setLanguage } from '@/lib/i18n';

/**
 * A browser window of the given width: `(min-width: …)` and `(max-width: …)`
 * queries, joined by `and`, as antd's and Pro's breakpoints ask them (antd's
 * Sider asks `max-width: 991.98px`). A query with no width in it does not
 * match.
 */
function windowWidth(width: number): void {
    vi.stubGlobal('matchMedia', (query: string) => {
        const bounds = [
            ...query.matchAll(/\((min|max)-width:\s*([\d.]+)px\)/g),
        ];

        return {
            matches:
                bounds.length > 0 &&
                bounds.every(([, bound, pixels]) =>
                    bound === 'min'
                        ? width >= Number(pixels)
                        : width <= Number(pixels),
                ),
            media: query,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
        };
    });
}

/** The menu's example entries, as the server sends them in local and testing. */
const EXAMPLES = [
    {
        key: 'examples',
        label: 'Examples',
        href: '/examples',
        children: [
            { key: 'users', label: 'Users', href: '/examples/users' },
            { key: 'orders', label: 'Orders', href: '/examples/orders' },
        ],
    },
];

function signedInPage(sidebarOpen: boolean, url = '/dashboard'): void {
    page.url = url;
    page.props = {
        name: 'Laravel',
        auth: { user: { id: 1, name: 'Test User', email: 'test@example.com' } },
        locale: 'en',
        locales: [{ value: 'en', label: 'English' }],
        translations: [],
        examples: EXAMPLES,
        sidebarOpen,
    };
}

function sider(): Element | null {
    return document.querySelector('.ant-pro-sider');
}

afterEach(() => {
    document.cookie = 'sidebar_state=;path=/;max-age=0';
    theme.layout = 'side';
    setLanguage('en', []);
});

// From md up the cookie alone decides, whatever the width: antd's Sider would
// otherwise collapse or open it to suit the window once the page has loaded.
test.each([
    [1280, false],
    [900, true],
])(
    'at %ipx the side menu stays as the sidebar_state cookie left it (open: %s)',
    async (width, open) => {
        windowWidth(width);
        document.cookie = `sidebar_state=${open};path=/`;
        signedInPage(open);

        await act(async () => {
            render(<AppLayout>Page</AppLayout>);
        });
        await act(async () => {});

        expect(sider()?.classList.contains('ant-pro-sider-collapsed')).toBe(
            !open,
        );
        expect(document.cookie).toBe(`sidebar_state=${open}`);
    },
);

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
    await act(async () => {});

    expect(sider()?.classList.contains('ant-pro-sider-collapsed')).toBe(true);
    expect(document.cookie).toBe('sidebar_state=false');
});

test('on a phone the menu starts closed, and closing it leaves the cookie alone', async () => {
    windowWidth(375);
    signedInPage(true);

    await act(async () => {
        render(<AppLayout>Page</AppLayout>);
    });
    await act(async () => {});

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

test('the group of the current page is open, and the user can still close it', async () => {
    windowWidth(1280);
    signedInPage(true, '/examples/orders');

    await act(async () => {
        render(<AppLayout>Page</AppLayout>);
    });

    const group = () =>
        document.querySelector('.ant-pro-sider .ant-menu-submenu');

    expect(group()?.classList.contains('ant-menu-submenu-open')).toBe(true);

    await act(async () => {
        document
            .querySelector<HTMLElement>(
                '.ant-pro-sider .ant-menu-submenu-title',
            )
            ?.click();
    });

    expect(group()?.classList.contains('ant-menu-submenu-open')).toBe(false);
});

test('the menu has the example entries the server sends, translated, and none without them', async () => {
    windowWidth(1280);
    signedInPage(true, '/examples/orders');
    setLanguage('zh_CN', { Examples: '示例', Users: '用户' });

    const { unmount } = render(<AppLayout>Page</AppLayout>);

    const entries = () =>
        [
            ...document.querySelectorAll(
                '.ant-pro-sider .ant-menu-submenu-title, .ant-pro-sider .ant-menu-item a',
            ),
        ].map((entry) => entry.textContent);

    expect(entries()).toEqual(
        expect.arrayContaining(['示例', '用户', 'Orders']),
    );
    expect(
        document.querySelector(
            '.ant-pro-sider .ant-menu-submenu-title .anticon-experiment',
        ),
    ).not.toBeNull();

    unmount();
    page.props.examples = null;
    render(<AppLayout>Page</AppLayout>);

    expect(
        document.querySelector('.ant-pro-sider .ant-menu-submenu'),
    ).toBeNull();
    expect(entries()).not.toContain('Examples');
});
