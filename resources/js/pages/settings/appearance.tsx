import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Section from '@/components/shared/section';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Appearance settings" />

            <Section title="Appearance settings">
                <p className="text-sm text-muted-foreground">
                    Update the appearance settings for your account
                </p>
                <AppearanceTabs />
            </Section>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
