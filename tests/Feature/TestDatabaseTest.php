<?php

use Illuminate\Support\Facades\DB;

test('a test run keeps the test database locked so a second run waits for it', function () {
    $lockName = env('TEST_DATABASE_LOCK');

    expect(DB::scalar('SELECT IS_FREE_LOCK(?)', [$lockName]))->toBe(0);
});
