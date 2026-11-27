<?php

use App\Models\User;
use Laravel\Fortify\Features;

test('a visitor creates an account', function () {
    $this->skipUnlessFortifyHas(Features::registration());

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
    $this->skipUnlessFortifyHas(Features::registration());

    visit('/register')->assertNoJavaScriptErrors();
});

test('the login page links to registration', function () {
    $this->skipUnlessFortifyHas(Features::registration());

    visit('/login')
        ->assertSee("Don't have an account?")
        ->assertSee('Sign up');
});

test('registration turned off hides every sign-up link', function () {
    turnFortifyFeatureOff(Features::registration());

    visit('/login')
        ->assertSee('Log in to your account')
        ->assertDontSee("Don't have an account?")
        ->assertDontSee('Sign up');
});
