import { createInertiaApp } from '@inertiajs/react';
import 'virtual:antd.css';
import { pageLayouts, pageTitle } from '@/ui/page-shell';
import { resolvePage } from '@/ui/pages';

// The pages are found in ui/pages.ts, which the SSR server shares, so that a
// build without the page-type examples leaves them out of both.
void createInertiaApp({
    resolve: resolvePage,
    title: pageTitle,
    layout: pageLayouts,
    strictMode: true,
    progress: {
        color: '#4B5563',
    },
});
