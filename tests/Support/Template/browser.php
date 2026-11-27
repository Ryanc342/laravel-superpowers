<?php

/*
 * The template's own browser test helpers. tests/Pest.php loads this file
 * after the project's tests/Support/*.php, and each helper is declared only
 * when no function of its name exists yet: a project's own one replaces it.
 */

if (! function_exists('projectSweptPages')) {
    /**
     * The signed-in pages the page sweep (tests/Browser/PageSweepTest.php)
     * opens, by what they are, name ⇒ path. The sweep has no list of its own:
     * these are the pages of the starter kit, and it opens each as a verified
     * user, on a desktop and on a phone. A project declares its own
     * `projectSweptPages()` in a tests/Support/*.php file, which replaces this
     * one, so it lists every signed-in page of its app, the starter kit's
     * ones it keeps among them: `['the invoices' => '/invoices']`.
     *
     * @return array<string, string>
     */
    function projectSweptPages(): array
    {
        return [
            'dashboard' => '/dashboard',
            'profile settings' => '/settings/profile',
            'security settings' => '/settings/security',
            'appearance settings' => '/settings/appearance',
            'password confirmation' => '/user/confirm-password',
        ];
    }
}

if (! function_exists('projectSweptGuestPages')) {
    /**
     * The pages the page sweep opens as a guest, by what they are,
     * name ⇒ path. The sweep has no list of its own: these are the starter
     * kit's welcome page and its sign-in pages. A project declares its own
     * `projectSweptGuestPages()` next to its `projectSweptPages()`, which
     * replaces this one, so it lists every page a guest opens in its app:
     * `['the pricing page' => '/pricing']`.
     *
     * @return array<string, string>
     */
    function projectSweptGuestPages(): array
    {
        return [
            'welcome' => '/',
            'login' => '/login',
            'registration' => '/register',
            'forgot password' => '/forgot-password',
            'password reset' => '/reset-password/a-token?email=taylor%40example.com',
        ];
    }
}
