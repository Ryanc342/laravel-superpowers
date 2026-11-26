import { ProLayout } from '@ant-design/pro-components';
import type { MenuDataItem } from '@ant-design/pro-components';
import { Link, usePage } from '@inertiajs/react';
import { Grid } from 'antd';
import { useState } from 'react';
import type { ReactNode } from 'react';
import AppLogo from '@/components/app-logo';
import LanguageSwitch from '@/components/language-switch';
import UserMenu from '@/components/user-menu';
import { t } from '@/lib/i18n';
import { appMenu } from '@/navigation';
import projectTheme from '@/theme';
import type { MenuItem } from '@/types';
import { exampleMenu } from '@/ui/example-menu';
import { LAYOUT_TOKEN } from '@/ui/theme';

/**
 * The server reads it (`sidebarOpen`), so a page opens with the side menu as
 * the user left it: `true` when open.
 */
const SIDEBAR_COOKIE = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function rememberSidebarOpen(open: boolean): void {
    document.cookie = `${SIDEBAR_COOKIE}=${open};path=/;max-age=${SIDEBAR_COOKIE_MAX_AGE};SameSite=Lax`;
}

function toProMenu(item: MenuItem): MenuDataItem {
    return {
        key: item.key,
        path: item.href,
        name: t(item.label),
        icon: item.icon,
        children: item.children?.map(toProMenu),
    };
}

/**
 * The keys of the entries for the page at `pathname`, and of the groups they
 * are in: an entry is current on its own URL and on the URLs under it, as Pro
 * counts it. Pro works them out only once its JavaScript runs, so the layout
 * passes them, and the server's page has the current entry marked.
 */
function currentMenuKeys(
    items: MenuItem[],
    pathname: string,
    groups: string[] = [],
): string[] {
    return items.flatMap((item) => {
        const current =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(`${item.href}/`));
        const inside = currentMenuKeys(item.children ?? [], pathname, [
            ...groups,
            item.key,
        ]);

        return current ? [...groups, item.key, ...inside] : inside;
    });
}

/**
 * The layout of every signed-in page: Pro's layout, with the app's menu
 * (`navigation.ts`, then the examples where they exist), the language switch
 * and the user menu. The theme file chooses where the menu goes.
 *
 * Menu entries are Inertia links, and the current one follows the page's URL.
 * The side menu's collapsed state is kept in the `sidebar_state` cookie. On a
 * phone the menu is a drawer instead, closed on each page load, and opening or
 * closing it is not kept.
 *
 * The page title is the page's own (Inertia's `<Head>`): Pro would otherwise
 * write the menu entry's name into it.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
    const { props, url } = usePage();
    const isPhone = Grid.useBreakpoint().md === false;
    const [collapsed, setCollapsed] = useState(!props.sidebarOpen);
    const [phoneMenuOpen, setPhoneMenuOpen] = useState(false);
    const pathname = url.split(/[?#]/)[0];
    const menu = [...appMenu, ...(props.examples ? exampleMenu() : [])];

    const onCollapse = (next: boolean): void => {
        if (isPhone) {
            setPhoneMenuOpen(!next);

            return;
        }

        setCollapsed(next);
        rememberSidebarOpen(!next);
    };

    return (
        <ProLayout
            layout={projectTheme.layout}
            token={LAYOUT_TOKEN}
            title={props.name}
            logo={<AppLogo />}
            location={{ pathname }}
            route={{ path: '/', children: menu.map(toProMenu) }}
            menuProps={{
                selectedKeys: [...new Set(currentMenuKeys(menu, pathname))],
            }}
            menuItemRender={(item, dom, menuProps) => (
                <Link
                    href={item.path ?? '/'}
                    onClick={menuProps.isMobile ? item.onClick : undefined}
                >
                    {dom}
                </Link>
            )}
            collapsed={isPhone ? !phoneMenuOpen : collapsed}
            onCollapse={onCollapse}
            actionsRender={() => [<LanguageSwitch key="language" />]}
            avatarProps={{
                render: (_avatar, _dom, menuProps) => (
                    <UserMenu collapsed={menuProps.collapsed && !isPhone} />
                ),
            }}
            pageTitleRender={() => ''}
        >
            {children}
        </ProLayout>
    );
}
