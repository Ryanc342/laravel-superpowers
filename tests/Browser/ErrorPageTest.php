<?php

use App\Models\User;

/*
 * The error page in a browser: a URL no route matches is the 404 page, with
 * one button back to where the visitor belongs.
 */

beforeEach(function () {
    config(['app.debug' => false]);
});

test('a guest on a missing page can go back to the home page', function () {
    visit('/no/such/page')
        ->assertSee('Page not found')
        ->assertScript("[...document.querySelectorAll('h1')].map((heading) => heading.textContent)", ['Page not found'])
        ->assertDontSee('Back to dashboard')
        ->assertNoJavaScriptErrors()
        ->click('Back to home')
        ->assertPathIs('/');
});

// The user signs in through the form, so that only the session cookie tells the server who they are.
test('a signed-in user on a missing page can go back to the dashboard', function () {
    $user = User::factory()->create();

    visit('/login')
        ->type('email', $user->email)
        ->type('password', 'password')
        ->press('@login-button')
        ->assertPathIs('/dashboard')
        ->navigate('/no/such/page')
        ->assertSee('Page not found')
        ->assertDontSee('Back to home')
        ->assertNoJavaScriptErrors()
        ->click('Back to dashboard')
        ->assertPathIs('/dashboard');
});

test('the error page renders in dark mode and on a phone without JavaScript errors', function (string $mode) {
    $page = visit('/no/such/page');

    $page = match ($mode) {
        'dark' => $page->inDarkMode(),
        default => $page->on()->mobile(),
    };

    $page->assertSee('Page not found')
        ->assertNoJavaScriptErrors();
})->with(['dark', 'mobile']);
