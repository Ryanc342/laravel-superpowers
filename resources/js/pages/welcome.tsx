import { Head, usePage } from '@inertiajs/react';
import { LayoutTemplate, ListChecks, ShieldCheck } from 'lucide-react';
import ClosingCall from '@/components/shared/closing-call';
import FeatureGrid, { type Feature } from '@/components/shared/feature-grid';
import Hero from '@/components/shared/hero';
import PublicFooter from '@/components/shared/public-footer';
import PublicHeader from '@/components/shared/public-header';
import { dashboard, login } from '@/routes';

const features: Feature[] = [
    {
        icon: ShieldCheck,
        title: 'Accounts from day one',
        description:
            'Log in, registration, password reset and account settings work from the first run.',
    },
    {
        icon: LayoutTemplate,
        title: 'Components with rules',
        description:
            'Forms, dialogs, lists and empty states share one set of components and design tokens.',
    },
    {
        icon: ListChecks,
        title: 'One command to finish',
        description:
            'composer check runs the formatters, static analysis, type checks and every test.',
    },
];

/** The copyright year, read once when the page's code loads. */
const currentYear = new Date().getFullYear();

export default function Welcome() {
    const { auth } = usePage().props;
    const signedIn = Boolean(auth.user);
    const nextStep = signedIn
        ? { label: 'Dashboard', href: dashboard() }
        : { label: 'Log in', href: login() };

    return (
        <>
            <Head title="Welcome" />

            <div className="flex min-h-dvh flex-col bg-background">
                <PublicHeader links={[]} signedIn={signedIn} label="Main" />

                <main className="mx-auto grid w-full max-w-6xl flex-1 gap-16 px-4 py-8 md:px-6">
                    <Hero
                        title="Build on an app that checks itself"
                        summary="Laravel, Inertia and React with accounts, settings and a quality gate already in place."
                        primary={nextStep}
                    />

                    <FeatureGrid features={features} />

                    <ClosingCall
                        text="Start with the part only your app has."
                        action={nextStep}
                    />
                </main>

                <PublicFooter links={[]} year={currentYear} label="Footer" />
            </div>
        </>
    );
}
