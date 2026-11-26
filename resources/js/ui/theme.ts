import type { ThemeConfig } from 'antd';
import type { AliasToken } from 'antd/es/theme/interface';

/**
 * What a project may set in `resources/js/theme.ts`: antd's design tokens,
 * per-component tokens, and where the signed-in layout puts its menu.
 */
export type ProjectTheme = {
    token?: Partial<AliasToken>;
    components?: ThemeConfig['components'];
    layout?: 'side' | 'top' | 'mix';
};

/**
 * The key of antd's CSS variables. The build-time styles are generated under
 * it, so the browser's ConfigProvider must use the same one.
 */
export const CSS_VAR_KEY = 'app';

/**
 * The scope of the dark copies of antd's styles, the build-time ones and the
 * ones the server render adds. `:where()` adds no specificity, so a dark copy
 * beats only its own light rule, and every other rule keeps its rank, as in a
 * page rendered with the dark theme alone. Plain `html.dark` would raise each
 * copy over more specific rules: Pro's page header turned white in dark mode
 * over the rule that makes it transparent.
 */
export const DARK_SCOPE = ':where(html.dark) ';

/**
 * The tokens the template gives Pro's layout: the menu entry of the current
 * page in the light primary colour, as in antd's own Menu (Pro's default is
 * grey). They are antd's CSS variables, so they follow the theme, also in the
 * styles made ahead of time, which render the layout with them too.
 */
export const LAYOUT_TOKEN = {
    sider: {
        colorBgMenuItemSelected: 'var(--ant-control-item-bg-active)',
        colorTextMenuSelected: 'var(--ant-color-primary)',
    },
    header: {
        colorBgMenuItemSelected: 'var(--ant-control-item-bg-active)',
        colorTextMenuSelected: 'var(--ant-color-primary)',
    },
};

/**
 * The template's look, kept for any token the project's theme leaves out.
 */
const templateTheme: ProjectTheme = {
    token: {
        colorPrimary: '#155dfc',
        fontFamily:
            "'Instrument Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', ui-sans-serif, system-ui, sans-serif",
    },
};

/**
 * The antd theme for both the ConfigProvider and the build-time styles: the
 * project's theme over the template's, with the settings the generated CSS
 * depends on (its CSS variable key, and no styles made at runtime).
 *
 * `algorithm` is antd's `theme.darkAlgorithm` for a dark page. It is a
 * parameter, not an import, so that the build can load this file without
 * loading antd.
 */
export function themeConfig(
    project: ProjectTheme,
    algorithm?: ThemeConfig['algorithm'],
): ThemeConfig {
    return {
        token: { ...templateTheme.token, ...project.token },
        components: { ...templateTheme.components, ...project.components },
        ...(algorithm && { algorithm }),
        cssVar: { key: CSS_VAR_KEY },
        zeroRuntime: true,
    };
}
