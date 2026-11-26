import type { Plugin } from 'vite-plus';
import projectTheme from '../theme';
import { generateAntdCss } from './antd-styles';

const VIRTUAL_ID = 'virtual:antd.css';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

/**
 * Serves `virtual:antd.css`, antd's styles for the project's theme, generated
 * when the dev server starts and on every build. Nothing is written to disk.
 *
 * vite.config.ts imports this file, so Vite counts `resources/js/theme.ts` and
 * `resources/js/ui/theme.ts` among the config's dependencies. When either
 * changes, Vite restarts the dev server before any plugin hook runs, and the
 * new server generates the styles from the new theme, so no hook is needed
 * here to invalidate the module.
 */
export function antdStyles(): Plugin {
    let css: string | undefined;

    return {
        name: 'antd-styles',
        resolveId(id) {
            return id === VIRTUAL_ID ? RESOLVED_ID : null;
        },
        load(id) {
            if (id !== RESOLVED_ID) {
                return null;
            }

            css ??= generateAntdCss(projectTheme);

            return css;
        },
    };
}
