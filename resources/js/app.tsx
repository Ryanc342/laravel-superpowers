import { createInertiaApp } from '@inertiajs/react';
import 'virtual:antd.css';
import { appProviders, pageLayouts, pageTitle } from '@/ui/page-shell';

void createInertiaApp({
    title: pageTitle,
    layout: pageLayouts,
    strictMode: true,
    withApp: appProviders,
    progress: {
        color: '#4B5563',
    },
});
