import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { router } from '@inertiajs/react';
import { setLanguage } from '@/lib/i18n';
import Dashboard from '@/pages/dashboard';
import ErrorPage from '@/pages/error';
import type { ErrorStatus } from '@/pages/error';
import Welcome from '@/pages/welcome';

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

afterEach(() => {
    vi.restoreAllMocks();
});

function headings(): string[] {
    return screen
        .getAllByRole('heading', { level: 1 })
        .map((heading) => heading.textContent ?? '');
}

test('the dashboard names itself once, as its page title, with no breadcrumbs', () => {
    render(<Dashboard />);

    expect(headings()).toEqual(['Dashboard']);
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

test('the welcome page offers a guest sign-in and sign-up, and no dashboard', () => {
    render(<Welcome />);

    expect(
        screen.getByRole('link', { name: 'Log in' }).getAttribute('href'),
    ).toBe('/login');
    expect(
        screen.getByRole('link', { name: 'Register' }).getAttribute('href'),
    ).toBe('/register');
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull();
    expect(headings()).toEqual(['Build on an app that checks itself']);
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

const words: Record<ErrorStatus, { title: string; description: string }> = {
    403: {
        title: 'No permission',
        description: "You don't have access to this page.",
    },
    404: {
        title: 'Page not found',
        description: "This page doesn't exist or has moved.",
    },
    419: {
        title: 'Page expired',
        description: 'Your session expired. Refresh the page and try again.',
    },
    429: {
        title: 'Too many requests',
        description: 'Wait a moment, then try again.',
    },
    500: {
        title: 'Something went wrong',
        description: "It's on our side. Try again in a moment.",
    },
    503: {
        title: 'Back soon',
        description: "We're updating the system. Try again in a few minutes.",
    },
};

test.each(Object.entries(words))(
    'the %s page names what happened, once as its title, and says what to do',
    (status, { title, description }) => {
        render(<ErrorPage status={Number(status) as ErrorStatus} />);

        expect(headings()).toEqual([title]);
        expect(screen.getByText(description)).toBeTruthy();
    },
);

test.each([403, 404, 500] as const)(
    "the %s page has antd's illustration",
    (status) => {
        render(<ErrorPage status={status} />);

        expect(document.querySelector(`.ant-result-${status}`)).not.toBeNull();
    },
);

test('a guest is led back to the home page', () => {
    render(<ErrorPage status={404} />);

    expect(
        screen.getByRole('link', { name: 'Back to home' }).getAttribute('href'),
    ).toBe('/');
    expect(screen.queryByText('Back to dashboard')).toBeNull();
});

test('a signed-in user is led back to the dashboard', () => {
    visitor({ auth: { user } });

    render(<ErrorPage status={403} />);

    expect(
        screen
            .getByRole('link', { name: 'Back to dashboard' })
            .getAttribute('href'),
    ).toBe('/dashboard');
    expect(screen.queryByText('Back to home')).toBeNull();
});

test('an expired page offers to be loaded again, for a guest and a user alike', async () => {
    const reload = vi.spyOn(router, 'reload').mockImplementation(() => {});

    for (const props of [{}, { auth: { user } }]) {
        visitor(props);
        const { unmount } = render(<ErrorPage status={419} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Refresh the page' }),
        );
        unmount();
    }

    expect(reload).toHaveBeenCalledTimes(2);
});

test('the error page speaks the language of the page', () => {
    setLanguage('zh_CN', {
        'Too many requests': '请求过于频繁',
        'Wait a moment, then try again.': '请稍等片刻后重试。',
        'Back to home': '返回首页',
    });

    render(<ErrorPage status={429} />);

    expect(headings()).toEqual(['请求过于频繁']);
    expect(screen.getByText('请稍等片刻后重试。')).toBeTruthy();
    expect(screen.getByRole('link', { name: '返回首页' })).toBeTruthy();
});
