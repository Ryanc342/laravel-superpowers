<?php

/*
|--------------------------------------------------------------------------
| Test Database
|--------------------------------------------------------------------------
|
| The tests run on MySQL, like production, in a database of their own: the
| application's database name with a "_test" suffix. RefreshDatabase wipes
| that database, so it is never the one you develop against. It is created
| here when it does not exist yet, so a fresh clone needs no extra step.
|
*/

use Dotenv\Dotenv;

require __DIR__.'/../vendor/autoload.php';

$dotenv = is_file(__DIR__.'/../.env')
    ? Dotenv::parse((string) file_get_contents(__DIR__.'/../.env'))
    : [];

$env = static function (string $key, string $default) use ($dotenv): string {
    $value = getenv($key);

    return $value !== false && $value !== '' ? $value : ($dotenv[$key] ?? $default);
};

$database = $env('DB_DATABASE', 'laravel').'_test';

putenv("DB_DATABASE={$database}");
$_ENV['DB_DATABASE'] = $_SERVER['DB_DATABASE'] = $database;

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s', $env('DB_HOST', '127.0.0.1'), $env('DB_PORT', '3306')),
    $env('DB_USERNAME', 'root'),
    $env('DB_PASSWORD', ''),
);

$pdo->exec(sprintf(
    'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET %s COLLATE %s',
    str_replace('`', '``', $database),
    $env('DB_CHARSET', 'utf8mb4'),
    $env('DB_COLLATION', 'utf8mb4_unicode_ci'),
));

/*
|--------------------------------------------------------------------------
| One Test Run at a Time
|--------------------------------------------------------------------------
|
| Two runs against the same test database break each other: one drops the
| tables while the other is still inside a test, and MySQL either reports
| a deadlock or waits on the lock with no end. It happens when the Stop
| hook's `composer check` starts while an agent's browser tests are still
| running in the background. So each run takes a MySQL lock named after
| the database and holds it until it exits, and a second run waits for
| it. The run passes the lock's name on in TEST_DATABASE_LOCK, so the
| processes it starts, such as parallel workers, know it is held.
|
| A second run waits up to TEST_DATABASE_LOCK_WAIT seconds, 600 when it
| is not set. With 0 it gives up at once and exits with 1, for a caller
| that would rather skip its run than queue behind another.
|
*/

if (getenv('TEST_DATABASE_LOCK') === false) {
    $waitSeconds = max(0, (int) $env('TEST_DATABASE_LOCK_WAIT', '600'));
    $lock = $pdo->prepare('SELECT GET_LOCK(?, ?)');
    $lock->execute([$database, 0]);

    if ((int) $lock->fetchColumn() !== 1) {
        if ($waitSeconds === 0) {
            fwrite(STDERR, "Another test run is using the {$database} database.\n");

            exit(1);
        }

        $waitTime = $waitSeconds % 60 === 0
            ? intdiv($waitSeconds, 60).' '.($waitSeconds === 60 ? 'minute' : 'minutes')
            : $waitSeconds.' '.($waitSeconds === 1 ? 'second' : 'seconds');

        fwrite(STDERR, "Another test run is using the {$database} database. Waiting up to {$waitTime} for it to finish.\n");

        $lock->execute([$database, $waitSeconds]);

        if ((int) $lock->fetchColumn() !== 1) {
            fwrite(STDERR, "Another test run kept the {$database} database for {$waitTime}. Stop it, then run the tests again.\n");

            exit(1);
        }
    }

    // The lock ends with its connection, and PHPUnit includes this file inside a method whose variables are freed on return.
    $GLOBALS['testDatabaseLock'] = $pdo;

    putenv("TEST_DATABASE_LOCK={$database}");
    $_ENV['TEST_DATABASE_LOCK'] = $_SERVER['TEST_DATABASE_LOCK'] = $database;
}
