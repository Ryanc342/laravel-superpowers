import type { Page } from '@inertiajs/core';

/**
 * An Inertia page as the server renders it, for a signed-in user, in English,
 * with every Fortify feature on and the examples in the menu. `props` adds to
 * the shared props or replaces them. The server render tests use it
 * (`render.test.tsx` for the template's pages, `project-pages.test.tsx` for the
 * project's own).
 */
export function page(
    component: string,
    url: string,
    props: Record<string, unknown> = {},
): Page {
    return {
        component,
        url,
        version: null,
        rescuedProps: [],
        flash: {},
        rememberedState: {},
        props: {
            errors: {},
            name: 'Laravel',
            auth: {
                user: {
                    id: 1,
                    name: 'Test User',
                    email: 'test@example.com',
                    email_verified_at: null,
                    created_at: '2026-11-26',
                    updated_at: '2026-11-26',
                },
            },
            locale: 'en',
            locales: [
                { value: 'zh_CN', label: '中文' },
                { value: 'en', label: 'English' },
            ],
            translations: [],
            features: {
                registration: true,
                resetPasswords: true,
                emailVerification: true,
                twoFactorAuthentication: true,
                passkeys: true,
            },
            examples: [
                {
                    key: 'examples',
                    label: 'Examples',
                    href: '/examples',
                    children: [
                        {
                            key: 'examples.orders',
                            label: 'Orders',
                            href: '/examples/orders',
                        },
                    ],
                },
            ],
            sidebarOpen: true,
            ...props,
        },
    } as unknown as Page;
}
