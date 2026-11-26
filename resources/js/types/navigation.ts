import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
};

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
