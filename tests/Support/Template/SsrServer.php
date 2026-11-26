<?php

namespace Tests\Support\Template;

use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * The test run's own SSR server: Inertia's Node server on the SSR bundle the
 * build wrote (`bootstrap/ssr/ssr.js`, which `composer check:browser` builds),
 * the way production runs it. It listens on a free port, so a server a
 * developer has running on Inertia's port, 13714, is left alone.
 *
 * It starts the first time a test asks for its URL and runs until the test
 * run ends. It is a child of the run: the run stops it when it ends on its
 * own, and when the run is killed, tests/process-watchdog.sh (started by
 * tests/bootstrap.php) ends it with the run's other children. Nothing looks
 * for it by name.
 *
 * Node runs it with no NODE_ENV, as `php artisan inertia:start-ssr` usually
 * runs in production. Pro decides by NODE_ENV whether its class names carry
 * antd's hash, and in a browser, which has no NODE_ENV, they always do: with
 * NODE_ENV=development the server's class names would not be the browser's.
 * React still loads its development build, so its warnings reach the output,
 * which `takeOutput()` gives the test.
 */
final class SsrServer
{
    private static ?Process $process = null;

    private static int $port = 0;

    /** The server's base URL, for `inertia.ssr.url`. It starts the server when it is not running. */
    public static function url(): string
    {
        if (self::$process?->isRunning() !== true) {
            self::start();
        }

        return 'http://127.0.0.1:'.self::$port;
    }

    /**
     * What the server has written since it started or since the last call: a
     * failed render, React's warnings, anything a page logs while it renders.
     * Empty while every render is clean.
     */
    public static function takeOutput(): string
    {
        if (self::$process === null) {
            return '';
        }

        return trim(self::$process->getIncrementalOutput().self::$process->getIncrementalErrorOutput());
    }

    private static function start(): void
    {
        $bundle = dirname(__DIR__, 3).'/bootstrap/ssr/ssr.js';

        if (! is_file($bundle)) {
            throw new RuntimeException('There is no SSR bundle at bootstrap/ssr/ssr.js. `composer check:browser` builds it, or run `npm run build:ssr`.');
        }

        self::$port = self::freePort();
        self::$process = $process = new Process(
            ['node', $bundle],
            dirname($bundle, 3),
            ['INERTIA_SSR_PORT' => (string) self::$port, 'NODE_ENV' => false],
            timeout: null,
        );

        $process->start();
        register_shutdown_function(static fn () => $process->stop(2));

        $deadline = microtime(true) + 15;

        while (! str_contains($process->getOutput(), 'Inertia SSR server started.')) {
            if (! $process->isRunning()) {
                throw new RuntimeException("The SSR server stopped as it started:\n".$process->getOutput().$process->getErrorOutput());
            }

            if (microtime(true) > $deadline) {
                $process->stop(0);

                throw new RuntimeException("The SSR server did not start within 15 seconds:\n".$process->getOutput().$process->getErrorOutput());
            }

            usleep(20_000);
        }

        // The lines it writes as it starts are not a render's.
        self::takeOutput();
    }

    /** A port nothing listens on, as the system hands one out. */
    private static function freePort(): int
    {
        $socket = stream_socket_server('tcp://127.0.0.1:0', $errorCode, $errorMessage);

        if ($socket === false) {
            throw new RuntimeException("No free port for the SSR server: {$errorMessage}");
        }

        $address = (string) stream_socket_get_name($socket, false);
        fclose($socket);

        return (int) substr($address, strrpos($address, ':') + 1);
    }
}
