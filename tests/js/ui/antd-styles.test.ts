// @vitest-environment node
import { expect, test } from 'vite-plus/test';
import { generateAntdCss } from '@/ui/antd-styles';

const css = generateAntdCss({ token: { colorPrimary: '#155dfc' } });

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

// Pro writes two media queries and a selector no browser can parse, so
// browsers skip their rules. The build's CSS minifier stops on them instead.
test('rules browsers cannot parse are left out', () => {
    expect(css).toContain('.ant-pro-table-list-toolbar-filter');
    expect(css).not.toContain('(max-width: 480)px');
    expect(css).not.toContain('@screen-md-min');
    expect(css).not.toContain('div$');
    expect(css).toContain(".ant-form-item-label[class$='-24']");
});
