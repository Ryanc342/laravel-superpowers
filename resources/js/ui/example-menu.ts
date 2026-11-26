import { ExperimentOutlined } from '@ant-design/icons';
import { createElement } from 'react';
import type { MenuItem, SharedMenuItem } from '@/types';

/**
 * The menu's group of page-type examples, which the layout adds after the
 * app's own entries where the examples exist: in the `local` and `testing`
 * environments. The server sends the entries (the `examples` prop, `null`
 * elsewhere), so no code here names an example route: a production build has
 * none. This gives each top-level entry the examples' icon.
 */
export function exampleMenu(items: SharedMenuItem[] | null): MenuItem[] {
    return (items ?? []).map((item) => ({
        ...item,
        icon: createElement(ExperimentOutlined),
    }));
}
