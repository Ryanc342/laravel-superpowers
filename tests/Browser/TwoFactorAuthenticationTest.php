<?php

use App\Models\User;
use PragmaRX\Google2FA\Google2FA;

/*
 * The challenge's code is six boxes. Typing the whole code into the first one
 * fills them all, like pasting it does.
 */
const FIRST_CODE_DIGIT = '[data-test="code"] input >> nth=0';

/*
 * Pest retries an assertion on the page until it passes or the browser times
 * out, so one made right after a click waits for the heading to change.
 */
const PAGE_HEADINGS = "[...document.querySelectorAll('h1')].map((heading) => heading.textContent)";

test('a user turns on two-factor authentication', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $page = visitSecurityPage()
        ->press('Enable 2FA')
        ->assertSee('Enable two-factor authentication')
        ->assertPresent('.ant-modal svg')
        ->press('Continue')
        ->assertSee('Verify authentication code');

    $secret = decrypt($user->fresh()->two_factor_secret);

    $page->type(FIRST_CODE_DIGIT, app(Google2FA::class)->getCurrentOtp($secret))
        ->press('Confirm')
        ->assertSee('Disable 2FA')
        ->assertNoJavaScriptErrors();

    expect($user->fresh()->two_factor_confirmed_at)->not->toBeNull();
});

/*
 * The same button is "Continue" and then "Confirm": a click on it must only
 * move to the code step. Sent as it is, the click would submit the still empty
 * code, show an error before the user typed anything, and (as Fortify treats an
 * empty code as leaving the setup) turn two-factor authentication off again.
 */
test('continuing to the code step sends nothing', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $page = visitSecurityPage()
        ->press('Enable 2FA')
        ->assertSee('Enable two-factor authentication')
        ->press('Continue')
        ->assertSee('Verify authentication code');

    // Nothing is sent after the click, so there is nothing to wait for: a
    // fixed wait gives a request that was sent the time to come back.
    $page->wait(1)
        ->assertDontSee('The provided two factor authentication code was invalid.')
        ->assertScript("performance.getEntriesByType('resource').filter((entry) => entry.name.includes('confirmed-two-factor-authentication')).length", 0);

    expect($user->fresh()->two_factor_secret)->not->toBeNull();
});

test('the setup dialog shows the key to enter by hand', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $page = visitSecurityPage()
        ->press('Enable 2FA')
        ->assertSee('Enable two-factor authentication');

    $secret = decrypt($user->fresh()->two_factor_secret);

    $page->assertSee($secret);
});

test('a wrong setup code shows its error once, under the code', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    visitSecurityPage()
        ->press('Enable 2FA')
        ->press('Continue')
        ->type(FIRST_CODE_DIGIT, '000000')
        ->press('Confirm')
        ->assertSee('The provided two factor authentication code was invalid.')
        ->assertCount('.ant-form-item-explain-error', 1)
        ->assertScript("document.body.innerText.split('The provided two factor authentication code was invalid.').length - 1", 1);

    expect($user->fresh()->two_factor_confirmed_at)->toBeNull();
});

test('a user turns two-factor authentication off after confirming it', function () {
    $user = User::factory()->withTwoFactor()->create();
    $this->actingAs($user);

    visitSecurityPage()
        ->press('Disable 2FA')
        ->assertSee('Disable two-factor authentication?')
        ->press('Disable')
        ->assertSee('Enable 2FA');

    expect($user->fresh()->two_factor_secret)->toBeNull();
});

test('keeping two-factor authentication on when the confirmation is cancelled', function () {
    $user = User::factory()->withTwoFactor()->create();
    $this->actingAs($user);

    visitSecurityPage()
        ->press('Disable 2FA')
        ->press('Cancel')
        ->assertSee('Disable 2FA');

    expect($user->fresh()->two_factor_secret)->not->toBeNull();
});

test('a user views and regenerates their recovery codes', function () {
    $user = User::factory()->withTwoFactor()->create();
    $this->actingAs($user);

    visitSecurityPage()
        ->assertDontSee('recovery-code-1')
        ->press('View recovery codes')
        ->assertSee('recovery-code-1')
        ->press('Regenerate codes')
        ->assertSee('Regenerate recovery codes?')
        ->press('Regenerate')
        ->assertDontSee('recovery-code-1')
        ->assertNoJavaScriptErrors();

    expect(json_decode(decrypt($user->fresh()->two_factor_recovery_codes)))->not->toContain('recovery-code-1');
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
