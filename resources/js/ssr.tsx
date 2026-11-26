import createServer from '@inertiajs/react/server';
import { resolvePage } from '@/ui/pages';
import { serverRenderer } from '@/ui/server-render';

/*
 * The SSR server (`npm run build:ssr`, `php artisan inertia:start-ssr`, and
 * the Vite dev server's SSR endpoint). The render itself is in
 * `ui/server-render.tsx`, and the pages are found in `ui/pages.ts`.
 *
 * It listens on Inertia's own port, 13714, which `config/inertia.php`'s
 * `ssr.url` names. `INERTIA_SSR_PORT` moves it: the browser tests start a
 * server of their own on a free port, next to one a developer has running.
 */

createServer(serverRenderer(resolvePage), {
    port: Number(process.env.INERTIA_SSR_PORT) || 13714,
});
