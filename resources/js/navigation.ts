import { DashboardOutlined } from '@ant-design/icons';
import { createElement } from 'react';
import { msg } from '@/lib/i18n';
import { dashboard } from '@/routes';
import type { MenuItem } from '@/types';

/**
 * The app's own entries in the signed-in layout's menu, in order. Add a page
 * here when the menu should lead to it; a `children` list makes a group. Mark
 * each label with `msg()` and give it a Chinese translation in
 * `lang/zh_CN.json`.
 */
export const appMenu: MenuItem[] = [
    {
        key: 'dashboard',
        label: msg('Dashboard'),
        href: dashboard.url(),
        icon: createElement(DashboardOutlined),
    },
];
