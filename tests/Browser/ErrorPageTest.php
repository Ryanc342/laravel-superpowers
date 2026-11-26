<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

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

// Laravel lets a same-origin browser request pass the CSRF check on its origin alone, so a stale token
// cannot make a 419 here: the profile route answers 419 itself, as the check would.
test('a form sent after its page expired stays filled in and shows a toast', function () {
    $this->actingAs(User::factory()->create());
    Route::getRoutes()->getByName('profile.update')->uses(fn () => abort(419));

    visit('/settings/profile')
        ->type('name', 'A New Name')
        ->press('@update-profile-button')
        ->assertSee('The page expired. Try again.')
        ->assertValue('name', 'A New Name')
        ->assertPathIs('/settings/profile')
        ->assertNoJavaScriptErrors();
});
