<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

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
        ->assertPathIs('/login');

    expect(Hash::check('new-password', $user->fresh()->password))->toBeTrue();
});
