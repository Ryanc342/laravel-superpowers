import { render, screen } from '@testing-library/react';
import { Empty } from 'antd';
import dayjs from 'dayjs';
import { memo } from 'react';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { t } from '@/lib/i18n';

const page = vi.hoisted(() => ({
    props: {} as Record<string, unknown>,
}));

vi.mock('@inertiajs/react', () => ({ usePage: () => page }));

import RootLayout from '@/layouts/root-layout';

// What antd's Empty says when it has no data: its own text, in the antd locale.
function emptyText(): string | null | undefined {
    return document.querySelector('.ant-empty-description')?.textContent;
}

const chinese = { locale: 'zh_CN', translations: { 'Log in': '登录' } };
const english = { locale: 'en', translations: [] };

// It takes no props and is memoized, like a component that nothing above can
// make render again.
const LogInLabel = memo(function LogInLabel() {
    return <span data-test="label">{t('Log in')}</span>;
});

function layout() {
    return (
        <RootLayout>
            <LogInLabel />
            <Empty />
        </RootLayout>
    );
}

afterEach(() => {
    document.documentElement.removeAttribute('lang');
});

test('a Chinese page gets Chinese sentences, antd text, dates and <html lang>', () => {
    page.props = chinese;
    render(layout());

    expect(screen.getByText('登录')).toBeTruthy();
    expect(emptyText()).toBe('暂无数据');
    expect(dayjs.locale()).toBe('zh-cn');
    expect(document.documentElement.lang).toBe('zh-CN');
});

test('an English page gets English sentences, antd text, dates and <html lang>', () => {
    page.props = english;
    render(layout());

    expect(screen.getByText('Log in')).toBeTruthy();
    expect(emptyText()).toBe('No data');
    expect(dayjs.locale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
});

test('a switch without a page load changes every sentence, even in a component that takes no props', () => {
    page.props = chinese;
    const { rerender } = render(layout());

    page.props = english;
    rerender(layout());

    expect(screen.getByText('Log in')).toBeTruthy();
    expect(emptyText()).toBe('No data');
    expect(document.documentElement.lang).toBe('en');
});
