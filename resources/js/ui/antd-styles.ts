import { createRequire } from 'node:module';
import type * as CssInJs from '@ant-design/cssinjs';
import type * as ProComponents from '@ant-design/pro-components';
import type * as Antd from 'antd';
import type { ThemeConfig } from 'antd';
import type * as ReactModule from 'react';
import type { ReactElement } from 'react';
import type * as ReactDomServer from 'react-dom/server';
import { CSS_VAR_KEY, DARK_SCOPE, LAYOUT_TOKEN, themeConfig } from './theme';
import type { ProjectTheme } from './theme';

type AnyComponent = ReactModule.FunctionComponent<Record<string, unknown>>;

/**
 * The parts of Pro with styles of their own that the sample renders from
 * their own files (see `loadModules`).
 */
type ProPart =
    | 'Highlight'
    | 'FieldCheckbox'
    | 'FieldRadio'
    | 'FieldTextAreaReadonly'
    | 'LightSelect';

type Modules = {
    cssinjs: typeof CssInJs;
    antd: typeof Antd;
    pro: typeof ProComponents;
    proParts: Record<ProPart, AnyComponent>;
    h: typeof ReactModule.createElement;
    Fragment: typeof ReactModule.Fragment;
    renderToString: typeof ReactDomServer.renderToString;
};

/**
 * The styles of antd and of every Pro component, with the theme's CSS
 * variables, all in `@layer antd`: the light theme, then each rule the dark
 * theme changes, scoped to `html.dark`. antd's rules change only their
 * variables; Pro writes colours into its rules (the layout's sider, menu and
 * header), so those rules get a dark copy too.
 *
 * A `@keyframes` cannot be scoped to a class, so the dark copy of one the
 * dark theme changes gets a name of its own (`proListActive-dark`), and each
 * rule that runs it gets a dark copy that runs that one.
 *
 * The browser runs antd and Pro with `zeroRuntime`, so it makes none of these
 * rules itself: these are all the component styles it gets. What antd still
 * makes in the browser are CSS variables: the theme's, and those of Pro's
 * nested theme providers, which this file cannot write ahead (see
 * `withoutReactIdKeys`).
 */
export function generateAntdCss(project: ProjectTheme): string {
    const modules = loadModules();
    const config = sampleConfig(project);
    const light = extract(modules, config);
    const dark = extract(modules, {
        ...config,
        algorithm: modules.antd.theme.darkAlgorithm,
    });
    const lightRules = new Set(light);
    const changed = dark.filter((rule) => !lightRules.has(rule));
    const darkKeyframes = changed.filter((rule) => KEYFRAMES.test(rule));
    const toDarkKeyframes = renamer(
        darkKeyframes.map((rule) => KEYFRAMES.exec(rule)?.[1] ?? ''),
    );
    const runsDarkKeyframes = light.filter(
        (rule) => !KEYFRAMES.test(rule) && toDarkKeyframes(rule) !== rule,
    );
    // A rule the dark theme changes comes after the light rule's copy, so
    // its own dark copy wins when it also runs a renamed keyframes.
    const darkRules = [
        ...runsDarkKeyframes,
        ...changed.filter((rule) => !KEYFRAMES.test(rule)),
    ]
        .map(toDarkKeyframes)
        .map(underDarkClass);

    // The dark copies come last: they have the same specificity as the light
    // rules, so being later is what makes them win.
    return `@layer antd {\n${light.join('')}\n${[...darkKeyframes.map(toDarkKeyframes), ...darkRules].join('')}\n}\n`;
}

/** A `@keyframes` rule, and its name. */
const KEYFRAMES = /^@keyframes\s+([\w-]+)\s*\{/;

/**
 * Gives each of these keyframes names its dark name, `<name>-dark`, wherever a
 * rule says it: a `@keyframes` rule's prelude, or a rule's `animation`.
 */
function renamer(names: string[]): (rule: string) => string {
    if (names.length === 0) {
        return (rule) => rule;
    }

    const name = new RegExp(
        `(?<![\\w-])(${names.map((one) => one.replaceAll('-', '\\-')).join('|')})(?![\\w-])`,
        'g',
    );

    return (rule) => {
        const open = rule.indexOf('{');
        const prelude = rule.slice(0, open);

        // Selectors keep their names: only a keyframes' own name is in its prelude.
        return KEYFRAMES.test(rule)
            ? rule.replace(name, '$1-dark')
            : prelude + rule.slice(open).replace(name, '$1-dark');
    };
}

/**
 * The names the sample tree's components register their styles under, which
 * are the styles the generated CSS has. Pro names each of its styles as it
 * registers it, `useStyle('ProList', …)`, and antd names each component's.
 * The tests compare them with every style the installed Pro has.
 */
export function sampledStyleNames(project: ProjectTheme): string[] {
    const cache = renderSample(loadModules(), sampleConfig(project));
    const names = [...cache.cache.keys()]
        .filter((key) => key.startsWith('style%'))
        // `style%<hash>%<name>%…`: the hash is empty, as styles are not hashed.
        .map((key) => key.split('%')[2] ?? '');

    return [...new Set(names)].filter((name) => name !== '');
}

/**
 * The theme the sample tree renders with. Styles are only registered with
 * zeroRuntime off. Without the hash class, the selectors match whether or
 * not the browser adds one.
 */
function sampleConfig(project: ProjectTheme): ThemeConfig {
    return { ...themeConfig(project), zeroRuntime: false, hashed: false };
}

/**
 * Everything is loaded through CommonJS. Pro's ES build does not run in Node
 * (it imports antd's locale files without their extension), and antd, React
 * and cssinjs must be the same instances Pro's CommonJS build requires, or
 * Pro's styles would go to a cache nothing reads. They load on the first call,
 * so importing this file (as vite.config.ts does) stays cheap.
 *
 * A few of Pro's parts come from their own files (Pro exports `./lib/*`).
 * Pro loads each field's component when it is first shown (an `import()`
 * behind Suspense), and in its CommonJS build that import gives the field's
 * module, not its component, so a field renders only its "…" fallback here.
 * So the fields with styles of their own are loaded directly. ProHelp's
 * search highlight is not exported from Pro's root at all.
 */
function loadModules(): Modules {
    const require = createRequire(import.meta.url);
    const react = require('react') as typeof ReactModule;
    const proPart = (path: string, name = 'default') =>
        (
            require(`@ant-design/pro-components/lib/${path}`) as Record<
                string,
                AnyComponent
            >
        )[name];

    return {
        cssinjs: require('@ant-design/cssinjs') as typeof CssInJs,
        antd: require('antd') as typeof Antd,
        pro: require('@ant-design/pro-components') as typeof ProComponents,
        proParts: {
            Highlight: proPart('layout/components/Help/Search.js', 'Highlight'),
            FieldCheckbox: proPart('field/components/Checkbox/index.js'),
            FieldRadio: proPart('field/components/Radio/index.js'),
            FieldTextAreaReadonly: proPart(
                'field/components/TextArea/readonly.js',
            ),
            LightSelect: proPart(
                'field/components/Select/LightSelect/index.js',
            ),
        },
        h: react.createElement,
        Fragment: react.Fragment,
        renderToString: (require('react-dom/server') as typeof ReactDomServer)
            .renderToString,
    };
}

const CACHE_PATH_MARKER = /\.data-ant-cssinjs-cache-path\{content:"[^"]*";\}/;

/**
 * The rules the sample tree registers with `config`, ready to ship: what no
 * browser can parse left out, element rules scoped to antd's components, the
 * CSS variables keyed by a React id dropped, and each repeated rule kept once.
 */
function extract(modules: Modules, config: ThemeConfig): string[] {
    const cache = renderSample(modules, config);

    // The marker lists the styles a server render put in the page, for the
    // browser to skip. These styles come from a file, so it has no use.
    const css = withoutUnparsableRules(
        modules.cssinjs
            .extractStyle(cache, { plain: true })
            .replace(CACHE_PATH_MARKER, ''),
    );
    const rules = topLevelRules(css)
        .map((rule) => rewriteSelectors(rule, withoutReactIdKeys))
        .filter((rule) => rule !== null)
        .map((rule) => rewriteSelectors(rule, scopedToAntd) ?? '');

    return lastOfEach(rules);
}

/**
 * Renders the sample tree with `config`, into a style cache of its own: each
 * component registers its styles there as it renders.
 */
function renderSample(
    modules: Modules,
    config: ThemeConfig,
): ReturnType<typeof CssInJs.createCache> {
    const { antd, cssinjs, h, renderToString } = modules;
    const cache = cssinjs.createCache();
    const tree = h(
        cssinjs.StyleProvider,
        { cache },
        h(antd.ConfigProvider, { theme: config }, sampleTree(modules)),
    );

    withoutWarnings(() => renderToString(tree));

    return cache;
}

/**
 * antd scopes its element rules (its link styles: `a`, `a:hover`,
 * `a[disabled]`…) with its hash class, to a link that is an antd component
 * and to a link inside one. Without the hash they would reach every link on
 * the page, over Tailwind's base layer (`a{outline:none}` took the focus ring
 * off the template's own links). The class of the CSS variable key sits next
 * to the hash on every antd component, so it takes the hash's place, in a
 * `:where()` that adds no specificity, as the hash's does. A stable hash would
 * not do: antd makes it differ between development and production builds. A
 * selector with a class already reaches only the elements with that class.
 */
const ANTD_SCOPE = `:where(.${CSS_VAR_KEY})`;

function scopedToAntd(selector: string): string[] {
    if (/\.-?[_a-zA-Z]/.test(selector)) {
        return [selector];
    }

    const element = /^[a-zA-Z][\w-]*/.exec(selector)?.[0] ?? '';

    return [
        `${ANTD_SCOPE} ${selector}`,
        `${element}${ANTD_SCOPE}${selector.slice(element.length)}`,
    ];
}

/**
 * Pro's nested theme providers set no CSS variable key, so antd keys their
 * variables with React's useId (`.css-var-_R_3bvv_`). That class depends on
 * where a provider sits in a page's tree: the sample tree's ones never match
 * a real page, so they are dropped. antd still writes these variables in the
 * browser when the page runs.
 */
function withoutReactIdKeys(selector: string): string[] {
    return selector.includes('.css-var-') ? [] : [selector];
}

/**
 * Keeps the last copy of each rule that appears more than once. The last
 * copy is the one that wins the cascade, so the earlier ones change nothing.
 */
function lastOfEach(rules: string[]): string[] {
    const lastIndex = new Map(rules.map((rule, index) => [rule, index]));

    return rules.filter((rule, index) => lastIndex.get(rule) === index);
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
 * Every antd component, and every Pro component: each one registers its
 * styles when it renders. The special cases follow
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
        routes: [
            {
                path: '/dashboard',
                name: 'Dashboard',
                icon: h('span', null, 'D'),
            },
        ],
    };
    // Pro styles its menu per mode: open, the side menu is `inline`, and
    // collapsed it is `vertical`. The header styles its actions only when it
    // has some.
    const layouts = (['side', 'top', 'mix'] as const).flatMap((layout) =>
        [false, true].map((collapsed) =>
            h(
                pro.ProLayout,
                {
                    key: `${layout}-${collapsed}`,
                    layout,
                    collapsed,
                    title: 'App',
                    route,
                    location: { pathname: '/dashboard' },
                    token: LAYOUT_TOKEN,
                    actionsRender: () => [h('span', { key: 'action' }, 'A')],
                    avatarProps: {
                        title: 'User',
                        render: (_props, dom) => dom,
                    },
                },
                h(pro.PageContainer, { title: 'Page', content: 'Content' }),
            ),
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
            // The row numbers, plain and in a badge.
            columns: [
                { title: '#', valueType: 'index' as const },
                { title: '#', valueType: 'indexBorder' as const },
                ...columns,
            ],
            dataSource: rows,
            headerTitle: 'Table',
            rowSelection: { selectedRowKeys: [1] },
            toolBarRender: () => [h('span', { key: 'tool' }, 'Tool')],
        }),
        h(
            pro.ProForm,
            null,
            h(pro.ProFormText, { name: 'name', label: 'Name' }),
            h(pro.ProFormSelect, {
                name: 'status',
                options: [{ label: 'Paid', value: 'paid' }],
            }),
            h(pro.ProFormDateRangePicker, { name: 'period' }),
            // A list styles its rows only when it has one.
            h(
                pro.ProFormList,
                { name: 'items', initialValue: [{ name: 'Name' }] },
                h(pro.ProFormText, { name: 'name' }),
            ),
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
            // A long text shown read-only, as a textarea's value.
            columns: [
                ...columns,
                { title: 'Notes', dataIndex: 'name', valueType: 'textarea' },
            ],
            dataSource: rows[0],
        }),
        h(pro.LoginForm, { title: 'App' }),
        h(pro.LoginFormPage, { title: 'App' }),
        ...otherProParts(modules, columns, rows),
    );
}

/**
 * The Pro components and parts the template itself does not use, so that a
 * page can use any of Pro: with them, the sample registers every style the
 * installed Pro has (a test checks it). Each is rendered in the state that
 * shows the part with styles of its own.
 */
function otherProParts(
    modules: Modules,
    columns: object[],
    rows: object[],
): ReactElement[] {
    const { antd, pro, proParts, h } = modules;
    const options = [{ label: 'Option', value: 'option' }];
    const help = [
        {
            key: 'help',
            title: 'Help',
            children: [
                {
                    key: 'topic',
                    title: 'Topic',
                    children: [
                        { valueType: 'text' as const, children: 'Text' },
                    ],
                },
            ],
        },
    ];

    return [
        // A card's loading state and its actions belong to its other skin.
        h(pro.ProCard, { key: 'card-loading', boxShadow: true, loading: true }),
        h(
            pro.ProCard,
            {
                key: 'card-actions',
                boxShadow: true,
                actions: [h('span', { key: 'action' }, 'A')],
            },
            'Body',
        ),
        h(pro.ProCard.Divider, { key: 'card-divider' }),
        h(pro.StatisticCard.Operation, { key: 'statistic-operation' }, '='),
        h(pro.CheckCard, { key: 'check-card', title: 'Option' }),
        h(pro.ProList, {
            key: 'list',
            rowKey: 'id',
            dataSource: rows,
            metas: { title: { dataIndex: 'name' } },
        }),
        h(pro.DragSortTable, {
            key: 'drag-sort-table',
            rowKey: 'id',
            columns,
            dataSource: rows,
            dragSortKey: 'name',
        }),
        h(pro.EditableProTable, {
            key: 'editable-table',
            rowKey: 'id',
            columns,
            value: rows,
            editable: { editableKeys: [1] },
            recordCreatorProps: false,
        }),
        h(
            pro.ProForm,
            { key: 'form-group' },
            h(
                pro.ProFormGroup,
                { title: 'Group' },
                h(pro.ProFormText, { name: 'grouped' }),
            ),
        ),
        // The fields' own parts: Pro's fields render here only lazily.
        h(proParts.FieldCheckbox, {
            key: 'field-checkbox',
            mode: 'edit',
            fieldProps: { options },
        }),
        h(proParts.FieldRadio, {
            key: 'field-radio',
            mode: 'edit',
            fieldProps: { options },
        }),
        h(proParts.FieldTextAreaReadonly, {
            key: 'field-textarea',
            mode: 'read',
            text: 'Text',
        }),
        h(proParts.LightSelect, {
            key: 'light-select',
            label: 'Status',
            options,
        }),
        // Pro types it as the render function it wraps in forwardRef.
        h(
            pro.LightWrapper as unknown as AnyComponent,
            { key: 'light-wrapper', label: 'Name' },
            h(antd.Input),
        ),
        h(pro.FieldLabel, {
            key: 'field-label',
            label: 'Name',
            value: 'Value',
        }),
        h(pro.DropdownFooter, { key: 'dropdown-footer' }),
        // A light filter's fields collapsed behind its dropdown.
        h(
            pro.LightFilter,
            { key: 'light-filter', collapse: true },
            h(pro.ProFormText, { name: 'name', label: 'Name' }),
        ),
        // An editable table's error, shown in a popover by its field.
        h(
            antd.Form,
            { key: 'inline-error' },
            h(pro.InlineErrorFormItem, {
                name: 'name',
                errorType: 'popover',
                rules: [{ required: true }],
                children: h(antd.Input),
            }),
        ),
        h(pro.DefaultFooter, {
            key: 'footer',
            copyright: 'App',
            links: [{ key: 'link', title: 'Link', href: '#' }],
        }),
        h(pro.GridContent, { key: 'grid-content', children: 'Content' }),
        h(pro.FooterToolbar, { key: 'footer-toolbar' }, 'Save'),
        h(pro.SettingDrawer, { key: 'setting-drawer' }),
        h(pro.ProHelp, { key: 'help', dataSource: help }, h(pro.ProHelpPanel)),
        // A search result's highlighted words, which ProHelpSelect shows
        // only once the user opens its search.
        h(proParts.Highlight, {
            key: 'help-highlight',
            label: 'Help',
            words: ['He'],
        }),
    ];
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
 * Splits CSS into its top-level rules: a selector with its declarations, or
 * an at-rule with everything nested in it. Braces inside quoted strings do
 * not count.
 */
function topLevelRules(css: string): string[] {
    const rules: string[] = [];
    let start = 0;
    let depth = 0;
    let quote: string | null = null;

    for (let index = 0; index < css.length; index++) {
        const character = css[index];

        if (quote !== null) {
            if (character === quote && css[index - 1] !== '\\') {
                quote = null;
            }
        } else if (character === '"' || character === "'") {
            quote = character;
        } else if (character === '{') {
            depth++;
        } else if (character === '}' && --depth === 0) {
            rules.push(css.slice(start, index + 1).trim());
            start = index + 1;
        }
    }

    if (css.slice(start).trim() !== '') {
        throw new Error('antd-styles: the generated CSS has an unclosed rule.');
    }

    return rules;
}

const GROUP_RULE = /^@(?:media|supports|container)\b/;

/**
 * Puts the dark scope before each selector of a rule the dark theme changes.
 * Any at-rule other than `@media`, `@supports` and `@container` (such as
 * `@keyframes`) cannot be scoped to a class, so one the dark theme changes
 * stops the build.
 */
function underDarkClass(rule: string): string {
    const prelude = rule.slice(0, rule.indexOf('{')).trim();

    if (prelude.startsWith('@') && !GROUP_RULE.test(prelude)) {
        throw new Error(
            `antd-styles: the dark theme changes "${prelude}", which cannot be scoped to html.dark.`,
        );
    }

    return (
        rewriteSelectors(rule, (selector) => [`${DARK_SCOPE}${selector}`]) ?? ''
    );
}

/**
 * Replaces each selector of a rule, and of the rules inside an `@media`,
 * `@supports` or `@container` block, with the selectors `rewrite` returns for
 * it. A rule left with no selector is dropped (null), and so is a block left
 * with no rule. Other at-rules, such as `@keyframes`, stay as they are.
 */
function rewriteSelectors(
    rule: string,
    rewrite: (selector: string) => string[],
): string | null {
    const open = rule.indexOf('{');
    const prelude = rule.slice(0, open).trim();
    const body = rule.slice(open + 1, -1);

    if (GROUP_RULE.test(prelude)) {
        const rules = topLevelRules(body)
            .map((inner) => rewriteSelectors(inner, rewrite))
            .filter((inner) => inner !== null);

        return rules.length > 0 ? `${prelude}{${rules.join('')}}` : null;
    }

    if (prelude.startsWith('@')) {
        return rule;
    }

    const selectors = selectorList(prelude).flatMap(rewrite);

    return selectors.length > 0 ? `${selectors.join(',')}{${body}}` : null;
}

/**
 * The selectors of a selector list: split on its top-level commas, not on
 * those inside `:not(…)`, `:is(…)` or an attribute selector.
 */
function selectorList(prelude: string): string[] {
    const selectors: string[] = [];
    let start = 0;
    let depth = 0;

    for (let index = 0; index < prelude.length; index++) {
        const character = prelude[index];

        if (character === '(' || character === '[') {
            depth++;
        } else if (character === ')' || character === ']') {
            depth--;
        } else if (character === ',' && depth === 0) {
            selectors.push(prelude.slice(start, index).trim());
            start = index + 1;
        }
    }

    selectors.push(prelude.slice(start).trim());

    return selectors;
}
