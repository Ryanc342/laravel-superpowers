<?php

use Pest\Browser\Api\PendingAwaitablePage;

/*
 * The template's own browser test helpers. tests/Pest.php loads this file
 * after the project's tests/Support/*.php, and each helper is declared only
 * when no function of its name exists yet: a project's own one replaces it.
 */

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
