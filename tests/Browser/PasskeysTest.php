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

test('a user removes a passkey after confirming it', function () {
    $user = User::factory()->create();
    $user->passkeys()->create([
        'name' => 'Work laptop',
        'credential_id' => 'credential-1',
        'credential' => ['aaguid' => '00000000-0000-0000-0000-000000000000'],
    ]);
    $this->actingAs($user);

    visitSecurityPage()
        ->assertSee('Work laptop')
        ->press('@remove-passkey-button')
        ->assertSee('Remove the "Work laptop" passkey?')
        ->press('Remove')
        ->assertSee('No passkeys yet');

    expect($user->passkeys()->count())->toBe(0);
});

test('a passkey stays when removing it is cancelled', function () {
    $user = User::factory()->create();
    $user->passkeys()->create([
        'name' => 'Work laptop',
        'credential_id' => 'credential-1',
        'credential' => ['aaguid' => '00000000-0000-0000-0000-000000000000'],
    ]);
    $this->actingAs($user);

    visitSecurityPage()
        ->press('@remove-passkey-button')
        ->press('Cancel')
        ->assertSee('Work laptop');

    expect($user->passkeys()->count())->toBe(1);
});

test('turning passkeys off hides the passkeys section of the security page', function () {
    turnFortifyFeatureOff(Features::passkeys());
    $this->actingAs(User::factory()->create());

    visitSecurityPage()
        ->assertSee('Update password')
        ->assertDontSee('Passkeys');
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
