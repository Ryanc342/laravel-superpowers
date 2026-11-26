import { PageContainer, StatisticCard } from '@ant-design/pro-components';
import { Head } from '@inertiajs/react';
import { Alert, Col, Flex, Row } from 'antd';
import { msg, t } from '@/lib/i18n';
import PageTitle from '@/ui/page-title';

/**
 * Placeholder figures, so the page shows how a dashboard looks. A project
 * replaces them with its own.
 */
const figures = [
    { title: msg('Visits'), value: 12846 },
    { title: msg('New sign-ups'), value: 328 },
    { title: msg('Orders'), value: 1204 },
    { title: msg('Revenue'), value: 86420 },
];

/**
 * The cards are laid out by antd's `Row` and `Col`, which follow the screen's
 * width in CSS. Pro's `StatisticCard.Group` with a `colSpan` follows it in
 * JavaScript, so the server's page would show the wrong number of columns
 * until the browser's script ran.
 */
export default function Dashboard() {
    return (
        <>
            <Head title={t('Dashboard')} />

            <PageContainer title={<PageTitle>{t('Dashboard')}</PageTitle>}>
                <Flex vertical gap="middle">
                    <Alert
                        type="info"
                        showIcon
                        title={t('Replace with your own figures')}
                    />

                    <Row gutter={[16, 16]}>
                        {figures.map(({ title, value }) => (
                            <Col key={title} xs={24} sm={12} xl={6}>
                                <StatisticCard
                                    statistic={{ title: t(title), value }}
                                />
                            </Col>
                        ))}
                    </Row>
                </Flex>
            </PageContainer>
        </>
    );
}
