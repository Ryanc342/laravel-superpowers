import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig, lazyPlugins } from 'vite-plus';

export default defineConfig({
    plugins: lazyPlugins(() => [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react(),
        babel({
            presets: [reactCompilerPreset()],
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ]),
    server: {
        watch: {
            ignored: [
                '**/.agents/**',
                '**/.claude/**',
                '**/.cursor/**',
                '**/.junie/**',
                '**/vendor/**',
            ],
        },
    },
    // Frontend unit tests: `npm run test` (vp test), part of `composer check`.
    test: {
        include: ['tests/js/**/*.test.{ts,tsx}'],
        environment: 'jsdom',
        setupFiles: ['tests/js/setup.ts'],
    },
    lint: {
        // Setting plugins replaces Oxlint's default list, so the defaults
        // (typescript, unicorn, oxc) are named here next to the two added:
        // react for the rules of hooks, jsx-a11y for accessibility.
        plugins: ['typescript', 'unicorn', 'oxc', 'react', 'jsx-a11y'],
        rules: {
            // In the pedantic category, so not on by default even with the
            // react plugin enabled.
            'react/rules-of-hooks': 'error',
            'react/exhaustive-deps': 'error',
        },
        overrides: [
            {
                // The starter kit's own auth screens order focus with positive
                // tabIndex values, autofocus their first field and mark a list
                // up with roles. They stay as the starter kit ships them, so
                // merging its updates stays easy; every other file is held to
                // these three rules.
                files: [
                    'resources/js/pages/auth/confirm-password.tsx',
                    'resources/js/pages/auth/forgot-password.tsx',
                    'resources/js/pages/auth/login.tsx',
                    'resources/js/pages/auth/register.tsx',
                    'resources/js/pages/auth/reset-password.tsx',
                    'resources/js/pages/auth/two-factor-challenge.tsx',
                    'resources/js/components/passkey-register.tsx',
                    'resources/js/components/two-factor-recovery-codes.tsx',
                    'resources/js/components/two-factor-setup-modal.tsx',
                ],
                rules: {
                    'jsx-a11y/tabindex-no-positive': 'off',
                    'jsx-a11y/no-autofocus': 'off',
                    'jsx-a11y/prefer-tag-over-role': 'off',
                },
            },
        ],
        ignorePatterns: [
            'vendor/**',
            'node_modules/**',
            'public/**',
            'bootstrap/ssr/**',
            'tailwind.config.js',
            'resources/js/actions/**',
            'resources/js/components/ui/*',
            'resources/js/routes/**',
            'resources/js/wayfinder/**',
        ],
        options: {
            denyWarnings: true,
            typeAware: true,
        },
    },
    fmt: {
        printWidth: 80,
        tabWidth: 4,
        singleQuote: true,
        semi: true,
        singleAttributePerLine: false,
        htmlWhitespaceSensitivity: 'css',
        ignorePatterns: [
            '.github/**',
            'composer.json',
            'resources/js/components/ui/*',
            'resources/views/mail/*',
        ],
        sortTailwindcss: {
            functions: ['clsx', 'cn', 'cva'],
            stylesheet: 'resources/css/app.css',
        },
    },
});
