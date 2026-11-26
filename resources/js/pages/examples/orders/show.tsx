import { EditOutlined } from '@ant-design/icons';
import {
    PageContainer,
    ProCard,
    ProDescriptions,
    ProTable,
} from '@ant-design/pro-components';
import type {
    ProColumns,
    ProDescriptionsItemProps,
} from '@ant-design/pro-components';
import { Head, Link } from '@inertiajs/react';
import { Button, Flex, Popconfirm, Tag, Timeline, Typography } from 'antd';
import { t } from '@/lib/i18n';
import {
    deleteOrder,
    formatMoney,
    orderEvents,
    statusTag,
} from '@/pages/examples/orders/order';
import type {
    OrderItem,
    OrderRow,
    OrderStatus,
} from '@/pages/examples/orders/order';
import { edit, index } from '@/routes/examples/orders';
import PageTitle from '@/ui/page-title';

/*
 * The detail example: the page's actions in its header, the order's fields
 * in ProDescriptions, and what belongs to it (its lines, its history) in tabs.
 */

type Order = OrderRow & {
    notes: string | null;
    items: OrderItem[];
    /** The statuses the order went through, oldest first, each with its date. */
    history: { status: OrderStatus; at: string }[];
};

export default function OrderShow({ order }: { order: Order }) {
    const fields: ProDescriptionsItemProps<Order>[] = [
        { title: t('Customer'), dataIndex: 'customer' },
        {
            title: t('Status'),
            dataIndex: 'status',
            render: () => <Tag {...statusTag(order.status)} />,
        },
        { title: t('Order date'), dataIndex: 'ordered_at' },
        {
            title: t('Amount'),
            dataIndex: 'total',
            render: () => formatMoney(order.total),
        },
        { title: t('Notes'), dataIndex: 'notes', span: 2 },
    ];
    const itemColumns: ProColumns<OrderItem>[] = [
        { title: t('Product'), dataIndex: 'name' },
        { title: t('Quantity'), dataIndex: 'quantity', align: 'right' },
        {
            title: t('Unit price'),
            dataIndex: 'price',
            align: 'right',
            render: (_, item) => formatMoney(item.price),
        },
        {
            title: t('Subtotal'),
            key: 'subtotal',
            align: 'right',
            render: (_, item) => formatMoney(item.price * item.quantity),
        },
    ];

    return (
        <>
            <Head title={order.number} />

            <PageContainer
                title={<PageTitle>{order.number}</PageTitle>}
                tags={<Tag {...statusTag(order.status)} />}
                breadcrumb={{
                    items: [
                        { title: t('Examples') },
                        {
                            title: (
                                <Link href={index.url()}>{t('Orders')}</Link>
                            ),
                        },
                        { title: order.number },
                    ],
                }}
                extra={[
                    <Link
                        key="edit"
                        as={Button}
                        href={edit.url(order.id)}
                        data-test="edit-order-button"
                    >
                        <EditOutlined />
                        {t('Edit')}
                    </Link>,
                    <Popconfirm
                        key="delete"
                        title={t('Delete this order?')}
                        okText={t('Delete')}
                        okButtonProps={{ danger: true }}
                        onConfirm={() => deleteOrder(order)}
                    >
                        <Button danger data-test="delete-order-button">
                            {t('Delete')}
                        </Button>
                    </Popconfirm>,
                ]}
            >
                <Flex vertical gap="middle">
                    <ProCard title={t('Order details')} headerBordered>
                        <ProDescriptions<Order>
                            dataSource={order}
                            columns={fields}
                            column={{ xs: 1, md: 2 }}
                        />
                    </ProCard>

                    <ProCard
                        tabs={{
                            items: [
                                {
                                    key: 'items',
                                    label: t('Order lines'),
                                    children: (
                                        <ProTable<OrderItem>
                                            rowKey="line"
                                            columns={itemColumns}
                                            dataSource={order.items}
                                            search={false}
                                            options={false}
                                            toolBarRender={false}
                                            pagination={false}
                                            ghost
                                            scroll={{ x: 'max-content' }}
                                        />
                                    ),
                                },
                                {
                                    key: 'history',
                                    label: t('History'),
                                    children: (
                                        <Timeline
                                            items={order.history.map(
                                                ({ status, at }) => ({
                                                    key: status,
                                                    content: (
                                                        <Flex gap="small">
                                                            {t(
                                                                orderEvents[
                                                                    status
                                                                ],
                                                            )}
                                                            <Typography.Text type="secondary">
                                                                {at}
                                                            </Typography.Text>
                                                        </Flex>
                                                    ),
                                                }),
                                            )}
                                        />
                                    ),
                                },
                            ],
                        }}
                    />
                </Flex>
            </PageContainer>
        </>
    );
}
