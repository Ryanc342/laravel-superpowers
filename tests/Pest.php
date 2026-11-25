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
| Feature tests never load Vite's assets, so they need neither the dev
| server nor a built manifest. Browser tests load the built assets for real.
| TestCase keeps both suites away from the dev server's public/hot file.
|
*/

pest()->beforeEach(fn () => $this->withoutVite())->in('Feature');

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
