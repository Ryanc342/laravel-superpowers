import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vite-plus/test';
import Dashboard from '@/pages/dashboard';
import Appearance from '@/pages/settings/appearance';
import Profile from '@/pages/settings/profile';
import Security from '@/pages/settings/security';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));
// The settings pages' dialogs read the screen width when they load.
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

test('the dashboard names itself once, as its page title', () => {
    render(<Dashboard />);

    expect(
        screen.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeTruthy();
});

test('pages reached from the sidebar or the user menu have no breadcrumbs', () => {
    for (const page of [Dashboard, Profile, Security, Appearance]) {
        expect(page.layout.breadcrumbs).toEqual([]);
    }
});
