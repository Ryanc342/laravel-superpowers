import {
    PageContainer,
    ProCard,
    ProForm,
    ProFormDatePicker,
    ProFormDigit,
    ProFormList,
    ProFormText,
    ProFormTextArea,
} from '@ant-design/pro-components';
import { Head, Link } from '@inertiajs/react';
import { Alert, Button, Col, Flex, Row } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { t } from '@/lib/i18n';
import type { OrderItem } from '@/pages/examples/orders/order';
import { index, show, store, update } from '@/routes/examples/orders';
import { useInertiaForm } from '@/ui/form';
import PageTitle from '@/ui/page-title';

/*
 * The create/edit example: a long form on its own page, in sections. The
 * server checks each field while the user types (Precognition) and on submit,
 * and its errors show under the fields. Nothing here checks a value: the
 * asterisks only mark the fields the server requires.
 */

/** The order being edited, or null for a new one. */
type EditedOrder = {
    id: number;
    number: string;
    customer: string;
    ordered_at: string;
    notes: string | null;
    items: OrderItem[];
};

type OrderValues = {
    customer: string;
    ordered_at: Dayjs | null;
    items: { name: string; quantity: number | null }[];
    notes: string | null;
};

/** A new order starts with one empty line, which is what most orders need. */
const NEW_ITEM = { name: '', quantity: 1 };

function valuesOf(order: EditedOrder | null): OrderValues {
    if (order === null) {
        return {
            customer: '',
            ordered_at: null,
            items: [NEW_ITEM],
            notes: null,
        };
    }

    return {
        customer: order.customer,
        ordered_at: dayjs(order.ordered_at),
        items: order.items.map(({ name, quantity }) => ({ name, quantity })),
        notes: order.notes,
    };
}

export default function OrderForm({ order }: { order: EditedOrder | null }) {
    const { formProps, unplacedErrors } = useInertiaForm<OrderValues>(
        order === null ? store() : update(order.id),
        valuesOf(order),
        // One name for a new order and an edited one, whatever its number.
        { name: 'order' },
    );
    const title =
        order === null
            ? t('New order')
            : t('Edit :number', { number: order.number });
    const cancelHref = order === null ? index.url() : show.url(order.id);

    return (
        <>
            <Head title={title} />

            <PageContainer
                title={<PageTitle>{title}</PageTitle>}
                breadcrumb={{
                    items: [
                        { title: t('Examples') },
                        {
                            title: (
                                <Link href={index.url()}>{t('Orders')}</Link>
                            ),
                        },
                        ...(order === null
                            ? [{ title }]
                            : [
                                  {
                                      title: (
                                          <Link href={show.url(order.id)}>
                                              {order.number}
                                          </Link>
                                      ),
                                  },
                                  { title: t('Edit') },
                              ]),
                    ],
                }}
            >
                <ProForm<OrderValues>
                    {...formProps}
                    submitter={{
                        searchConfig: { submitText: t('Save') },
                        submitButtonProps: { 'data-test': 'save-order-button' },
                        // Save, then the way out, under the fields on the left.
                        render: (_, [, submit]) => [
                            submit,
                            <Link key="cancel" as={Button} href={cancelHref}>
                                {t('Cancel')}
                            </Link>,
                        ],
                    }}
                >
                    <Flex vertical gap="middle">
                        {unplacedErrors.length > 0 && (
                            <Alert
                                type="error"
                                showIcon
                                title={unplacedErrors.join(' ')}
                            />
                        )}

                        {/* antd's grid lays the fields out in CSS, so the server's page fits a phone too. */}
                        <ProCard title={t('Customer')} headerBordered>
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="customer"
                                        label={t('Customer')}
                                        required
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormDatePicker
                                        name="ordered_at"
                                        label={t('Order date')}
                                        required
                                    />
                                </Col>
                            </Row>
                        </ProCard>

                        <ProCard title={t('Order lines')} headerBordered>
                            {/* ProFormList shows the list's own error, such as no items, under it. */}
                            <ProFormList
                                name="items"
                                creatorButtonProps={{
                                    creatorButtonText: t('Add product'),
                                }}
                                creatorRecord={NEW_ITEM}
                                copyIconProps={false}
                            >
                                <Row gutter={16}>
                                    <Col xs={16} md={12}>
                                        <ProFormText
                                            name="name"
                                            label={t('Product')}
                                            required
                                        />
                                    </Col>
                                    <Col xs={8} md={6}>
                                        <ProFormDigit
                                            name="quantity"
                                            label={t('Quantity')}
                                            required
                                        />
                                    </Col>
                                </Row>
                            </ProFormList>
                        </ProCard>

                        <ProCard title={t('Notes')} headerBordered>
                            <ProFormTextArea name="notes" label={t('Notes')} />
                        </ProCard>
                    </Flex>
                </ProForm>
            </PageContainer>
        </>
    );
}
