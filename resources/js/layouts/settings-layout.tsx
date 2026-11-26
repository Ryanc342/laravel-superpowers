import { ProCard } from '@ant-design/pro-components';
import { Link, usePage } from '@inertiajs/react';
import { Grid, Menu } from 'antd';
import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

/**
 * The layout of the settings pages, inside the signed-in layout: a menu of
 * the settings sections beside the section's page, and above it, across, on
 * a phone. Its title is the page's one heading, in the card title's look.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
    const pathname = usePage().url.split(/[?#]/)[0];
    const isPhone = Grid.useBreakpoint().md === false;
    const sections = [
        { href: editProfile.url(), label: t('Profile') },
        { href: editSecurity.url(), label: t('Security') },
        { href: editAppearance.url(), label: t('Appearance') },
    ];

    return (
        <ProCard
            title={
                <h1 style={{ margin: 0, font: 'inherit' }}>{t('Settings')}</h1>
            }
            subTitle={t('Manage your profile and account settings')}
            headerBordered
            wrap
            gutter={[24, 16]}
        >
            <ProCard colSpan={{ xs: 24, md: 6 }} ghost>
                <Menu
                    mode={isPhone ? 'horizontal' : 'inline'}
                    selectedKeys={[pathname]}
                    items={sections.map(({ href, label }) => ({
                        key: href,
                        label: <Link href={href}>{label}</Link>,
                    }))}
                />
            </ProCard>
            <ProCard colSpan={{ xs: 24, md: 18 }} ghost>
                {children}
            </ProCard>
        </ProCard>
    );
}
