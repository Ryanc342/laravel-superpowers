import { PlusOutlined } from '@ant-design/icons';
import {
    PageContainer,
    ProCard,
    ProFormDatePicker,
    ProFormText,
    ProTable,
} from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Head, Link } from '@inertiajs/react';
import { Alert, Button, Empty, Popconfirm, Tag } from 'antd';
import type { ButtonProps } from 'antd';
import type { Dayjs } from 'dayjs';
import { t } from '@/lib/i18n';
import {
    deleteOrder,
    formatMoney,
    orderStatuses,
    statusTag,
} from '@/pages/examples/orders/order';
import type { OrderRow } from '@/pages/examples/orders/order';
import { create, edit, show, store } from '@/routes/examples/orders';
import { ResponsiveModalForm } from '@/ui/dialog';
import { useInertiaForm } from '@/ui/form';
import { sortOrderOf, useInertiaTable } from '@/ui/list';
import type { ListProps } from '@/ui/list';
import PageTitle from '@/ui/page-title';

/*
 * The list example: a ProTable whose search form, sort, page and rows per page
 * live in the URL (`useInertiaTable`), so the browser's back button comes back
 * to the same rows. The short create form is a dialog; the long one is a page.
 */

type QuickAddValues = {
    customer: string;
    ordered_at: Dayjs | null;
    draft: true;
};

/**
 * A short form in a dialog, a sheet on a phone: a draft order, with only the
 * customer and the date. The dialog stays mounted between openings, so a
 * saved draft empties each of its fields, and their checks start over.
 */
function QuickAdd() {
    const { formProps, unplacedErrors } = useInertiaForm<QuickAddValues>(
        store(),
        { customer: '', ordered_at: null, draft: true },
        // A shorter name than its route's, for its fields' ids: `quick_add_customer`.
        { resetOnSuccess: ['customer', 'ordered_at'], name: 'quick_add' },
    );

    return (
        <ResponsiveModalForm<QuickAddValues>
            {...formProps}
            title={t('Quick add')}
            width={480}
            trigger={
                <Button data-test="quick-add-button">{t('Quick add')}</Button>
            }
            modalProps={{ okText: t('Create draft') }}
        >
            {unplacedErrors.length > 0 && (
                <Alert type="error" showIcon title={unplacedErrors.join(' ')} />
            )}
            <ProFormText name="customer" label={t('Customer')} required />
            <ProFormDatePicker
                name="ordered_at"
                label={t('Order date')}
                required
            />
        </ResponsiveModalForm>
    );
}

function NewOrderButton({ dataTest }: { dataTest: string }) {
    return (
        <Link
            as={Button}
            type="primary"
            href={create.url()}
            data-test={dataTest}
        >
            <PlusOutlined />
            {t('New order')}
        </Link>
    );
}

/**
 * A row's action: a small link button. A link to a page is an Inertia link
 * drawn as one, `<Link as={RowAction} href>`, so it opens in a new tab too.
 */
function RowAction(props: ButtonProps) {
    return <Button type="link" size="small" {...props} />;
}

export default function OrdersIndex({
    orders,
    hasOrders,
}: {
    orders: ListProps<OrderRow>;
    /** Whether there is any order at all, whatever the search. */
    hasOrders: boolean;
}) {
    const table = useInertiaTable(orders, 'orders');
    const columns: ProColumns<OrderRow>[] = [
        {
            title: t('Order number'),
            dataIndex: 'number',
            sorter: true,
            sortOrder: sortOrderOf(orders, 'number'),
        },
        { title: t('Customer'), dataIndex: 'customer' },
        {
            title: t('Status'),
            dataIndex: 'status',
            valueType: 'select',
            valueEnum: Object.fromEntries(
                Object.entries(orderStatuses).map(([status, { label }]) => [
                    status,
                    { text: t(label) },
                ]),
            ),
            render: (_, order) => <Tag {...statusTag(order.status)} />,
        },
        {
            title: t('Amount'),
            dataIndex: 'total',
            search: false,
            sorter: true,
            sortOrder: sortOrderOf(orders, 'total'),
            align: 'right',
            render: (_, order) => formatMoney(order.total),
        },
        {
            title: t('Order date'),
            dataIndex: 'ordered_at',
            search: false,
            sorter: true,
            sortOrder: sortOrderOf(orders, 'ordered_at'),
        },
        {
            title: t('Actions'),
            valueType: 'option',
            key: 'actions',
            render: (_, order) => [
                <Link
                    key="view"
                    as={RowAction}
                    href={show.url(order.id)}
                    data-test="view-order-button"
                >
                    {t('View')}
                </Link>,
                <Link key="edit" as={RowAction} href={edit.url(order.id)}>
                    {t('Edit')}
                </Link>,
                <Popconfirm
                    key="delete"
                    title={t('Delete this order?')}
                    okText={t('Delete')}
                    okButtonProps={{ danger: true }}
                    onConfirm={() => deleteOrder(order)}
                >
                    <RowAction danger data-test="delete-order-button">
                        {t('Delete')}
                    </RowAction>
                </Popconfirm>,
            ],
        },
    ];

    return (
        <>
            <Head title={t('Orders')} />

            <PageContainer
                title={<PageTitle>{t('Orders')}</PageTitle>}
                breadcrumb={{
                    items: [{ title: t('Examples') }, { title: t('Orders') }],
                }}
                extra={[
                    <QuickAdd key="quick-add" />,
                    <NewOrderButton
                        key="new-order"
                        dataTest="new-order-button"
                    />,
                ]}
            >
                {hasOrders ? (
                    <ProTable<OrderRow>
                        rowKey="id"
                        columns={columns}
                        options={false}
                        toolBarRender={false}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={t(
                                        'No orders match your search',
                                    )}
                                />
                            ),
                        }}
                        {...table}
                    />
                ) : (
                    // The first visit, before there is any order: one line
                    // that says what to do, and the way to do it.
                    <ProCard>
                        <Empty
                            description={t(
                                'Create your first order to see it here',
                            )}
                        >
                            <NewOrderButton dataTest="first-order-button" />
                        </Empty>
                    </ProCard>
                )}
            </PageContainer>
        </>
    );
}
