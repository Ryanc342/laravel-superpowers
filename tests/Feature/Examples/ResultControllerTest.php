<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * The result example: what the user sees after the step-by-step form, when it
 * worked and when it did not.
 */

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

test('each result renders the result page with its status', function (string $status) {
    $this->get(route('examples.result.show', ['status' => $status]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('examples/result')
            ->where('status', $status));
})->with(['success', 'error']);

test('there is no other result', function () {
    $this->get('/examples/result/maybe')->assertNotFound();
});
