import { Link, usePage } from '@inertiajs/react';
import { Card, Col, Flex, Row, theme, Typography } from 'antd';
import type { ReactNode } from 'react';
import AppLogo from '@/components/app-logo';
import LanguageSwitch from '@/components/language-switch';
import { home } from '@/routes';

/**
 * The layout of the sign-in pages: a card in the middle of the screen, with
 * the language switch, the app's mark (a link home), the page's title and
 * description, and the page. The page sets `title` and `description`, already
 * translated, as layout props. The title is the page's one h1, in the size of
 * antd's third heading level.
 */
export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: ReactNode;
}) {
    const { name } = usePage().props;
    const { token } = theme.useToken();

    return (
        <Row justify="center" align="middle" style={{ minHeight: '100svh' }}>
            <Col xs={22} sm={16} md={12} lg={8} xl={6}>
                <Card>
                    <Flex vertical gap="large">
                        <Flex justify="flex-end">
                            <LanguageSwitch />
                        </Flex>
                        <Flex
                            vertical
                            align="center"
                            gap="small"
                            style={{ textAlign: 'center' }}
                        >
                            <Link href={home()} aria-label={name}>
                                <AppLogo size={40} />
                            </Link>
                            <Typography.Title
                                level={1}
                                style={{
                                    margin: 0,
                                    fontSize: token.fontSizeHeading3,
                                    lineHeight: token.lineHeightHeading3,
                                }}
                            >
                                {title}
                            </Typography.Title>
                            {description && (
                                <Typography.Text type="secondary">
                                    {description}
                                </Typography.Text>
                            )}
                        </Flex>
                        {children}
                    </Flex>
                </Card>
            </Col>
        </Row>
    );
}
