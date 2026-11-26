import { StyleProvider } from '@ant-design/cssinjs';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import projectTheme from '@/theme';
import { themeConfig } from '@/ui/theme';

const theme = themeConfig(projectTheme);

/**
 * The outermost layout of every page: antd's theme and locale, and antd's
 * `App`, so that `message`, `notification` and `modal` follow the theme.
 *
 * `App` renders no element of its own (`component={false}`): its wrapper
 * would set antd's text colour and 14px font size on every page, including the
 * ones not yet built with antd.
 */
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <StyleProvider layer>
            <ConfigProvider theme={theme} locale={zhCN}>
                <App component={false}>{children}</App>
            </ConfigProvider>
        </StyleProvider>
    );
}
