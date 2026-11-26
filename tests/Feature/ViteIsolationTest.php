<?php

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Vite;

test('pages render while the Vite dev server is running', function () {
    $hotFile = public_path('hot');
    $createdHotFile = ! file_exists($hotFile);

    if ($createdHotFile) {
        file_put_contents($hotFile, 'http://127.0.0.1:5173');
    }

    try {
        Http::preventStrayRequests();

        $this->get(route('login'))->assertOk();
    } finally {
        if ($createdHotFile) {
            @unlink($hotFile);
        }
    }
});

test('pages render without a built Vite manifest', function () {
    Vite::useManifestFilename('missing-manifest.json');

    $this->get(route('login'))->assertOk();
});
