import {
    PageContainer,
    ProCard,
    StatisticCard,
} from '@ant-design/pro-components';
import { Head, InfiniteScroll, Link } from '@inertiajs/react';
import { Button, Col, Flex, Listy, Progress, Row, Typography } from 'antd';
import { msg, t } from '@/lib/i18n';
import {
    formatMoney,
    orderEvents,
    orderStatuses,
} from '@/pages/examples/orders/order';
import type { OrderStatus } from '@/pages/examples/orders/order';
import { show } from '@/routes/examples/orders';
import PageTitle from '@/ui/page-title';

/*
 * The dashboard example: figures in StatisticCards, shares in Progress bars,
 * and an activity feed that loads more at its end instead of paging. The
 * cards are laid out by antd's Row and Col, which follow the screen's width in
 * CSS, so the server's page has the right number of columns too.
 */

type Figures = {
    orders: number;
    /** In cents, like every amount. */
    revenue: number;
    averageOrder: number;
    awaitingPayment: number;
    /** How many orders have each status. PHP sends none as `[]`. */
    statuses: Partial<Record<OrderStatus, number>> | [];
};

/** What happened to an order: it reached the status `event` on `at`. */
type ActivityEntry = {
    key: string;
    order_id: number;
    number: string;
    customer: string;
    event: OrderStatus;
    at: string;
};

/** A scroll prop (`Inertia::scroll`): the page's entries; Inertia keeps where the next page is. */
type ActivityFeed = { data: ActivityEntry[] };

/** One line of the feed: what happened, to which order, whose, and when. */
function ActivityLine({ entry }: { entry: ActivityEntry }) {
    return (
        <Flex
            justify="space-between"
            gap="small"
            wrap
            data-test="activity-entry"
        >
            <Flex gap="small" wrap>
                <span>{t(orderEvents[entry.event])}</span>
                <Link href={show.url(entry.order_id)}>{entry.number}</Link>
                <Typography.Text type="secondary">
                    {entry.customer}
                </Typography.Text>
            </Flex>
            <Typography.Text type="secondary">{entry.at}</Typography.Text>
        </Flex>
    );
}

export default function DashboardExample({
    figures,
    activity,
}: {
    figures: Figures;
    activity: ActivityFeed;
}) {
    const statuses = Array.isArray(figures.statuses) ? {} : figures.statuses;
    const cards = [
        { title: msg('Orders'), value: figures.orders },
        { title: msg('Revenue'), value: formatMoney(figures.revenue) },
        {
            title: msg('Average order value'),
            value: formatMoney(figures.averageOrder),
        },
        { title: msg('Awaiting payment'), value: figures.awaitingPayment },
    ];
    const title = t('Sales overview');

    return (
        <>
            <Head title={title} />

            <PageContainer
                title={<PageTitle>{title}</PageTitle>}
                breadcrumb={{ items: [{ title: t('Examples') }, { title }] }}
            >
                <Flex vertical gap="middle">
                    <Row gutter={[16, 16]}>
                        {cards.map((card) => (
                            <Col key={card.title} xs={24} sm={12} xl={6}>
                                <StatisticCard
                                    statistic={{
                                        title: t(card.title),
                                        value: card.value,
                                    }}
                                />
                            </Col>
                        ))}
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} lg={8}>
                            <ProCard
                                title={t('Orders by status')}
                                headerBordered
                            >
                                <Flex vertical gap="small">
                                    {Object.entries(orderStatuses).map(
                                        ([status, { label }]) => (
                                            <div key={status}>
                                                <Typography.Text>
                                                    {t(label)}
                                                </Typography.Text>
                                                <Progress
                                                    percent={Math.round(
                                                        ((statuses[
                                                            status as OrderStatus
                                                        ] ?? 0) /
                                                            Math.max(
                                                                1,
                                                                figures.orders,
                                                            )) *
                                                            100,
                                                    )}
                                                />
                                            </div>
                                        ),
                                    )}
                                </Flex>
                            </ProCard>
                        </Col>

                        <Col xs={24} lg={16}>
                            <ProCard
                                title={t('Recent activity')}
                                headerBordered
                            >
                                {/*
                                 * "Load more" asks for the next page of `activity` alone; the server
                                 * marks it a scroll prop, so Inertia adds its entries after these.
                                 * `preserveUrl` keeps the page number out of the address.
                                 */}
                                <InfiniteScroll
                                    data="activity"
                                    manual
                                    preserveUrl
                                    next={({ fetch, loading, hasMore }) =>
                                        hasMore && (
                                            <Button
                                                type="link"
                                                block
                                                loading={loading}
                                                onClick={fetch}
                                                data-test="load-more-activity-button"
                                            >
                                                {t('Load more')}
                                            </Button>
                                        )
                                    }
                                >
                                    <Listy
                                        items={activity.data}
                                        rowKey="key"
                                        itemRender={(entry) => (
                                            <ActivityLine entry={entry} />
                                        )}
                                    />
                                </InfiniteScroll>
                            </ProCard>
                        </Col>
                    </Row>
                </Flex>
            </PageContainer>
        </>
    );
}
