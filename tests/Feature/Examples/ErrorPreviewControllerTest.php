<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * The error pages, previewed: in local development debug mode is on, and an
 * error shows Laravel's own page instead, so each status the `error` page
 * renders has a route that shows it.
 */

beforeEach(function () {
    $this->actingAs(User::factory()->create());
    config(['app.debug' => true]);
});

test('each status the error page renders can be previewed, in debug mode too', function (int $status) {
    $this->get(route('examples.errors.show', ['status' => $status]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('error')
            ->where('status', $status)
            ->has('auth.user'));
})->with([403, 404, 419, 429, 500, 503]);

test('a status the error page does not render has no preview', function () {
    $this->get('/examples/errors/418')->assertNotFound();
});
