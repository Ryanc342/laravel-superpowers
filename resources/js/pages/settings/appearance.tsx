import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Head } from '@inertiajs/react';
import { Segmented } from 'antd';
import { t } from '@/lib/i18n';
import { useAppearance } from '@/ui/appearance';
import type { Appearance as AppearanceChoice } from '@/ui/appearance';

export default function Appearance() {
    const { appearance, setAppearance } = useAppearance();
    const choices: {
        value: AppearanceChoice;
        icon: React.ReactNode;
        label: string;
    }[] = [
        { value: 'light', icon: <SunOutlined />, label: t('Light') },
        { value: 'dark', icon: <MoonOutlined />, label: t('Dark') },
        { value: 'system', icon: <DesktopOutlined />, label: t('System') },
    ];

    return (
        <>
            <Head title={t('Appearance')} />

            <ProCard title={t('Appearance')} headerBordered>
                <Segmented<AppearanceChoice>
                    value={appearance}
                    onChange={setAppearance}
                    options={choices}
                />
            </ProCard>
        </>
    );
}
