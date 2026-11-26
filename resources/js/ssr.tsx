import createServer from '@inertiajs/react/server';
import { resolvePage } from '@/ui/pages';
import { serverRenderer } from '@/ui/server-render';

/*
 * The SSR server (`npm run build:ssr`, `php artisan inertia:start-ssr`, and
 * the Vite dev server's SSR endpoint). The render itself is in
 * `ui/server-render.tsx`, and the pages are found in `ui/pages.ts`.
 */

createServer(serverRenderer(resolvePage));
