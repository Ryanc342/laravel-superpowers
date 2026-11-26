<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Laravel\Fortify\Features;

test('a user asks for a password reset link', function () {
    $user = User::factory()->create();

    visit('/forgot-password')
        ->type('email', $user->email)
        ->press('@email-password-reset-link-button')
        ->assertSee('We have emailed your password reset link.');
});

test('a user chooses a new password from the reset link', function () {
    $user = User::factory()->create();
    $token = Password::broker()->createToken($user);

    visit("/reset-password/{$token}?email=".urlencode($user->email))
        ->type('password', 'new-password')
        ->type('password_confirmation', 'new-password')
        ->press('@reset-password-button')
        ->assertPathIs('/login')
        ->assertSee('Your password has been reset.');

    expect(Hash::check('new-password', $user->fresh()->password))->toBeTrue();
});

test('the login page links to the forgot password page', function () {
    visit('/login')
        ->click('Forgot password?')
        ->assertPathIs('/forgot-password');
});

test('password reset turned off hides the forgot password link', function () {
    turnFortifyFeatureOff(Features::resetPasswords());

    visit('/login')
        ->assertSee('Log in to your account')
        ->assertDontSee('Forgot password?');
});

test('an invalid reset link shows its error under the email field', function () {
    $user = User::factory()->create();

    visit('/reset-password/not-a-real-token?email='.urlencode($user->email))
        ->type('password', 'new-password')
        ->type('password_confirmation', 'new-password')
        ->press('@reset-password-button')
        ->assertSee('This password reset token is invalid.')
        ->assertPathBeginsWith('/reset-password/');

    expect(Hash::check('new-password', $user->fresh()->password))->toBeFalse();
});
