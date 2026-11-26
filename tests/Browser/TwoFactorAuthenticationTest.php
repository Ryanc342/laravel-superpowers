<?php

use App\Models\User;
use PragmaRX\Google2FA\Google2FA;

/*
 * The challenge's code is six boxes. Typing the whole code into the first one
 * fills them all, like pasting it does.
 */
const FIRST_CODE_DIGIT = '[data-test="code"] input >> nth=0';

const PAGE_HEADINGS = "[...document.querySelectorAll('h1')].map((heading) => heading.textContent)";

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
        ->type(FIRST_CODE_DIGIT, $google2fa->getCurrentOtp($secret))
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
        ->click('Use a recovery code')
        ->type('recovery_code', 'recovery-code-1')
        ->press('Continue')
        ->assertPathIs('/dashboard');
});

test('a wrong authentication code shows its error and keeps the user on the challenge', function () {
    $user = User::factory()->create([
        'two_factor_secret' => encrypt(app(Google2FA::class)->generateSecretKey()),
        'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
        'two_factor_confirmed_at' => now(),
    ]);

    visit('/login')
        ->type('email', $user->email)
        ->type('password', 'password')
        ->press('@login-button')
        ->assertPathIs('/two-factor-challenge')
        ->type(FIRST_CODE_DIGIT, '000000')
        ->press('Continue')
        ->assertSee('The provided two factor authentication code was invalid.')
        ->assertPathIs('/two-factor-challenge');
});

test('the challenge swaps the code for a recovery code and back', function () {
    $user = User::factory()->withTwoFactor()->create();

    visit('/login')
        ->type('email', $user->email)
        ->type('password', 'password')
        ->press('@login-button')
        ->assertPathIs('/two-factor-challenge')
        ->assertScript(PAGE_HEADINGS, ['Authentication code'])
        ->click('Use a recovery code')
        ->assertScript(PAGE_HEADINGS, ['Recovery code'])
        ->assertPresent('recovery_code')
        ->click('Use an authentication code')
        ->assertScript(PAGE_HEADINGS, ['Authentication code'])
        ->assertPresent('[data-test="code"]');
});
