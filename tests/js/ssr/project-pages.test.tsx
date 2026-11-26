// @vitest-environment node
import type { ResolvedComponent } from '@inertiajs/react';
import { expect, test } from 'vite-plus/test';
import Dashboard from '@/pages/dashboard';
import Welcome from '@/pages/welcome';
import { serverRenderer } from '@/ui/server-render';
import { page } from './page';

/*
 * The project's own pages on the server, in the project's own theme and menu
 * (`theme.ts`, `navigation.ts`). The template ships this file once and the
 * project owns it: change it with the pages. The template's pages are in
 * `render.test.tsx`, which does not follow the project's theme and menu.
 */

const pages: Record<string, unknown> = {
    dashboard: Dashboard,
    welcome: Welcome,
};

const renderPage = serverRenderer((name) => pages[name] as ResolvedComponent);

test('the dashboard renders on the server inside the app shell, with its entry in the menu marked', async () => {
    const { body } = await renderPage(page('dashboard', '/dashboard'));

    // Pro's statistic cards are part of the server's page, in columns that
    // follow the screen in CSS: the server cannot know the screen's width.
    expect(body).toContain('ant-pro-statistic-card');
    expect(body).toContain('12,846');
    expect(body).toContain('ant-col-xl-6');

    expect(body).toContain('ant-pro-layout');
    expect(body).toMatch(
        /<li[^>]*class="[^"]*\bant-menu-item-selected\b[^"]*"(?:(?!<\/li>).)*href="\/dashboard"/,
    );
});

test('the welcome page renders on the server, with the links a guest has', async () => {
    const { body } = await renderPage(
        page('welcome', '/', { auth: { user: null } }),
    );

    expect(body).toContain('Build on an app that checks itself');
    expect(body).toContain('href="/login"');
    expect(body).toContain('href="/register"');
});
