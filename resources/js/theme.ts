import type { ProjectTheme } from '@/ui/theme';

/**
 * The project's look: the only file to change for it. Any antd token goes in
 * `token` (https://ant.design/docs/react/customize-theme), per-component
 * tokens in `components`. `layout` puts the signed-in menu on the side, at the
 * top, or both (`mix`).
 */
const projectTheme: ProjectTheme = {
    token: {
        colorPrimary: '#155dfc',
        fontFamily:
            "'Instrument Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', ui-sans-serif, system-ui, sans-serif",
    },
    layout: 'side',
};

export default projectTheme;
