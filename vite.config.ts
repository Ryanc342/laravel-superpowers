import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig, lazyPlugins } from 'vite-plus';
import { antdStyles } from './resources/js/ui/vite-antd-styles';
import { buildHasExamples } from './resources/js/ui/vite-examples';

export default defineConfig({
    define: {
        // Whether this build has the page-type examples (ui/pages.ts).
        __EXAMPLES__: JSON.stringify(buildHasExamples()),
    },
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
        react({ compiler: true }),
        antdStyles(),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ]),
    ssr: {
        // Pro's ES build imports antd's locale files without their extension,
        // which Node cannot load, so the SSR bundle carries Pro itself.
        noExternal: ['@ant-design/pro-components'],
    },
    server: {
        watch: {
            ignored: [
                '**/.agents/**',
                '**/.claude/**',
                '**/.cursor/**',
                '**/.junie/**',
                '**/.worktrees/**',
                '**/vendor/**',
            ],
        },
    },
    // Frontend unit tests: `npm run test` (vp test), part of `composer check`.
    test: {
        include: ['tests/js/**/*.test.{ts,tsx}'],
        environment: 'jsdom',
        setupFiles: ['tests/js/setup.ts'],
        server: {
            deps: {
                // Vitest would inline Pro on its own, since its ES build is
                // not valid Node ESM. Loading it the way Node does, as the SSR
                // bundle does, lets tests/js/ssr fail when Pro is not bundled.
                external: ['@ant-design/pro-components'],
            },
        },
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
            // It asks for <output> in place of role="status" and the like,
            // but a live region on a div or span is the standard ARIA pattern.
            'jsx-a11y/prefer-tag-over-role': 'off',
        },
        ignorePatterns: [
            'vendor/**',
            'node_modules/**',
            'public/**',
            'bootstrap/ssr/**',
            'tailwind.config.js',
            'resources/js/actions/**',
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
            'resources/views/mail/*',
            // Claude Code rewrites it with two-space indents whenever it
            // saves a permission.
            '.claude/settings.json',
            // Written by Laravel Boost (boost:install, boost:update and its
            // record-rule tool), which would undo any reformatting.
            '.agents/skills/**',
            '.ai/rules/**',
            '.claude/skills/**',
            '.codex/config.toml',
            '.mcp.json',
            'AGENTS.md',
            'boost.json',
            'CLAUDE.md',
        ],
        sortTailwindcss: {
            stylesheet: 'resources/css/app.css',
        },
    },
});
