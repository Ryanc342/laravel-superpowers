<?php

use App\Models\User;

test('a user logs in and lands on the dashboard', function () {
    $user = User::factory()->create();

    visit('/login')
        ->type('email', $user->email)
        ->type('password', 'password')
        ->press('@login-button')
        ->assertPathIs('/dashboard')
        ->assertNoJavaScriptErrors();
});

test('a wrong password keeps the user on the login page with an error', function () {
    $user = User::factory()->create();

    visit('/login')
        ->type('email', $user->email)
        ->type('password', 'wrong-password')
        ->press('@login-button')
        ->assertSee('These credentials do not match our records.')
        ->assertPathIs('/login');
});

test('a user logs out from the user menu', function () {
    $this->actingAs(User::factory()->create());

    visit('/dashboard')
        ->click('@sidebar-menu-button')
        ->click('@logout-button')
        ->assertPathIs('/');
});
