import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import LanguageSwitch from '@/components/language-switch';
import { setLanguage } from '@/lib/i18n';

const inertia = vi.hoisted(() => ({
    page: { props: {} as Record<string, unknown> },
    visit: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => inertia.page,
    router: { visit: inertia.visit },
}));

const locales = [
    { value: 'zh_CN', label: '中文' },
    { value: 'en', label: 'English' },
];

beforeEach(() => {
    inertia.page.props = { locale: 'zh_CN', locales };
    setLanguage('zh_CN', { 'Language: :language': '语言：:language' });
});

afterEach(() => {
    inertia.visit.mockReset();
    setLanguage('en', []);
});

test('it names the current language and what the button is for', () => {
    render(<LanguageSwitch />);

    const button = screen.getByRole('button', { name: '语言：中文' });

    expect(button.getAttribute('data-test')).toBe('language-switch');
    expect(button.textContent).toBe('中文');
});

test('choosing the other language visits the locale route, keeping the scroll position', async () => {
    render(<LanguageSwitch />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByText('English'));

    expect(inertia.visit).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ url: '/locale', method: 'put' }),
        { data: { locale: 'en' }, preserveScroll: true },
    );
});

test('choosing the current language visits nothing', async () => {
    render(<LanguageSwitch />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(
        await screen.findByRole('menuitem', { name: '中文' }),
    );

    expect(inertia.visit).not.toHaveBeenCalled();
});
