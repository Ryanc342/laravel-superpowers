import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vite-plus/test';
import Dashboard from '@/pages/dashboard';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));

test('the dashboard names itself once, as its page title', () => {
    render(<Dashboard />);

    expect(
        screen.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeTruthy();
});

test('the dashboard, reached from the sidebar, has no breadcrumbs', () => {
    expect(Dashboard.layout.breadcrumbs).toEqual([]);
});
