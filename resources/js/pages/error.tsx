import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button, Flex, Result } from 'antd';
import type { ResultProps } from 'antd';
import { msg, t } from '@/lib/i18n';
import { dashboard, home } from '@/routes';
import PageTitle from '@/ui/page-title';

/** The statuses the server renders this page for (bootstrap/app.php). */
export type ErrorStatus = 403 | 404 | 419 | 429 | 500 | 503;

type Content = {
    illustration: ResultProps['status'];
    title: string;
    description: string;
};

/**
 * What each status says, as English sentences marked with `msg()`: `t()`
 * translates them where they are shown. The 403, 404 and 500 pages have
 * antd's illustrations; the others are a warning or a notice.
 */
const CONTENT: Record<ErrorStatus, Content> = {
    403: {
        illustration: '403',
        title: msg('No permission'),
        description: msg("You don't have access to this page."),
    },
    404: {
        illustration: '404',
        title: msg('Page not found'),
        description: msg("This page doesn't exist or has moved."),
    },
    419: {
        illustration: 'warning',
        title: msg('Page expired'),
        description: msg(
            'Your session expired. Refresh the page and try again.',
        ),
    },
    429: {
        illustration: 'warning',
        title: msg('Too many requests'),
        description: msg('Wait a moment, then try again.'),
    },
    500: {
        illustration: '500',
        title: msg('Something went wrong'),
        description: msg("It's on our side. Try again in a moment."),
    },
    503: {
        illustration: 'info',
        title: msg('Back soon'),
        description: msg(
            "We're updating the system. Try again in a few minutes.",
        ),
    },
};

/**
 * The one button of the page. An expired page is fixed by loading it again; any
 * other error leads back to where the visitor belongs: the dashboard when
 * signed in, the home page when not.
 */
function Action({ status }: { status: ErrorStatus }) {
    const { auth } = usePage().props;

    if (status === 419) {
        return (
            <Button type="primary" onClick={() => router.reload()}>
                {t('Refresh the page')}
            </Button>
        );
    }

    const signedIn = Boolean(auth.user);
    const destination = signedIn
        ? { href: dashboard(), label: t('Back to dashboard') }
        : { href: home(), label: t('Back to home') };

    return (
        <Link as={Button} type="primary" href={destination.href}>
            {destination.label}
        </Link>
    );
}

/**
 * What a failing request shows: the server decides the status
 * (bootstrap/app.php), and this words it, with one way out.
 */
export default function ErrorPage({ status }: { status: ErrorStatus }) {
    const { illustration, title, description } = CONTENT[status];

    return (
        <>
            <Head title={t(title)} />

            <Flex
                align="center"
                justify="center"
                style={{ minHeight: '100svh' }}
            >
                <Result
                    status={illustration}
                    title={<PageTitle>{t(title)}</PageTitle>}
                    subTitle={t(description)}
                    extra={<Action status={status} />}
                />
            </Flex>
        </>
    );
}
