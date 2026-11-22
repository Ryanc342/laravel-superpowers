<?php

use Inertia\Testing\AssertableInertia as Assert;

test('every page receives the rows-per-page choices the pagination offers', function () {
    $response = $this->get(route('home'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('perPageOptions', [10, 20, 50, 100])
    );
});
