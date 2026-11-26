import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import RootLayout from '@/layouts/root-layout';
import SettingsLayout from '@/layouts/settings-layout';

/*
 * What the browser app (`app.tsx`) and the server render
 * (`ui/server-render.tsx`) give every page alike, so the page the server
 * renders is the one the browser hydrates.
 */

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

/** The browser tab's title: the page's own title, then the app's name. */
export function pageTitle(title: string): string {
    return title ? `${title} - ${appName}` : appName;
}

/**
 * The layouts a page sits in, outermost first, by the page's name. Every page
 * is in the root layout (antd's theme and language); signed-in pages are in
 * Pro's layout too.
 */
export function pageLayouts(name: string) {
    switch (true) {
        case name === 'welcome':
        case name === 'error':
            return RootLayout;
        case name.startsWith('auth/'):
            return [RootLayout, AuthLayout];
        case name.startsWith('settings/'):
            return [RootLayout, AppLayout, SettingsLayout];
        default:
            return [RootLayout, AppLayout];
    }
}
