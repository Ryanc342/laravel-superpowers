<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Pest\Browser\Api\PendingAwaitablePage;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature and browser tests boot the Laravel application and run against a
| fresh copy of the test database (see tests/bootstrap.php for which one).
| Browser tests are their own suite: `composer check:browser` runs them.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature', 'Browser');

/*
|--------------------------------------------------------------------------
| Browser Helpers
|--------------------------------------------------------------------------
*/

/**
 * Open the security settings page as the signed-in user, confirming the
 * password first when the app asks for it (the password confirmation
 * feature). Kept here, in a file every app keeps, so the chisel markers
 * never sit in a test file that chisel may already have deleted.
 */
function visitSecurityPage(string $password = 'password'): PendingAwaitablePage
{
    $page = visit('/settings/security');

    /* @chisel-password-confirmation */
    $page->assertPathIs('/user/confirm-password')
        ->type('password', $password)
        ->press('@confirm-password-button')
        ->assertPathIs('/settings/security');
    /* @end-chisel-password-confirmation */

    return $page;
}
