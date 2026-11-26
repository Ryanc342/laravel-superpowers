import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { preloadAllProFieldValueTypes } from '@ant-design/pro-components';
import type { InertiaAppSSRResponse, Page } from '@inertiajs/core';
import { createInertiaApp } from '@inertiajs/react';
import type { ResolvedComponent } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { ServerAppearance } from '@/ui/appearance';
import type { Appearance } from '@/ui/appearance';
import { pageLayouts, pageTitle } from '@/ui/page-shell';
import { DARK_SCOPE } from '@/ui/theme';

export type PageResolver = (
    name: string,
) => ResolvedComponent | Promise<ResolvedComponent>;

type InertiaRender = (
    page: Page,
    renderToString: (element: ReactElement) => string,
) => Promise<InertiaAppSSRResponse>;

/**
 * antd keys the CSS variables of a theme provider that names no key of its
 * own (Pro nests some in its layout: the side menu's) with React's `useId`,
 * as `.css-var-…`. The key depends on where the provider sits in the page, so
 * the build-time styles cannot hold them, and the browser writes them only
 * when its JavaScript runs.
 */
const NESTED_THEME_KEY = '.css-var-';

/**
 * The CSS variable blocks of the nested theme providers a render used. They
 * are flat rules: a selector, then declarations.
 */
function nestedThemeVariables(cache: ReturnType<typeof createCache>): string[] {
    const css = extractStyle(cache, {
        plain: true,
        types: ['token', 'cssVar'],
    });

    return (css.match(/[^{}]+\{[^{}]*\}/g) ?? []).filter((rule) =>
        rule.slice(0, rule.indexOf('{')).includes(NESTED_THEME_KEY),
    );
}

function underDarkScope(rule: string): string {
    const open = rule.indexOf('{');
    const selectors = rule
        .slice(0, open)
        .split(',')
        .map((selector) => `${DARK_SCOPE}${selector.trim()}`);

    return `${selectors.join(',')}${rule.slice(open)}`;
}

/**
 * The server render of every page: the page, in the layouts and providers the
 * browser gives it (`ui/page-shell.tsx`), and in the head the CSS variables
 * of the theme providers Pro nests, so the side menu is styled before the
 * browser's JavaScript runs.
 *
 * The server cannot see the visitor's theme (the `appearance` cookie, or the
 * browser's own setting for `system`), so it renders the page light, and
 * again dark for the dark theme's variables, which apply under `html.dark`
 * like the build-time styles' dark copies. The two renders put the providers
 * in the same places, so their keys are the same. A page with no nested
 * provider is rendered once and gets no styles.
 *
 * The styles are in `@layer antd`, so the variables antd writes in the browser
 * (outside any layer) take over once it runs, also when the theme changes.
 * They carry no `data-inertia`, so a visit leaves them in place.
 *
 * Pro loads each kind of field's code the first time one shows, behind
 * Suspense, and a server render does not wait for it: the field would be a
 * "…" until the browser's JavaScript ran. So every kind is loaded before the
 * first render. The browser loads them before it hydrates (`app.tsx`).
 */
export function serverRenderer(
    resolve: PageResolver,
): (page: Page) => Promise<InertiaAppSSRResponse> {
    const proFields = preloadAllProFieldValueTypes();
    const inertiaRender = createInertiaApp({
        resolve,
        title: pageTitle,
        layout: pageLayouts,
        strictMode: true,
    }) as Promise<InertiaRender>;

    async function renderAs(appearance: Appearance, page: Page) {
        const render = await inertiaRender;
        const cache = createCache();
        const response = await render(page, (element) =>
            renderToString(
                <StyleProvider cache={cache}>
                    <ServerAppearance value={appearance}>
                        {element}
                    </ServerAppearance>
                </StyleProvider>,
            ),
        );

        return { response, variables: nestedThemeVariables(cache) };
    }

    return async (page) => {
        await proFields;

        const light = await renderAs('system', page);

        if (light.variables.length === 0) {
            return light.response;
        }

        const dark = await renderAs('dark', page);
        const css = [
            ...light.variables,
            ...dark.variables.map(underDarkScope),
        ].join('');

        return {
            ...light.response,
            head: [
                ...light.response.head,
                `<style>@layer antd{${css}}</style>`,
            ],
        };
    };
}
