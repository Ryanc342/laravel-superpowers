import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { setLanguage } from '@/lib/i18n';
import Dashboard from '@/pages/dashboard';

/*
 * The project's own dashboard. The template ships this file once and the
 * project owns it: change it with `resources/js/pages/dashboard.tsx`.
 */

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));

beforeEach(() => {
    setLanguage('en', []);
});

test('the dashboard names itself once, as its page title, with no breadcrumbs', () => {
    render(<Dashboard />);

    expect(
        screen
            .getAllByRole('heading', { level: 1 })
            .map((heading) => heading.textContent),
    ).toEqual(['Dashboard']);
    expect(document.querySelector('.ant-breadcrumb')).toBeNull();
});

test('the dashboard shows its placeholder figures and says to replace them', () => {
    render(<Dashboard />);

    for (const title of ['Visits', 'New sign-ups', 'Orders', 'Revenue']) {
        expect(screen.getByText(title)).toBeTruthy();
    }

    expect(screen.getByText('12,846')).toBeTruthy();
    expect(screen.getByText('Replace with your own figures')).toBeTruthy();
});
