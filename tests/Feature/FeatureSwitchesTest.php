<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

/*
 * A project turns a feature off by leaving it out of config/fortify.php, so
 * these tests expect the switches it has, and a test that needs a feature on
 * skips while the project has it off.
 */

test('the features prop says which Fortify features are on', function () {
    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('features', fortifyFeatureFlags()));
});

test('turning a feature off sets its flag to false and leaves the others as they were', function (string $flag, string $feature) {
    $this->skipUnlessFortifyHas($feature);

    $flagsBefore = fortifyFeatureFlags();

    turnFortifyFeatureOff($feature);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('features', [...$flagsBefore, $flag => false]));
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
    $this->skipUnlessFortifyHas(Features::registration());

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
    $this->skipUnlessFortifyHas(Features::emailVerification());

    $this->actingAs(User::factory()->unverified()->create())
        ->get(route('dashboard'))
        ->assertRedirect(route('verification.notice'));
});

test('with email verification on registering sends the verification mail', function () {
    $this->skipUnlessFortifyHas(Features::registration());
    $this->skipUnlessFortifyHas(Features::emailVerification());

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
    if ($emailVerificationIsOn) {
        $this->skipUnlessFortifyHas(Features::emailVerification());
    } else {
        turnFortifyFeatureOff(Features::emailVerification());
    }

    $this->actingAs(User::factory()->create())
        ->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('mustVerifyEmail', $emailVerificationIsOn));
})->with([
    'on' => true,
    'off' => false,
]);
