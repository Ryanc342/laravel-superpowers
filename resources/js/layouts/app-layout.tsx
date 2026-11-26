import { ProLayout } from '@ant-design/pro-components';
import type { MenuDataItem } from '@ant-design/pro-components';
import { Link, usePage } from '@inertiajs/react';
import { Grid } from 'antd';
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import AppLogo from '@/components/app-logo';
import LanguageSwitch from '@/components/language-switch';
import UserMenu from '@/components/user-menu';
import { t } from '@/lib/i18n';
import { appMenu } from '@/navigation';
import { dashboard } from '@/routes';
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
 * The app's name beside the logo, where Pro writes an h1: a signed-in page's
 * one h1 is its own title. Each style is the one Pro gives its h1 there: in
 * the side menu, in the top layout's header and in the mix layout's header.
 */
const APP_NAME_STYLE: Record<'side' | 'top' | 'mix', CSSProperties> = {
    side: {
        display: 'inline-block',
        height: 22,
        marginInlineStart: 6,
        color: 'var(--ant-color-text)',
        fontWeight: 600,
        fontSize: 16,
        lineHeight: '22px',
        verticalAlign: 'middle',
    },
    top: {
        display: 'inline-block',
        marginInlineStart: 6,
        color: 'var(--ant-color-text)',
        fontWeight: 600,
        fontSize: 16,
        lineHeight: '24px',
        verticalAlign: 'top',
    },
    mix: {
        height: 32,
        marginInlineStart: 8,
        color: 'var(--ant-color-text)',
        fontWeight: 600,
        fontSize: 18,
        lineHeight: '32px',
    },
};

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
 * The side menu's collapsed state is kept in the `sidebar_state` cookie, open
 * by default, and from md up the cookie alone decides it: antd's Sider would
 * otherwise collapse or open it to suit the window on every page load, and
 * save that over the user's choice (`breakpoint={false}`). On a phone the menu
 * is a drawer instead, closed on each page load, and opening or closing it is
 * not kept.
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
    const layout = projectTheme.layout ?? 'side';
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
            layout={layout}
            token={LAYOUT_TOKEN}
            title={props.name}
            logo={<AppLogo />}
            // Pro's own layout of the logo and name, with the name as text,
            // as a link to the dashboard. In the side layout the side menu
            // holds them, and the phone's header only the logo; the drawer
            // has neither. Pro asks this function in the other layouts'
            // headers too, so it is left to Pro there, where the side menu
            // shows none.
            menuHeaderRender={
                layout === 'side'
                    ? (logo, title, siderProps) => {
                          if (!siderProps) {
                              return logo;
                          }

                          if (siderProps.isMobile) {
                              return null;
                          }

                          return (
                              <Link href={dashboard()}>
                                  {logo}
                                  {title && (
                                      <span style={APP_NAME_STYLE.side}>
                                          {props.name}
                                      </span>
                                  )}
                              </Link>
                          );
                      }
                    : undefined
            }
            headerTitleRender={(logo, _title, headerProps) =>
                headerProps?.isMobile ? null : (
                    <Link href={dashboard()}>
                        {logo}
                        <span
                            style={
                                APP_NAME_STYLE[layout === 'mix' ? 'mix' : 'top']
                            }
                        >
                            {props.name}
                        </span>
                    </Link>
                )
            }
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
            breakpoint={false}
            collapsed={isPhone ? !phoneMenuOpen : collapsed}
            onCollapse={onCollapse}
            actionsRender={() => [<LanguageSwitch key="language" />]}
            avatarProps={{
                render: (_avatar, _dom, menuProps) => (
                    <UserMenu avatarOnly={isPhone || menuProps.collapsed} />
                ),
            }}
            pageTitleRender={() => ''}
        >
            {children}
        </ProLayout>
    );
}
