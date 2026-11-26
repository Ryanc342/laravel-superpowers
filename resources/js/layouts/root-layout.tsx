import { StyleProvider } from '@ant-design/cssinjs';
import { usePage } from '@inertiajs/react';
import { App, ConfigProvider } from 'antd';
import { Fragment, useEffect } from 'react';
import { setLanguage } from '@/lib/i18n';
import projectTheme from '@/theme';
import { antdLocaleFor, applyDayjsLocale } from '@/ui/locales';
import { themeConfig } from '@/ui/theme';

const theme = themeConfig(projectTheme);

/**
 * The outermost layout of every page: antd's theme and locale, and antd's
 * `App`, so that `message`, `notification` and `modal` follow the theme.
 *
 * It also hands the page's language and sentences to `t()` and dayjs before
 * anything below renders. What is below is keyed by the language: `t()` is not
 * a subscription, and a component that reads no props would keep the old
 * sentences after a switch, so a new language renders it afresh.
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
    const { locale, translations } = usePage().props;

    setLanguage(locale, translations);
    applyDayjsLocale(locale);

    // The server writes <html lang> for a full page load. A switch between
    // pages happens without one.
    useEffect(() => {
        document.documentElement.lang = locale.replaceAll('_', '-');
    }, [locale]);

    return (
        <StyleProvider layer>
            <ConfigProvider theme={theme} locale={antdLocaleFor(locale)}>
                <App component={false}>
                    <Fragment key={locale}>{children}</Fragment>
                </App>
            </ConfigProvider>
        </StyleProvider>
    );
}
