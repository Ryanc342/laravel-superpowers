<?php

use Illuminate\Http\Request;

test('the sweep has pages to open', function () {
    expect(projectSweptPages())->not->toBeEmpty()
        ->and(projectSweptGuestPages())->not->toBeEmpty();
});

test('every swept page is a GET route', function (string $path) {
    $route = app('router')->getRoutes()->match(Request::create(strtok($path, '?'), 'GET'));

    expect($route->methods())->toContain('GET');
})->with(fn () => array_values([...projectSweptPages(), ...projectSweptGuestPages()]));
