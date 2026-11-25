<?php

use PHPUnit\Framework\ExpectationFailedException;

test('an action on an element that never appears fails at the browser timeout instead of waiting forever', function () {
    $page = visit('/');

    expect(fn () => $page->click('@element-that-never-appears'))
        ->toThrow(ExpectationFailedException::class, 'Timeout');

    $page->assertNoJavaScriptErrors();
});
