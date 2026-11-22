<?php

use App\Models\User;
use PragmaRX\Google2FA\Google2FA;

test('a user turns on two-factor authentication', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $page = visitSecurityPage()
        ->press('Enable 2FA')
        ->assertSee('Enable two-factor authentication')
        ->press('Continue')
        ->assertSee('Verify authentication code');

    $secret = decrypt($user->fresh()->two_factor_secret);

    $page->type('code', app(Google2FA::class)->getCurrentOtp($secret))
        ->press('Confirm')
        ->assertSee('Disable 2FA')
        ->assertNoJavaScriptErrors();

    expect($user->fresh()->two_factor_confirmed_at)->not->toBeNull();
});

test('a user with two-factor authentication logs in with a code from their app', function () {
    $google2fa = app(Google2FA::class);
    $secret = $google2fa->generateSecretKey();

    $user = User::factory()->create([
        'two_factor_secret' => encrypt($secret),
        'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
        'two_factor_confirmed_at' => now(),
    ]);

    visit('/login')
        ->type('email', $user->email)
        ->type('password', 'password')
        ->press('@login-button')
        ->assertPathIs('/two-factor-challenge')
        ->type('code', $google2fa->getCurrentOtp($secret))
        ->press('Continue')
        ->assertPathIs('/dashboard');
});

test('a user with two-factor authentication logs in with a recovery code', function () {
    $user = User::factory()->withTwoFactor()->create();

    visit('/login')
        ->type('email', $user->email)
        ->type('password', 'password')
        ->press('@login-button')
        ->assertPathIs('/two-factor-challenge')
        ->click('login using a recovery code')
        ->type('recovery_code', 'recovery-code-1')
        ->press('Continue')
        ->assertPathIs('/dashboard');
});
