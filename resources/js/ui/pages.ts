import type { ResolvedComponent } from '@inertiajs/react';

type PageModule = { default: ResolvedComponent };

/*
 * Every page, by its file under `pages/`. A build without the page-type
 * examples (`ui/vite-examples.ts`) has no example routes to import, so it
 * leaves their pages out. `__EXAMPLES__` is fixed when the build starts, and
 * the build drops the glob it does not use, with the pages that glob names.
 */
const pages = __EXAMPLES__
    ? import.meta.glob<PageModule>('../pages/**/*.tsx')
    : import.meta.glob<PageModule>([
          '../pages/**/*.tsx',
          '!../pages/examples/**',
      ]);

/**
 * The page named `name` (`settings/profile` is `pages/settings/profile.tsx`),
 * for the browser's app (`app.tsx`) and the SSR server (`ssr.tsx`).
 */
export async function resolvePage(name: string): Promise<ResolvedComponent> {
    const page = pages[`../pages/${name}.tsx`];

    if (!page) {
        throw new Error(`Page not found: ${name}`);
    }

    return (await page()).default;
}
