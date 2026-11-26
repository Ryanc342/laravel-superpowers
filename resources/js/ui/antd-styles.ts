import { createRequire } from 'node:module';
import type * as CssInJs from '@ant-design/cssinjs';
import type * as ProComponents from '@ant-design/pro-components';
import type * as Antd from 'antd';
import type { ThemeConfig } from 'antd';
import type * as ReactModule from 'react';
import type { ReactElement } from 'react';
import type * as ReactDomServer from 'react-dom/server';
import { themeConfig } from './theme';
import type { ProjectTheme } from './theme';

type Modules = {
    cssinjs: typeof CssInJs;
    antd: typeof Antd;
    pro: typeof ProComponents;
    h: typeof ReactModule.createElement;
    Fragment: typeof ReactModule.Fragment;
    renderToString: typeof ReactDomServer.renderToString;
};

/**
 * The styles of antd, of the Pro components the template uses and of the
 * theme's CSS variables (light, and dark under `html.dark`), all in
 * `@layer antd`. The browser runs antd with `zeroRuntime`, so these are the
 * only component styles it gets.
 */
export function generateAntdCss(project: ProjectTheme): string {
    const modules = loadModules();
    // Styles are only registered with zeroRuntime off. Without the hash
    // class, the selectors match whether or not the browser adds one.
    const config: ThemeConfig = {
        ...themeConfig(project),
        zeroRuntime: false,
        hashed: false,
    };
    const light = extract(modules, config, ['style', 'token', 'cssVar']);
    const dark = extract(
        modules,
        { ...config, algorithm: modules.antd.theme.darkAlgorithm },
        ['token', 'cssVar'],
    );

    return `@layer antd {\n${withoutUnparsableRules(light)}\n${underDarkClass(dark)}\n}\n`;
}

/**
 * Everything is loaded through CommonJS. Pro's ES build does not run in Node
 * (it imports antd's locale files without their extension), and antd, React
 * and cssinjs must be the same instances Pro's CommonJS build requires, or
 * Pro's styles would go to a cache nothing reads. They load on the first call,
 * so importing this file (as vite.config.ts does) stays cheap.
 */
function loadModules(): Modules {
    const require = createRequire(import.meta.url);
    const react = require('react') as typeof ReactModule;

    return {
        cssinjs: require('@ant-design/cssinjs') as typeof CssInJs,
        antd: require('antd') as typeof Antd,
        pro: require('@ant-design/pro-components') as typeof ProComponents,
        h: react.createElement,
        Fragment: react.Fragment,
        renderToString: (require('react-dom/server') as typeof ReactDomServer)
            .renderToString,
    };
}

const CACHE_PATH_MARKER = /\.data-ant-cssinjs-cache-path\{content:"[^"]*";\}/;

function extract(
    modules: Modules,
    config: ThemeConfig,
    types: ('style' | 'token' | 'cssVar')[],
): string {
    const { antd, cssinjs, h, renderToString } = modules;
    const cache = cssinjs.createCache();
    const tree = h(
        cssinjs.StyleProvider,
        { cache },
        h(antd.ConfigProvider, { theme: config }, sampleTree(modules)),
    );

    withoutWarnings(() => renderToString(tree));

    // The marker lists the styles a server render put in the page, for the
    // browser to skip. These styles come from a file, so it has no use.
    return cssinjs
        .extractStyle(cache, { plain: true, types })
        .replace(CACHE_PATH_MARKER, '');
}

/**
 * antd warns about the sample tree (props it leaves out, deprecated
 * components it still renders for their styles). Those warnings say nothing
 * about the project's code, so they are not printed.
 */
function withoutWarnings(render: () => void): void {
    const { error, warn } = console;
    console.error = () => {};
    console.warn = () => {};

    try {
        render();
    } finally {
        console.error = error;
        console.warn = warn;
    }
}

/**
 * Every antd component, and the Pro components the template uses: each one
 * registers its styles when it renders. The special cases follow
 * @ant-design/static-style-extract: parts with styles of their own (Input.OTP,
 * Badge.Ribbon, Modal's confirm), and popups, which render their panel only.
 */
function sampleTree(modules: Modules): ReactElement {
    const { antd, h, Fragment } = modules;
    const special: Record<string, () => ReactElement> = {
        Affix: () => h(antd.Affix, null, h('div')),
        BackTop: () => h(antd.FloatButton.BackTop),
        Badge: () => h(Fragment, null, h(antd.Badge), h(antd.Badge.Ribbon)),
        Cascader: () =>
            h(Fragment, null, h(antd.Cascader), h(antd.Cascader.Panel)),
        Dropdown: () => h(antd.Dropdown, { menu: { items: [] } }, h('div')),
        Input: () =>
            h(
                Fragment,
                null,
                h(antd.Input),
                h(antd.Input.Search),
                h(antd.Input.TextArea),
                h(antd.Input.Password),
                h(antd.Input.OTP),
            ),
        Layout: () =>
            h(
                antd.Layout,
                null,
                h(antd.Layout.Header),
                h(antd.Layout.Sider),
                h(antd.Layout.Content),
                h(antd.Layout.Footer),
            ),
        Menu: () => h(antd.Menu, { items: [] }),
        Modal: () =>
            h(
                Fragment,
                null,
                h(antd.Modal),
                h(antd.Modal._InternalPanelDoNotUseOrYouWillBeFired),
                h(antd.Modal._InternalPanelDoNotUseOrYouWillBeFired, {
                    type: 'confirm',
                }),
            ),
        QRCode: () => h(antd.QRCode, { value: 'https://ant.design' }),
        Space: () =>
            h(
                Fragment,
                null,
                h(antd.Space),
                h(
                    antd.Space.Compact,
                    null,
                    h(antd.Button),
                    h(antd.Space.Addon, null, '1'),
                ),
            ),
        Tag: () =>
            h(
                Fragment,
                null,
                h(antd.Tag, { color: 'blue' }),
                h(antd.Tag, { color: 'success' }),
            ),
        Tree: () => h(antd.Tree, { treeData: [] }),
    };
    const skipped = new Set(['ConfigProvider', 'Grid']);
    const components = Object.keys(antd)
        .filter((name) => /^[A-Z]/.test(name) && !skipped.has(name))
        .map((name) => {
            const Component = antd[name as keyof typeof antd] as (
                props: object,
            ) => ReactElement;

            return h(
                Fragment,
                { key: name },
                special[name]?.() ?? h(Component),
            );
        });
    const Message = antd.message._InternalPanelDoNotUseOrYouWillBeFired;
    const Notification =
        antd.notification._InternalPanelDoNotUseOrYouWillBeFired;

    return h(
        Fragment,
        null,
        ...components,
        h(Message),
        h(Notification),
        proTree(modules),
    );
}

/**
 * The Pro components the template's layouts, glue and examples use, rendered
 * the way they are used, so that the parts they style only when shown (the
 * table's search form and selection bar, each menu position) render too.
 */
function proTree(modules: Modules): ReactElement {
    const { pro, h, Fragment } = modules;
    const route = {
        path: '/',
        routes: [{ path: '/dashboard', name: 'Dashboard' }],
    };
    const layouts = (['side', 'top', 'mix'] as const).map((layout) =>
        h(
            pro.ProLayout,
            {
                key: layout,
                layout,
                title: 'App',
                route,
                location: { pathname: '/dashboard' },
            },
            h(pro.PageContainer, { title: 'Page', content: 'Content' }),
        ),
    );
    const columns = [
        { title: 'Name', dataIndex: 'name' },
        { title: 'Amount', dataIndex: 'amount', valueType: 'money' as const },
        {
            title: 'Status',
            dataIndex: 'status',
            valueEnum: { paid: { text: 'Paid', status: 'Success' } },
        },
    ];
    const rows = [{ id: 1, name: 'Name', amount: 1, status: 'paid' }];

    return h(
        Fragment,
        null,
        ...layouts,
        h(pro.ProTable, {
            rowKey: 'id',
            columns,
            dataSource: rows,
            headerTitle: 'Table',
            rowSelection: { selectedRowKeys: [1] },
            toolBarRender: () => [h('span', { key: 'tool' }, 'Tool')],
        }),
        h(
            pro.ProForm,
            null,
            h(pro.ProFormText, { name: 'name', label: 'Name' }),
        ),
        h(pro.QueryFilter, null, h(pro.ProFormText, { name: 'name' })),
        h(pro.LightFilter, null, h(pro.ProFormText, { name: 'name' })),
        h(pro.ModalForm, { title: 'Modal' }),
        h(pro.DrawerForm, { title: 'Drawer' }),
        h(
            pro.StepsForm,
            null,
            h(pro.StepsForm.StepForm, { name: 'first', title: 'First' }),
        ),
        h(pro.ProCard, { title: 'Card' }),
        h(pro.StatisticCard, { statistic: { title: 'Total', value: 1 } }),
        h(pro.ProDescriptions, {
            columns,
            dataSource: rows[0],
        }),
        h(pro.LoginForm, { title: 'App' }),
        h(pro.LoginFormPage, { title: 'App' }),
    );
}

/**
 * Pro 3.1 writes rules no browser can parse: two media queries,
 * `(max-width: 480)px` and `(min-width: @screen-md-min)` (a Less variable),
 * and a selector with a stray `$` (`div$.ant-pro-table-search`). Browsers
 * skip those rules, so Pro's components have only ever looked the way they do
 * without them, but the build's CSS minifier stops on them. They are left out
 * here: a media query with a `@` in it or a letter right after a `)`, and a
 * rule whose selector has a `$` that does not start `$=` (antd's Form uses
 * `[class$='-24']`, which is valid).
 */
const BROKEN_MEDIA_QUERY = /@media[^{]*(?:\)[a-z]|@)[^{]*\{/;
const BROKEN_SELECTOR_RULE = /[^{}]*\$(?!=)[^{}]*\{[^{}]*\}/g;

function withoutUnparsableRules(css: string): string {
    let output = css.replace(BROKEN_SELECTOR_RULE, '');

    for (
        let match = BROKEN_MEDIA_QUERY.exec(output);
        match;
        match = BROKEN_MEDIA_QUERY.exec(output)
    ) {
        let end = match.index + match[0].length;

        for (let depth = 1; depth > 0 && end < output.length; end++) {
            if (output[end] === '{') {
                depth++;
            } else if (output[end] === '}') {
                depth--;
            }
        }

        output = output.slice(0, match.index) + output.slice(end);
    }

    return output;
}

/**
 * Puts `html.dark` before each selector of the dark pass's CSS variable
 * blocks, so they win over the light ones on the same element.
 */
function underDarkClass(css: string): string {
    const source = css.trim();
    const blocks = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const parsedLength = blocks.reduce(
        (length, [block]) => length + block.length,
        0,
    );

    if (parsedLength !== source.length) {
        throw new Error(
            'antd-styles: the dark CSS variables are no longer flat blocks.',
        );
    }

    return blocks
        .map(([, selectors, declarations]) => {
            const darkSelectors = selectors
                .split(',')
                .map((selector) => `html.dark ${selector.trim()}`)
                .join(',');

            return `${darkSelectors}{${declarations}}`;
        })
        .join('');
}
