<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Vite;
use Laravel\Fortify\Features;

abstract class TestCase extends BaseTestCase
{
    /**
     * Keep the tests away from the Vite dev server and from the build: point
     * Vite at a hot file that never exists, so a running dev server
     * (public/hot) is not used for assets, and replace Vite with an empty
     * handler, so a page renders without a built manifest. Turn Inertia's
     * server-side rendering off, so the page is not sent to the dev server or
     * an SSR server. A browser test gets the real Vite back with `withVite()`
     * (tests/Pest.php does it for tests/Browser).
     *
     * This is in setUp(), not in a Pest hook, so that tests written as
     * PHPUnit classes take the same path as tests written as closures.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Vite::useHotFile(storage_path('framework/testing/vite.hot'));

        $this->withoutVite();

        config(['inertia.ssr.enabled' => false]);
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}
