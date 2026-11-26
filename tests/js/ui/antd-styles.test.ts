// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { expect, test } from 'vite-plus/test';
import { generateAntdCss, sampledStyleNames } from '@/ui/antd-styles';

const css = generateAntdCss({ token: { colorPrimary: '#155dfc' } });

/**
 * Every style the installed Pro has: the name each of its components
 * registers its styles under, `useStyle('ProList', …)`, read from its source.
 * A name Pro builds as it renders (`'ProLayoutBaseMenu' + mode`) is its
 * fixed start, `isStart`.
 */
function proStyleNames(): { name: string; isStart: boolean }[] {
    const main = createRequire(import.meta.url).resolve(
        '@ant-design/pro-components',
    );
    const source = join(dirname(main), '..', 'es');
    const names = new Map<string, boolean>();

    for (const file of readdirSync(source, { recursive: true })) {
        if (!String(file).endsWith('.js')) {
            continue;
        }

        const code = readFileSync(join(source, String(file)), 'utf8');

        for (const [, name, plus] of code.matchAll(
            /\buseStyle\(\s*['"]([\w-]+)['"]\s*(\+)?/g,
        )) {
            names.set(name, names.get(name) === true || plus !== undefined);
        }
    }

    return [...names].map(([name, isStart]) => ({ name, isStart }));
}

// The browser runs Pro with zeroRuntime, so a Pro component whose styles the
// sample tree does not render has none at all on a page. A project cannot add
// it, as the sample is the template's. A Pro upgrade that adds a component
// with styles of its own fails here until the sample renders it.
test('every style the installed Pro has is in the generated css', () => {
    const sampled = sampledStyleNames({});
    const missing = proStyleNames()
        .filter(({ name, isStart }) =>
            isStart
                ? !sampled.some((one) => one.startsWith(name))
                : !sampled.includes(name),
        )
        .map(({ name }) => name);

    expect(proStyleNames().length).toBeGreaterThan(40);
    expect(missing).toEqual([]);
});

// antd writes the theme's variables under the class of its CSS variable key,
// `.app`, and each component's own under `.app.ant-<component>`. The dark
// copies are scoped with `:where(html.dark)`.
test('the generated css sits in the antd layer', () => {
    expect(css.trimStart().startsWith('@layer antd')).toBe(true);
});

test('the light variables carry the brand colour', () => {
    expect(css).toMatch(/(?:^|[{}\n])\.app\{[^}]*--ant-color-primary:#155dfc/);
});

test('the dark variables apply under html.dark', () => {
    expect(css).toContain(':where(html.dark) .app{');
    expect(css).toMatch(
        /:where\(html\.dark\) \.app\{[^}]*--ant-color-bg-container:#141414/,
    );
});

// A dark copy must not outrank the rules its light rule loses to: with
// `html.dark .ant-page-header`, Pro's page header turned white in dark mode
// over the rule that makes it transparent.
test('the dark scope adds no specificity', () => {
    expect(css).not.toMatch(/(?:^|[{},\n])html\.dark /);
});

test('the Pro components styles are included', () => {
    expect(css).toContain('ant-pro-layout');
});

// Under zeroRuntime nothing else styles them. The form fields and ModalForm
// render antd's own components, so their classes are antd's.
test.each([
    ['ProLayout', 'ant-pro-layout'],
    ["ProLayout's open side menu", 'ant-pro-base-menu-inline-item-title'],
    [
        "ProLayout's collapsed side menu",
        'ant-pro-base-menu-vertical-item-title',
    ],
    ["ProLayout's header actions", 'ant-pro-global-header-header-actions'],
    ['PageContainer', 'ant-pro-page-container'],
    ['ProTable', 'ant-pro-table'],
    ["ProTable's search form", 'ant-pro-query-filter'],
    ['ProForm', 'ant-pro-form'],
    ['ProFormText', 'ant-input'],
    ['ProFormSelect', 'ant-select'],
    ['ProFormList', 'ant-pro-form-list'],
    ['ProFormDateRangePicker', 'ant-picker-range'],
    ['ModalForm', 'ant-modal'],
    ['DrawerForm', 'ant-pro-form-drawer'],
    ['StepsForm', 'ant-pro-steps-form'],
    ['ProDescriptions', 'ant-pro-field-readonly'],
    ['ProCard', 'ant-pro-card'],
    ['StatisticCard', 'ant-pro-statistic-card'],
    ['LoginForm', 'ant-pro-form-login'],
    ['LoginFormPage', 'ant-pro-form-login-page'],
])('the styles of %s are included', (_component, prefix) => {
    expect(css).toMatch(new RegExp(`\\.${prefix}(?![\\w-])`));
});

/**
 * Every selector of every rule, outside `@keyframes` (whose steps are not
 * selectors). A selector list is what sits right before a `{`.
 */
function selectorsIn(source: string): string[] {
    const withoutKeyframes = source.replace(
        /@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,
        '',
    );

    return [...withoutKeyframes.matchAll(/[^{};]+(?=\{)/g)]
        .map(([list]) => list.trim())
        .filter((list) => !list.startsWith('@'))
        .flatMap((list) => list.split(/,(?![^(]*\))/));
}

// antd scopes its element rules, its link styles, to its own components.
// Unscoped, `a{outline:none}` took the focus ring off every link on the page.
test('no rule reaches elements outside antd components', () => {
    const classless = selectorsIn(css).filter(
        (selector) => !/\.-?[_a-z]/i.test(selector),
    );

    expect(classless).toEqual([]);
    expect(css).toContain(
        ':where(.app) a:focus-visible,a:where(.app):focus-visible{',
    );
});

// Pro's nested theme providers key their CSS variables with React's useId:
// the sample tree's keys never match the ones a real page renders.
test('no CSS variables are keyed by a React id', () => {
    expect(css).not.toContain('.css-var-');
});

// Pro writes colours into its rules instead of using antd's variables, so the
// dark theme needs its own copy of those rules.
test('a Pro rule with a written-in colour has a dark copy under html.dark', () => {
    const background = (prefix: string) =>
        new RegExp(
            `${prefix}\\.ant-pro-layout \\.ant-pro-layout-bg-list\\{[^}]*background:([^;]+);`,
        ).exec(css)?.[1];
    const light = background('(?:^|[{}\\n])');
    const dark = background(':where\\(html\\.dark\\) ');

    expect(light).toBe('linear-gradient(#ffffff, #f5f5f5 28%)');
    expect(dark).toContain('#141414');
    expect(dark).not.toBe(light);
});

// A `@keyframes` cannot be scoped to html.dark, and the last one of a name
// wins on the whole page. ProList's new-row flash writes in the light
// theme's warning background, so the dark theme runs a copy of its own.
test('a keyframes the dark theme changes runs as a dark copy under html.dark', () => {
    expect(css).toMatch(
        /@keyframes proListActive\{[^}]*\}30%\{background:#fffbe6;/,
    );
    expect(css).toMatch(
        /@keyframes proListActive-dark\{[^}]*\}30%\{background:#2b2111;/,
    );
    expect(css).toMatch(
        /:where\(html\.dark\) \.ant-pro-list-row\.ant-pro-list-row-type-new\{[^}]*animation-name:proListActive-dark;/,
    );
    expect(css).not.toMatch(/:where\(html\.dark\) @keyframes/);
});

// Pro writes two media queries and a selector no browser can parse, so
// browsers skip their rules. The build's CSS minifier stops on them instead.
test('rules browsers cannot parse are left out', () => {
    expect(css).toContain('.ant-pro-table-list-toolbar-filter');
    expect(css).not.toContain('(max-width: 480)px');
    expect(css).not.toContain('@screen-md-min');
    expect(css).not.toContain('div$');
    expect(css).toContain(".ant-form-item-label[class$='-24']");
});
