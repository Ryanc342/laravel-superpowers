import { DownloadOutlined } from '@ant-design/icons';
import {
    PageContainer,
    ProTable,
    StatisticCard,
} from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Head } from '@inertiajs/react';
import { Button, Col, Flex, Row, Table } from 'antd';
import { msg, t } from '@/lib/i18n';
import { formatMoney } from '@/pages/examples/orders/order';
import { exportMethod } from '@/routes/examples/report';
import { sortOrderOf, useInertiaTable } from '@/ui/list';
import type { ListProps } from '@/ui/list';
import PageTitle from '@/ui/page-title';

/*
 * The report example: sales by product in a date range. The range is a
 * search field of the table (`valueType: 'dateRange'`), so it lives in the
 * URL like any filter, as two calendar dates. The totals are the whole
 * range's, from the server: the statistics above the table and its summary
 * row show them, whatever page the table is on. Export downloads the same
 * rows as a CSV, for the same range and sort.
 */

/** A product's sales in the range. Money is in cents. */
type SalesRow = {
    product: string;
    units: number;
    average_price: number;
    revenue: number;
};

type SalesTotals = {
    orders: number;
    units: number;
    revenue: number;
    average_order: number;
};

type SalesList = ListProps<SalesRow> & { totals: SalesTotals };

export default function ReportExample({ sales }: { sales: SalesList }) {
    const table = useInertiaTable(sales, 'sales');
    const filters = Array.isArray(sales.filters) ? {} : sales.filters;
    const period = Array.isArray(filters.ordered_at)
        ? (filters.ordered_at as string[])
        : undefined;
    const exportUrl = exportMethod.url({
        query: { filter: { ordered_at: period }, sort: sales.sort },
    });
    const { totals } = sales;
    const figures = [
        { title: msg('Orders'), value: totals.orders },
        { title: msg('Revenue'), value: formatMoney(totals.revenue) },
        {
            title: msg('Average order value'),
            value: formatMoney(totals.average_order),
        },
        { title: msg('Units sold'), value: totals.units },
    ];
    const columns: ProColumns<SalesRow>[] = [
        // The range is only searched by: the rows are products, not orders.
        {
            title: t('Order date'),
            dataIndex: 'ordered_at',
            valueType: 'dateRange',
            hideInTable: true,
        },
        { title: t('Product'), dataIndex: 'product', search: false },
        {
            title: t('Units sold'),
            dataIndex: 'units',
            search: false,
            sorter: true,
            sortOrder: sortOrderOf(sales, 'units'),
            align: 'right',
        },
        {
            title: t('Average price'),
            dataIndex: 'average_price',
            search: false,
            align: 'right',
            render: (_, row) => formatMoney(row.average_price),
        },
        {
            title: t('Revenue'),
            dataIndex: 'revenue',
            search: false,
            sorter: true,
            sortOrder: sortOrderOf(sales, 'revenue'),
            align: 'right',
            render: (_, row) => formatMoney(row.revenue),
        },
    ];
    const title = t('Sales by product');

    return (
        <>
            <Head title={title} />

            <PageContainer
                title={<PageTitle>{title}</PageTitle>}
                breadcrumb={{ items: [{ title: t('Examples') }, { title }] }}
                extra={[
                    // A download, not a page: a plain link, not an Inertia visit.
                    <Button
                        key="export"
                        href={exportUrl}
                        icon={<DownloadOutlined />}
                        data-test="export-report-button"
                    >
                        {t('Export')}
                    </Button>,
                ]}
            >
                <Flex vertical gap="middle">
                    <Row gutter={[16, 16]}>
                        {figures.map((figure) => (
                            <Col key={figure.title} xs={24} sm={12} xl={6}>
                                <StatisticCard
                                    statistic={{
                                        title: t(figure.title),
                                        value: figure.value,
                                    }}
                                />
                            </Col>
                        ))}
                    </Row>

                    <ProTable<SalesRow>
                        rowKey="product"
                        columns={columns}
                        options={false}
                        toolBarRender={false}
                        summary={() => (
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0}>
                                    {t('Total')}
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                    {totals.units}
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} />
                                <Table.Summary.Cell index={3} align="right">
                                    {formatMoney(totals.revenue)}
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        )}
                        {...table}
                    />
                </Flex>
            </PageContainer>
        </>
    );
}
