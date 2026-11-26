import dayjs from 'dayjs';
import { afterEach, expect, test } from 'vite-plus/test';
import { antdLocaleFor, applyDayjsLocale } from '@/ui/locales';

afterEach(() => {
    applyDayjsLocale('en');
});

test('Chinese gets the antd Chinese locale', () => {
    expect(antdLocaleFor('zh_CN').locale).toBe('zh-cn');
});

test('English gets the antd English locale', () => {
    expect(antdLocaleFor('en').locale).toBe('en');
});

test('a language the template does not know gets English', () => {
    expect(antdLocaleFor('fr').locale).toBe('en');
});

test('dayjs writes months in Chinese for Chinese and in English for English', () => {
    applyDayjsLocale('zh_CN');

    expect(dayjs.locale()).toBe('zh-cn');
    expect(dayjs('2026-11-26').format('MMMM')).toBe('十一月');

    applyDayjsLocale('en');

    expect(dayjs.locale()).toBe('en');
    expect(dayjs('2026-11-26').format('MMMM')).toBe('November');
});
