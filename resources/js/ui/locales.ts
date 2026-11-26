import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import type { Locale } from 'antd/es/locale';

/**
 * antd's locale files are CommonJS. The browser bundle gives the locale itself,
 * but the server bundle leaves antd to Node, which gives the whole module,
 * `{ default: locale }`. Both leave here as the locale.
 */
function unwrapLocale(imported: Locale | { default: Locale }): Locale {
    return 'default' in imported ? imported.default : imported;
}

/**
 * The antd locale for the page's language (`zh_CN` or `en`), which gives the
 * built-in text of antd and Pro (pagination, empty states, the search form's
 * buttons). English is the answer for any language the template does not know.
 */
export function antdLocaleFor(locale: string): Locale {
    return unwrapLocale(locale === 'zh_CN' ? zhCN : enUS);
}

/**
 * Points dayjs at the page's language, so dates antd and Pro format (month
 * names, weekdays) are written in it. dayjs keeps one language for the whole
 * app, so this is called with every render of the root layout.
 */
export function applyDayjsLocale(locale: string): void {
    dayjs.locale(locale === 'zh_CN' ? 'zh-cn' : 'en');
}
