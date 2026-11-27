<?php

use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

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

    try {
        $route = app('router')->getRoutes()->match(Request::create((string) parse_url($path, PHP_URL_PATH), 'GET'));
    } catch (HttpException) {
        $this->fail("No GET route matches {$path}, which the page sweep lists. The sweep's page lists are the project's: declare projectSweptPages() and projectSweptGuestPages() in a tests/Support/*.php file of the project's own, and list the pages the app has.");
    }

    expect($route->methods())->toContain('GET');
})->with(fn () => [...array_values(projectSweptPages()), ...array_values(projectSweptGuestPages())] ?: ['no page' => null]);
