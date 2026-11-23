import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Section from '@/components/shared/section';

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

// The settings layout names the page and its sub-nav; no breadcrumbs.
Appearance.layout = {
    breadcrumbs: [],
};
