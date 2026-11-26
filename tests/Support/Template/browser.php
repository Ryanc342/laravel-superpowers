<?php

use Pest\Browser\Api\PendingAwaitablePage;

/*
 * The template's own browser test helpers. tests/Pest.php loads this file
 * after the project's tests/Support/*.php, and each helper is declared only
 * when no function of its name exists yet: a project's own one replaces it.
 */

if (! function_exists('projectSweptPages')) {
    /**
     * The project's own signed-in pages, by what they are, for the page sweep
     * (tests/Browser/PageSweepTest.php), which opens them as a signed-in
     * user next to the template's pages. A project declares its own
     * `projectSweptPages()` in a tests/Support/*.php file, with names of its
     * own: `['the invoices' => '/invoices']`. The template has none.
     *
     * @return array<string, string>
     */
    function projectSweptPages(): array
    {
        return [];
    }
}

if (! function_exists('projectSweptGuestPages')) {
    /**
     * The project's own pages for guests, by what they are, for the page
     * sweep, which opens them signed out next to the template's sign-in pages
     * and home page: `['the pricing page' => '/pricing']`. A project declares
     * its own `projectSweptGuestPages()` next to its `projectSweptPages()`.
     * The template has none.
     *
     * @return array<string, string>
     */
    function projectSweptGuestPages(): array
    {
        return [];
    }
}

if (! function_exists('visitSecurityPage')) {
    /**
     * Open the security settings page as the signed-in user, confirming the
     * password first (the password confirmation feature).
     */
    function visitSecurityPage(string $password = 'password'): PendingAwaitablePage
    {
        $page = visit('/settings/security');

        $page->assertPathIs('/user/confirm-password')
            ->type('password', $password)
            ->press('@confirm-password-button')
            ->assertPathIs('/settings/security');

        return $page;
    }
}
