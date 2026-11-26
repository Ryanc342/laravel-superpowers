import {
    LogoutOutlined,
    SettingOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Link, router, usePage } from '@inertiajs/react';
import { Avatar, Button, Dropdown } from 'antd';
import { t } from '@/lib/i18n';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';

/**
 * Signing out drops the pages Inertia prefetched, so the next user of the
 * browser cannot be shown this user's pages from the cache.
 */
export function signOut(): void {
    router.flushAll();
    router.visit(logout());
}

/**
 * The signed-in user's menu, in the layout: their settings, then signing
 * out. The button shows the user's avatar, with their name unless the side
 * menu is collapsed.
 */
export default function UserMenu({
    collapsed = false,
}: {
    collapsed?: boolean;
}) {
    const { user } = usePage().props.auth;

    return (
        <Dropdown
            trigger={['click']}
            menu={{
                items: [
                    {
                        key: 'settings',
                        icon: <SettingOutlined />,
                        label: <Link href={edit()}>{t('Settings')}</Link>,
                    },
                    { type: 'divider' },
                    {
                        key: 'logout',
                        icon: <LogoutOutlined />,
                        label: (
                            <span data-test="logout-button">
                                {t('Log out')}
                            </span>
                        ),
                        onClick: signOut,
                    },
                ],
            }}
        >
            <Button
                type="text"
                icon={
                    <Avatar
                        size="small"
                        src={user.avatar}
                        icon={<UserOutlined />}
                    />
                }
                aria-label={collapsed ? user.name : undefined}
                data-test="user-menu-button"
            >
                {collapsed ? null : user.name}
            </Button>
        </Dropdown>
    );
}
