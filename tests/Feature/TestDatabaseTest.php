<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;

test('a test run keeps the test database locked so a second run waits for it', function () {
    $lockName = env('TEST_DATABASE_LOCK');

    expect(DB::scalar('SELECT IS_FREE_LOCK(?)', [$lockName]))->toBe(0);
});

test('a second test run gives up at once when TEST_DATABASE_LOCK_WAIT is 0', function () {
    $lockName = env('TEST_DATABASE_LOCK');
    $startedAt = microtime(true);

    $result = Process::path(base_path())
        ->timeout(60)
        ->env([
            'TEST_DATABASE_LOCK' => false,
            'TEST_DATABASE_LOCK_WAIT' => '0',
            'DB_DATABASE' => Str::chopEnd($lockName, '_test'),
        ])
        ->run(['php', 'vendor/bin/pest', '--filter=a test run keeps the test database locked']);

    expect($result->exitCode())->toBe(1)
        ->and($result->errorOutput())->toContain('Another test run is using the')
        ->and(microtime(true) - $startedAt)->toBeLessThan(30);
});
