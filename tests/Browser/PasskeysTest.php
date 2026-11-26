<?php

use App\Models\User;
use Laravel\Fortify\Features;

/*
 * Registering a real passkey needs a WebAuthn authenticator, which a
 * headless browser does not have, so this only checks that the passkey
 * section of the security page works.
 */
test('the security page shows the passkeys section', function () {
    $this->actingAs(User::factory()->create());

    visitSecurityPage()
        ->assertSee('Passkeys')
        ->assertSee('No passkeys yet')
        ->assertNoJavaScriptErrors();
});

test('the login page offers to sign in with a passkey', function () {
    visit('/login')->assertSee('Sign in with a passkey');
});

test('passkeys turned off hide the passkey sign-in on the login page', function () {
    turnFortifyFeatureOff(Features::passkeys());

    visit('/login')
        ->assertSee('Log in to your account')
        ->assertDontSee('Sign in with a passkey');
});
