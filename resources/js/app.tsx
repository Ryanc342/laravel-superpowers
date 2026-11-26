import { preloadAllProFieldValueTypes } from '@ant-design/pro-components';
import { createInertiaApp } from '@inertiajs/react';
import 'virtual:antd.css';
import '@/ui/responsive.css';
import { pageLayouts, pageTitle } from '@/ui/page-shell';
import { resolvePage } from '@/ui/pages';

// Pro loads each kind of field's code the first time one shows, and shows "…"
// in its place until then. The server renders the fields themselves
// (ui/server-render.tsx), so a page it rendered waits for their code, loaded
// next to the page's, before React hydrates it: else React would put the "…"
// over them. A page the browser renders by itself does not wait. Code that
// fails to load holds nothing back: only a field that needs it fails, as it
// would have without this.
const proFields = preloadAllProFieldValueTypes().catch(() => undefined);
const isServerRendered =
    document.getElementById('app')?.hasAttribute('data-server-rendered') ===
    true;

// The pages are found in ui/pages.ts, which the SSR server shares, so that a
// build without the page-type examples leaves them out of both.
void createInertiaApp({
    resolve: async (name) => {
        const [page] = await Promise.all([
            resolvePage(name),
            isServerRendered ? proFields : undefined,
        ]);

        return page;
    },
    title: pageTitle,
    layout: pageLayouts,
    strictMode: true,
    progress: {
        color: '#4B5563',
    },
});
