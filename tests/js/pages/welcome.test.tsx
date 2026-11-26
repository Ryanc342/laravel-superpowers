import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { setLanguage } from '@/lib/i18n';
import Welcome from '@/pages/welcome';

/*
 * The project's own welcome page. The template ships this file once and the
 * project owns it: change it with `resources/js/pages/welcome.tsx`.
 */

const inertia = vi.hoisted(() => ({
    page: { props: {} as Record<string, unknown> },
}));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    usePage: () => inertia.page,
    Head: () => null,
}));

const user = { id: 1, name: 'Test User', email: 'test@example.com' };

const everyFeatureOn = {
    registration: true,
    resetPasswords: true,
    emailVerification: true,
    twoFactorAuthentication: true,
    passkeys: true,
};

function visitor(props: Record<string, unknown> = {}): void {
    inertia.page.props = {
        name: 'Laravel',
        auth: { user: null },
        features: everyFeatureOn,
        locale: 'en',
        locales: [
            { value: 'zh_CN', label: '中文' },
            { value: 'en', label: 'English' },
        ],
        ...props,
    };
}

beforeEach(() => {
    visitor();
    setLanguage('en', []);
});

test('the welcome page offers a guest sign-in and sign-up, and no dashboard', () => {
    render(<Welcome />);

    expect(
        screen.getByRole('link', { name: 'Log in' }).getAttribute('href'),
    ).toBe('/login');
    expect(
        screen.getByRole('link', { name: 'Register' }).getAttribute('href'),
    ).toBe('/register');
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull();
    expect(
        screen
            .getAllByRole('heading', { level: 1 })
            .map((heading) => heading.textContent),
    ).toEqual(['Build on an app that checks itself']);
});

test('the welcome page leaves out sign-up while registration is off', () => {
    visitor({ features: { ...everyFeatureOn, registration: false } });

    render(<Welcome />);

    expect(screen.getByRole('link', { name: 'Log in' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Register' })).toBeNull();
});

test('the welcome page leads a signed-in user to the dashboard, not to sign-in', () => {
    visitor({ auth: { user } });

    render(<Welcome />);

    expect(
        screen.getByRole('link', { name: 'Dashboard' }).getAttribute('href'),
    ).toBe('/dashboard');
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Register' })).toBeNull();
});
