import {
    CheckCircleOutlined,
    LayoutOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Head, Link, usePage } from '@inertiajs/react';
import { Button, Card, Flex, Layout, Space, Typography } from 'antd';
import type { ReactNode } from 'react';
import AppLogo from '@/components/app-logo';
import LanguageSwitch from '@/components/language-switch';
import { msg, t } from '@/lib/i18n';
import { dashboard, login, register } from '@/routes';

type Feature = { icon: ReactNode; title: string; description: string };

const features: Feature[] = [
    {
        icon: <SafetyCertificateOutlined />,
        title: msg('Accounts from day one'),
        description: msg(
            'Log in, registration, password reset and account settings work from the first run.',
        ),
    },
    {
        icon: <LayoutOutlined />,
        title: msg('Ant Design pages'),
        description: msg(
            'Lists, forms, dashboards and error pages are built from Ant Design and Pro components, in light and dark.',
        ),
    },
    {
        icon: <CheckCircleOutlined />,
        title: msg('One command to finish'),
        description: msg(
            'composer check runs the formatters, static analysis, type checks and every test.',
        ),
    },
];

/**
 * The public home page: a Tailwind layout (it is a marketing page, not an app
 * page) with antd's components for everything that has a colour. The links
 * follow who is looking: the dashboard for a signed-in user, otherwise
 * sign-in, and sign-up while registration is on.
 */
export default function Welcome() {
    const { auth, features: enabled, name } = usePage().props;
    const signedIn = Boolean(auth.user);

    return (
        <>
            <Head title={t('Welcome')} />

            <Layout className="min-h-dvh">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
                    <Flex align="center" gap="small">
                        <AppLogo size={28} />
                        <Typography.Text strong>{name}</Typography.Text>
                    </Flex>
                    <LanguageSwitch />
                </header>

                <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-12 md:px-6">
                    <section className="flex max-w-2xl flex-col items-start gap-4">
                        <Typography.Title level={1}>
                            {t('Build on an app that checks itself')}
                        </Typography.Title>
                        <Typography.Paragraph type="secondary">
                            {t(
                                'Laravel, Inertia and React with Ant Design, accounts, settings and a quality gate already in place.',
                            )}
                        </Typography.Paragraph>
                        <Space wrap>
                            {signedIn ? (
                                <Link
                                    as={Button}
                                    type="primary"
                                    href={dashboard()}
                                >
                                    {t('Dashboard')}
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        as={Button}
                                        type="primary"
                                        href={login()}
                                    >
                                        {t('Log in')}
                                    </Link>
                                    {enabled.registration && (
                                        <Link as={Button} href={register()}>
                                            {t('Register')}
                                        </Link>
                                    )}
                                </>
                            )}
                        </Space>
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        {features.map(({ icon, title, description }) => (
                            <Card key={title}>
                                <Flex vertical gap="small">
                                    <Typography.Text type="secondary">
                                        {icon}
                                    </Typography.Text>
                                    <Typography.Title level={4}>
                                        {t(title)}
                                    </Typography.Title>
                                    <Typography.Paragraph type="secondary">
                                        {t(description)}
                                    </Typography.Paragraph>
                                </Flex>
                            </Card>
                        ))}
                    </section>
                </main>
            </Layout>
        </>
    );
}
