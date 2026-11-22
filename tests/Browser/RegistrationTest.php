<?php

use App\Models\User;

test('a visitor creates an account', function () {
    visit('/register')
        ->type('name', 'Taylor Otwell')
        ->type('email', 'taylor@example.com')
        ->type('password', 'password')
        ->type('password_confirmation', 'password')
        ->press('@register-user-button')
        ->assertPathIsNot('/register')
        ->assertNoJavaScriptErrors();

    expect(User::where('email', 'taylor@example.com')->exists())->toBeTrue();
});

test('the registration page renders without JavaScript errors', function () {
    visit('/register')->assertNoJavaScriptErrors();
});
