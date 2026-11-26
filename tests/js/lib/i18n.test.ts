import { afterEach, expect, test } from 'vite-plus/test';
import { currentLanguage, msg, setLanguage, t, tChoice } from '@/lib/i18n';

afterEach(() => {
    setLanguage('en', {});
});

test('t returns the translation of a sentence', () => {
    setLanguage('zh_CN', { 'Log in': '登录' });

    expect(t('Log in')).toBe('登录');
});

test('t fills :name, :Name and :NAME the way Laravel does', () => {
    setLanguage('zh_CN', { greeting: '你好，:name :Name :NAME' });

    expect(t('greeting', { name: 'ada' })).toBe('你好，ada Ada ADA');
});

test('t fills a longer placeholder before the shorter one that starts it', () => {
    expect(t(':names and :name', { name: 'one', names: 'many' })).toBe(
        'many and one',
    );
});

test('t fills a number', () => {
    setLanguage('zh_CN', { 'Retry in :seconds s': ':seconds 秒后重试' });

    expect(t('Retry in :seconds s', { seconds: 30 })).toBe('30 秒后重试');
});

test('a sentence with no translation shows its English text, placeholders filled', () => {
    setLanguage('zh_CN', { 'Log in': '登录' });

    expect(t('Welcome back, :name', { name: 'Ada' })).toBe('Welcome back, Ada');
});

test('English arrives as an empty array and reads like an empty table', () => {
    setLanguage('en', []);

    expect(t('Log in')).toBe('Log in');
});

test('a sentence that is also an Object property name is not a crash', () => {
    setLanguage('zh_CN', {});

    expect(t('constructor')).toBe('constructor');
    expect(t('toString')).toBe('toString');
    expect(tChoice('hasOwnProperty', 1)).toBe('hasOwnProperty');
});

test('the page has no translations before the first setLanguage call', () => {
    setLanguage('zh_CN', undefined);

    expect(t('Log in')).toBe('Log in');
});

test('currentLanguage is the language that was set last', () => {
    setLanguage('zh_CN', {});

    expect(currentLanguage()).toBe('zh_CN');

    setLanguage('en', []);

    expect(currentLanguage()).toBe('en');
});

test('msg marks a sentence and returns it as it is', () => {
    setLanguage('zh_CN', { Save: '保存' });

    expect(msg('Save')).toBe('Save');
    expect(t(msg('Save'))).toBe('保存');
});

test('tChoice picks the singular or the plural form in English', () => {
    const line = 'one task|:count tasks';

    expect(tChoice(line, 1)).toBe('one task');
    expect(tChoice(line, 2)).toBe('2 tasks');
    expect(tChoice(line, 0)).toBe('0 tasks');
});

test('tChoice has one form in Chinese, with :count filled', () => {
    setLanguage('zh_CN', { 'one task|:count tasks': ':count 个任务' });

    expect(tChoice('one task|:count tasks', 1)).toBe('1 个任务');
    expect(tChoice('one task|:count tasks', 5)).toBe('5 个任务');
});

test('tChoice follows explicit counts and ranges like trans_choice', () => {
    const line =
        '{0} no tasks|{1} one task|[2,9] :count tasks|[10,*] many tasks';

    expect(tChoice(line, 0)).toBe('no tasks');
    expect(tChoice(line, 1)).toBe('one task');
    expect(tChoice(line, 4)).toBe('4 tasks');
    expect(tChoice(line, 10)).toBe('many tasks');
});

test('tChoice fills the extra placeholders next to :count', () => {
    expect(
        tChoice(':name has one task|:name has :count tasks', 3, {
            name: 'Ada',
        }),
    ).toBe('Ada has 3 tasks');
});

test('a plural with no translation reads in English, even on a Chinese page', () => {
    setLanguage('zh_CN', {});

    expect(tChoice('one task|:count tasks', 5)).toBe('5 tasks');
    expect(tChoice('one task|:count tasks', 1)).toBe('one task');
});
