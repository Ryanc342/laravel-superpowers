<?php

use PHPUnit\Framework\ExpectationFailedException;

/**
 * Guards the pairing of pest-plugin-browser with the Playwright version in
 * package.json, not app behaviour. Playwright 1.62+ reads an action's timeout
 * from the request metadata; pest-plugin-browser 4.x sent it only in the
 * params, so a stuck action waited forever and the browser suite hung here.
 */
test('an action on an element that never appears fails at the browser timeout instead of waiting forever', function () {
    $page = visit('/')->assertNoJavaScriptErrors();

    expect(fn () => $page->click('@element-that-never-appears'))
        ->toThrow(ExpectationFailedException::class, 'Timeout');
});
