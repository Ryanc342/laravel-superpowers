import { router } from '@inertiajs/react';
import { msg, t } from '@/lib/i18n';
import { destroy } from '@/routes/examples/orders';

/*
 * What the orders example's pages share: the shape of an order, how its
 * status and money show, and deleting it. This file is not a page: pages are
 * `.tsx`.
 */

export type OrderStatus = 'open' | 'paid' | 'shipped' | 'cancelled';

/** An order as the list shows it. Money is in cents. */
export type OrderRow = {
    id: number;
    number: string;
    customer: string;
    status: OrderStatus;
    total: number;
    ordered_at: string;
};

/** A line of an order. `price` is in cents. */
export type OrderItem = { name: string; quantity: number; price: number };

/**
 * Each status's label and its tag's colour: antd's preset status colours,
 * which have a light background and coloured text. Translate the label where
 * it is shown, with `t()`.
 */
export const orderStatuses: Record<
    OrderStatus,
    { label: string; color: 'warning' | 'processing' | 'success' | 'default' }
> = {
    open: { label: msg('Open'), color: 'warning' },
    paid: { label: msg('Paid'), color: 'processing' },
    shipped: { label: msg('Shipped'), color: 'success' },
    cancelled: { label: msg('Cancelled'), color: 'default' },
};

/** A status's `Tag`: `<Tag {...statusTag(order.status)} />`. */
export function statusTag(status: OrderStatus): {
    color: string;
    children: string;
} {
    const { label, color } = orderStatuses[status];

    return { color, children: t(label) };
}

/**
 * Deletes an order, for a `Popconfirm`'s `onConfirm`: its OK button spins
 * until the server has answered. The server says where to go next.
 */
export function deleteOrder(order: { id: number }): Promise<void> {
    return new Promise((resolve) => {
        router.delete(destroy(order.id), {
            preserveScroll: true,
            onFinish: () => resolve(),
        });
    });
}

const yuan = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
});

/** An amount in cents as yuan, `¥1,234.50`, the same in both languages. */
export function formatMoney(cents: number): string {
    return yuan.format(cents / 100);
}
