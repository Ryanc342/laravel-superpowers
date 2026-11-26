import type { ReactNode } from 'react';

/**
 * An entry of the signed-in layout's menu. `label` is the English sentence,
 * marked with `msg()` where it is written and translated where it is shown.
 * `href` is a path from Wayfinder (`dashboard.url()`), so the layout can tell
 * which entry is the current page.
 */
export type MenuItem = {
    key: string;
    label: string;
    href: string;
    icon?: ReactNode;
    children?: MenuItem[];
};

/**
 * A menu entry the server sends, as the `examples` prop. The label is English,
 * and the layout translates it like the app's own.
 */
export type SharedMenuItem = {
    key: string;
    label: string;
    href: string;
    children?: SharedMenuItem[];
};
