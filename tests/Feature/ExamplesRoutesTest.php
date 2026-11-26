<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * The page-type examples exist only in local development and in the tests:
 * routes/web.php loads routes/examples.php only there, and the examples'
 * routes check the environment again on every request.
 */

test('the orders example opens in the testing environment', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('examples.orders.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('examples/orders/index'));
});

test('a guest is sent to log in before an example', function () {
    $this->get(route('examples.orders.index'))
        ->assertRedirect(route('login'));
});

test('the examples answer 404 once the environment is production', function () {
    $this->actingAs(User::factory()->create());
    $url = route('examples.orders.index');

    app()->detectEnvironment(fn () => 'production');

    $this->get($url)->assertNotFound();
});
