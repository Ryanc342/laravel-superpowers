// @vitest-environment node
import { expect, test } from 'vite-plus/test';
import { generateAntdCss } from '@/ui/antd-styles';

const css = generateAntdCss({ token: { colorPrimary: '#155dfc' } });

// antd writes the theme's variables under the class of its CSS variable key,
// `.app`, and each component's own under `.app.ant-<component>`.
test('the generated css sits in the antd layer', () => {
    expect(css.trimStart().startsWith('@layer antd')).toBe(true);
});

test('the light variables carry the brand colour', () => {
    expect(css).toMatch(/(?:^|[{}\n])\.app\{[^}]*--ant-color-primary:#155dfc/);
});

test('the dark variables apply under html.dark', () => {
    expect(css).toContain('html.dark .app{');
    expect(css).toMatch(
        /html\.dark \.app\{[^}]*--ant-color-bg-container:#141414/,
    );
});

test('the Pro components styles are included', () => {
    expect(css).toContain('ant-pro-layout');
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
