<?php

use Pest\Browser\Api\PendingAwaitablePage;

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
