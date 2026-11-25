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
| Every file in tests/Support is loaded here. Put your project's own test
| helper functions in that directory.
|
*/

foreach (glob(__DIR__.'/Support/*.php') as $helperFile) {
    require_once $helperFile;
}
