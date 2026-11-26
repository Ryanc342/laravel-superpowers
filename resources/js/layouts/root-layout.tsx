import { StyleProvider } from '@ant-design/cssinjs';
import { usePage } from '@inertiajs/react';
import { App, ConfigProvider, theme } from 'antd';
import { Fragment, useEffect } from 'react';
import { setLanguage } from '@/lib/i18n';
import projectTheme from '@/theme';
import { useAppearance } from '@/ui/appearance';
import { useFlashFeedback, useNetworkErrorFeedback } from '@/ui/feedback';
import { antdLocaleFor, applyDayjsLocale } from '@/ui/locales';
import { themeConfig } from '@/ui/theme';

const lightTheme = themeConfig(projectTheme);
const darkTheme = themeConfig(projectTheme, theme.darkAlgorithm);

/**
 * Shows the server's flash messages and the network failures through antd's
 * `App`, so it has to be inside it. It renders nothing.
 */
function Feedback(): null {
    useFlashFeedback();
    useNetworkErrorFeedback();

    return null;
}

/**
 * The outermost layout of every page: antd's theme (light or dark, by the
 * appearance setting) and locale, and antd's `App`, so that `message`,
 * `notification` and `modal` follow the theme.
 *
 * The styles made ahead of time paint both themes (the dark one under
 * `html.dark`), but antd also writes its theme's CSS variables in the browser,
 * and those win over them: so the browser's theme has to be the dark one too.
 *
 * It also hands the page's language and sentences to `t()` and dayjs before
 * anything below renders. What is below is keyed by the language: `t()` is not
 * a subscription, and a component that reads no props would keep the old
 * sentences after a switch, so a new language renders it afresh.
 *
 * `App`'s wrapper element sets antd's text colour, font and 14px size for
 * everything inside it, so text outside an antd component follows the theme
 * too, in dark mode as well.
 */
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { locale, translations } = usePage().props;
    const { resolved } = useAppearance();

    setLanguage(locale, translations);
    applyDayjsLocale(locale);

    // The server writes <html lang> for a full page load. A switch between
    // pages happens without one.
    useEffect(() => {
        document.documentElement.lang = locale.replaceAll('_', '-');
    }, [locale]);

    return (
        <StyleProvider layer>
            <ConfigProvider
                theme={resolved === 'dark' ? darkTheme : lightTheme}
                locale={antdLocaleFor(locale)}
            >
                <App>
                    <Feedback />
                    <Fragment key={locale}>{children}</Fragment>
                </App>
            </ConfigProvider>
        </StyleProvider>
    );
}
