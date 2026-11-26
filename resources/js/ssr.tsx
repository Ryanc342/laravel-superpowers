import type { ResolvedComponent } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { serverRenderer } from '@/ui/server-render';

/*
 * The SSR server (`npm run build:ssr`, `php artisan inertia:start-ssr`, and
 * the Vite dev server's SSR endpoint). The render itself is in
 * `ui/server-render.tsx`.
 */

const pages = import.meta.glob<{ default: ResolvedComponent }>(
    './pages/**/*.tsx',
);

async function resolvePage(name: string): Promise<ResolvedComponent> {
    const page = pages[`./pages/${name}.tsx`];

    if (!page) {
        throw new Error(`Page not found: ${name}`);
    }

    return (await page()).default;
}

createServer(serverRenderer(resolvePage));
