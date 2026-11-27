<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Vite;
use Laravel\Fortify\Features;
use Tests\Support\Template\SsrServer;

abstract class TestCase extends BaseTestCase
{
    /**
     * Keep the tests away from the Vite dev server and from the build: point
     * Vite at a hot file that never exists, so a running dev server
     * (public/hot) is not used for assets, and replace Vite with an empty
     * handler, so a page renders without a built manifest. Turn Inertia's
     * server-side rendering off, so the page is not sent to the dev server or
     * the SSR server. A test that wants the server's render turns it back on
     * with `withServerRendering()`; a browser test gets the real Vite back
     * with `withVite()` (tests/Pest.php does it for tests/Browser).
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

    /**
     * Render pages on the server as production does: through the SSR bundle
     * the build wrote, on the test run's own SSR server (`SsrServer`). A page
     * the server fails to render throws, where Inertia would quietly leave it
     * to the browser, and a render that hangs fails after 30 seconds.
     */
    protected function withServerRendering(): void
    {
        config([
            'inertia.ssr.enabled' => true,
            'inertia.ssr.url' => SsrServer::url(),
            'inertia.ssr.throw_on_error' => true,
            'inertia.ssr.timeout' => 30,
        ]);
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}
