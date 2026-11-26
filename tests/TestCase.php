<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Vite;
use Laravel\Fortify\Features;

abstract class TestCase extends BaseTestCase
{
    /**
     * Keep the tests away from the Vite dev server: point Vite at a hot file
     * that never exists, so a running dev server (public/hot) is not used for
     * assets, and turn Inertia's server-side rendering off, so the page is
     * not sent to the dev server or the SSR server.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Vite::useHotFile(storage_path('framework/testing/vite.hot'));

        config(['inertia.ssr.enabled' => false]);
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}
