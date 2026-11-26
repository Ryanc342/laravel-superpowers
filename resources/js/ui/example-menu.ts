import { ExperimentOutlined } from '@ant-design/icons';
import { createElement } from 'react';
import { msg } from '@/lib/i18n';
import { index as orders } from '@/routes/examples/orders';
import type { MenuItem } from '@/types';

/**
 * The menu's group of page-type examples, which the layout adds after the
 * app's own entries where the examples exist: in the `local` and `testing`
 * environments (the `examples` prop). The group's `href` is where the
 * examples' URLs start (`routes/examples.php`); it is not a page.
 */
export function exampleMenu(): MenuItem[] {
    return [
        {
            key: 'examples',
            label: msg('Examples'),
            href: '/examples',
            icon: createElement(ExperimentOutlined),
            children: [
                {
                    key: 'examples.orders',
                    label: msg('Orders'),
                    href: orders.url(),
                },
            ],
        },
    ];
}
