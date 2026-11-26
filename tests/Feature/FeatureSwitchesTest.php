<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

test('the features prop says which Fortify features are on', function () {
    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('features', [
            'registration' => true,
            'resetPasswords' => true,
            'emailVerification' => true,
            'twoFactorAuthentication' => true,
            'passkeys' => true,
        ]));
});

test('turning a feature off sets its flag to false and leaves the others on', function (string $flag, string $feature) {
    turnFortifyFeatureOff($feature);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('features', [
            'registration' => $flag !== 'registration',
            'resetPasswords' => $flag !== 'resetPasswords',
            'emailVerification' => $flag !== 'emailVerification',
            'twoFactorAuthentication' => $flag !== 'twoFactorAuthentication',
            'passkeys' => $flag !== 'passkeys',
        ]));
})->with([
    'registration' => ['registration', Features::registration()],
    'password reset' => ['resetPasswords', Features::resetPasswords()],
    'email verification' => ['emailVerification', Features::emailVerification()],
    'two-factor authentication' => ['twoFactorAuthentication', Features::twoFactorAuthentication()],
    'passkeys' => ['passkeys', Features::passkeys()],
]);

test('with email verification off an unverified user reaches the dashboard', function () {
    turnFortifyFeatureOff(Features::emailVerification());

    $this->actingAs(User::factory()->unverified()->create())
        ->get(route('dashboard'))
        ->assertOk();
});

test('with email verification off registering sends no verification mail', function () {
    turnFortifyFeatureOff(Features::emailVerification());
    Notification::fake();

    $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticated();
    Notification::assertNothingSent();
});

test('with email verification on an unverified user is sent to the notice', function () {
    $this->actingAs(User::factory()->unverified()->create())
        ->get(route('dashboard'))
        ->assertRedirect(route('verification.notice'));
});

test('with email verification on registering sends the verification mail', function () {
    Notification::fake();

    $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    Notification::assertSentTo(User::query()->sole(), VerifyEmail::class);
});

test("the profile page's mustVerifyEmail follows the email verification feature", function (bool $emailVerificationIsOn) {
    if (! $emailVerificationIsOn) {
        turnFortifyFeatureOff(Features::emailVerification());
    }

    $this->actingAs(User::factory()->create())
        ->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('mustVerifyEmail', $emailVerificationIsOn));
})->with([
    'on' => true,
    'off' => false,
]);
