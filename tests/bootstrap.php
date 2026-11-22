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
