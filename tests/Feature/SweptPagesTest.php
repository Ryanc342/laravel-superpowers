<?php

use Illuminate\Http\Request;

/*
 * The page sweep's lists. A project may leave one of them empty, but not both.
 */

test('the sweep has pages to open', function () {
    expect([...projectSweptPages(), ...projectSweptGuestPages()])
        ->not->toBeEmpty('projectSweptPages() and projectSweptGuestPages() list no page between them, so the page sweep opens none.');
});

test('every swept page is a GET route', function (?string $path) {
    if ($path === null) {
        $this->markTestSkipped('The sweep lists no page: "the sweep has pages to open" fails.');
    }

    $route = app('router')->getRoutes()->match(Request::create(strtok($path, '?'), 'GET'));

    expect($route->methods())->toContain('GET');
})->with(fn () => [...array_values(projectSweptPages()), ...array_values(projectSweptGuestPages())] ?: ['no page' => null]);
