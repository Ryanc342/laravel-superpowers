<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature and browser tests boot the Laravel application and run against a
| fresh copy of the test database (see tests/bootstrap.php for which one).
| Browser tests are their own suite: `composer check:browser` runs them.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature', 'Browser');

/*
|--------------------------------------------------------------------------
| Vite
|--------------------------------------------------------------------------
|
| TestCase::setUp() keeps every test away from the Vite dev server (public/
| hot) and replaces Vite with an empty handler, so a test renders a page
| with neither the dev server nor a built manifest, whether it is a closure
| or a PHPUnit class. Browser tests load the built assets for real, so they
| get the real Vite back.
|
*/

pest()->beforeEach(fn () => $this->withVite())->in('Browser');

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
|
| Put your project's own helper functions, custom expectations and classes
| in tests/Support/*.php: every file there is loaded here. Configuration with
| pest() or uses() stays in this file, with the rest of the suite's setup.
|
| The template's own helpers are in tests/Support/Template and load after
| yours. Each is declared only when no function of its name exists yet, so a
| function of yours with the same name, here or in tests/Support, replaces it.
|
*/

foreach (glob(__DIR__.'/Support/*.php') as $helperFile) {
    require_once $helperFile;
}

foreach (glob(__DIR__.'/Support/Template/*.php') as $helperFile) {
    require_once $helperFile;
}
