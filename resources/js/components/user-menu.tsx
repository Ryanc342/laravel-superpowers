import {
    LogoutOutlined,
    SettingOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Link, router, usePage } from '@inertiajs/react';
import { Avatar, Button, Dropdown } from 'antd';
import type { CSSProperties } from 'react';
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
 * A name longer than the room it has is cut with an ellipsis: the button and
 * its text may shrink below the width of the name, which is what keeps the
 * language switch beside it in the side menu's footer.
 */
const BUTTON_STYLE: CSSProperties = { minWidth: 0, maxWidth: '100%' };
const NAME_STYLE: CSSProperties = {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

/**
 * The signed-in user's menu, in the layout: their settings, then signing
 * out. The button shows the user's avatar, with their name unless `avatarOnly`
 * (the side menu is collapsed, or the screen is a phone's, where a long name
 * would make the header wider than the screen). The name is then the button's
 * accessible name. A name that does not fit is cut, and the button's title
 * has all of it.
 */
export default function UserMenu({
    avatarOnly = false,
}: {
    avatarOnly?: boolean;
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
                style={BUTTON_STYLE}
                title={user.name}
                aria-label={avatarOnly ? user.name : undefined}
                data-test="user-menu-button"
            >
                {avatarOnly ? null : (
                    <span style={NAME_STYLE}>{user.name}</span>
                )}
            </Button>
        </Dropdown>
    );
}
