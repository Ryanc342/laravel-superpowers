import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { theme } from 'antd';
import { expect, test } from 'vite-plus/test';
import projectTheme from '@/theme';
import { themeConfig } from '@/ui/theme';

const root = join(import.meta.dirname, '../..');
const view = readFileSync(join(root, 'resources/views/app.blade.php'), 'utf8');

function layoutBackground(dark: boolean): string {
    return theme.getDesignToken({
        ...themeConfig(projectTheme),
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    }).colorBgLayout;
}

function paintedBefore(selector: 'html' | 'html.dark'): string {
    const escaped = selector.replace('.', '\\.');
    const match = new RegExp(
        `${escaped}\\s*\\{\\s*background-color:\\s*([^;]+);`,
    ).exec(view);

    return match?.[1].trim() ?? '';
}

// app.blade.php paints the page before the stylesheet has loaded, so it has to
// repeat antd's page background (colorBgLayout). The copies must not drift
// apart: a stale one flashes another colour in dark mode and on overscroll.
test('the colour painted before the stylesheet loads is the theme background', () => {
    expect(paintedBefore('html')).toBe(layoutBackground(false));
    expect(paintedBefore('html.dark')).toBe(layoutBackground(true));
});
