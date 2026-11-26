import { expect, test, vi } from 'vite-plus/test';
import { antdLocaleFor } from '@/ui/locales';

// The server bundle leaves antd external, and Node hands a CommonJS module
// over whole: `import zhCN from 'antd/locale/zh_CN'` is `{ default: locale }`
// there, and the locale itself in the browser.
vi.mock('antd/locale/zh_CN', async (importOriginal) => ({
    default: { default: (await importOriginal<{ default: object }>()).default },
}));
vi.mock('antd/locale/en_US', async (importOriginal) => ({
    default: { default: (await importOriginal<{ default: object }>()).default },
}));

test('a locale that arrives inside its CommonJS module is the same locale', () => {
    expect(antdLocaleFor('zh_CN').locale).toBe('zh-cn');
    expect(antdLocaleFor('en').locale).toBe('en');
});
