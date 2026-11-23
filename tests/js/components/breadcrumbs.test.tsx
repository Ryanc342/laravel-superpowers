import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { Breadcrumbs } from '@/components/breadcrumbs';

const page = vi.hoisted(() => ({ url: '/projects/2' }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ url: page.url, props: {} }),
    Link: ({ href, children }: { href: string; children: ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

beforeEach(() => {
    page.url = '/projects/2';
});

test("a record's page ends its breadcrumbs at the list, and that last crumb is the way back", () => {
    render(
        <Breadcrumbs
            breadcrumbs={[{ title: 'Projects', href: '/projects' }]}
        />,
    );

    expect(
        screen.getByRole('link', { name: 'Projects' }).getAttribute('href'),
    ).toBe('/projects');
});

test('the last crumb is plain text when it is the page the user is on', () => {
    page.url = '/projects';

    const { container } = render(
        <Breadcrumbs
            breadcrumbs={[{ title: 'Projects', href: '/projects' }]}
        />,
    );

    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText('Projects').getAttribute('aria-current')).toBe(
        'page',
    );
});
