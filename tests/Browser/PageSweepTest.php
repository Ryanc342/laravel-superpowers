<?php

use App\Models\User;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Pest\Browser\Api\On;
use Pest\Browser\Api\PendingAwaitablePage;
use Symfony\Component\HttpFoundation\Response;

/*
 * Every page in the project's lists, on a desktop and on a phone. The lists
 * are `projectSweptPages()`, opened signed in as a verified user, and
 * `projectSweptGuestPages()`, opened as a guest (tests/Support/Template/
 * browser.php has the starter kit's pages; a project's own functions of those
 * names replace them). A page:
 *
 * - answers with a status below 400, so neither an error page nor a page
 *   the app does not have passes, even when it renders through Inertia;
 * - mounts the Inertia app in the browser (the build the sweep loads has no
 *   server-side rendering);
 * - ends up on the path that was asked for, and not on a redirect;
 * - raises no JavaScript error and writes nothing to the console, not even a
 *   warning.
 */

/**
 * At the top of every page, before its own scripts. Pest records what the
 * page writes with `console.log`; this adds what it writes with `console.warn`
 * and `console.error` to the same record, which `assertNoConsoleLogs()` reads.
 */
const RECORD_THE_CONSOLE = <<<'HTML'
    <script>
        for (const level of ['warn', 'error']) {
            const write = console[level];

            console[level] = (...args) => {
                window.__pestBrowser?.consoleLogs.push({ timestamp: Date.now(), message: `${level}: ${args.map(String).join(' ')}` });
                write.apply(console, args);
            };
        }
    </script>
    HTML;

beforeEach(function () {
    // The security page asks for the password first; the page itself is what is checked here.
    $this->withoutMiddleware(RequirePassword::class);

    app()->instance('the-sweep-recorder', new class
    {
        /**
         * The status of the first response to each path, by path.
         *
         * @var array<string, int>
         */
        public array $statuses = [];

        public function handle(Request $request, Closure $next): Response
        {
            $response = $next($request);
            $this->statuses[$request->getPathInfo()] ??= $response->getStatusCode();
            $html = $response->getContent();

            if (is_string($html) && str_contains($html, '<head>')) {
                $response->setContent(preg_replace('/<head>/', '<head>'.RECORD_THE_CONSOLE, $html, 1));
            }

            return $response;
        }
    });
    // Around every route, so it also sees the answer to a path no route matches.
    app(HttpKernel::class)->pushMiddleware('the-sweep-recorder');
});

/**
 * Wait, in the browser, until React has rendered the Inertia app and the
 * effects that run right after it have settled. It fails when React has not
 * rendered the page within 10 seconds. The wait runs in the browser, so the
 * test's server keeps answering the page's requests meanwhile.
 *
 * @param  PendingAwaitablePage|On  $page
 */
function waitForHydration(object $page): void
{
    expect($page->script(<<<'JS'
        () => new Promise((resolve) => {
            const started = performance.now();
            const check = () => {
                const root = document.getElementById('app')?.firstElementChild;

                if (root && Object.getOwnPropertyNames(root).some((key) => key.startsWith('__reactFiber$'))) {
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)));
                } else if (performance.now() - started > 10000) {
                    resolve(false);
                } else {
                    setTimeout(check, 20);
                }
            };

            check();
        })
        JS))->toBeTrue('React did not render the page within 10 seconds.');
}

/**
 * Open a page on a desktop or a phone and check it as the sweep does.
 */
function sweep(string $path, string $device): void
{
    $page = $device === 'phone' ? visit($path)->on()->mobile() : visit($path);
    $page->url(); // Opens it.

    $status = app('the-sweep-recorder')->statuses[(string) parse_url($path, PHP_URL_PATH)] ?? null;
    $hint = $status === 404 ? ' If the app has no such page, list only the pages it has in projectSweptPages() and projectSweptGuestPages() in tests/Support/*.php.' : '';

    expect($status)
        ->not->toBeNull("The sweep saw no answer to {$path}.")
        ->toBeLessThan(400, "{$path} answered with HTTP {$status}.{$hint}");

    waitForHydration($page);

    $page->assertPathIs((string) parse_url($path, PHP_URL_PATH))
        ->assertNoJavaScriptErrors()
        ->assertNoConsoleLogs();
}

// A project may leave one list empty: Pest fails on an empty dataset, so an
// empty list gives a single case, which is skipped.
test('a signed-in page mounts the app and raises no JavaScript error or console message', function (?string $path, string $device) {
    if ($path === null) {
        $this->markTestSkipped('projectSweptPages() lists no page.');
    }

    $this->actingAs(User::factory()->create());

    sweep($path, $device);
})->with(projectSweptPages() ?: ['no page' => null])->with(['desktop', 'phone']);

test('a guest page mounts the app and raises no JavaScript error or console message', function (?string $path, string $device) {
    if ($path === null) {
        $this->markTestSkipped('projectSweptGuestPages() lists no page.');
    }

    sweep($path, $device);
})->with(projectSweptGuestPages() ?: ['no page' => null])->with(['desktop', 'phone']);

test('the sweep records what a page writes with console.warn and console.error', function () {
    // A page of the test's own: the project may have no page this could rely on.
    Route::middleware('web')->get('/the-sweep-console-recorder', fn () => '<html><head></head><body></body></html>');

    $page = visit('/the-sweep-console-recorder');
    $page->script("console.warn('a warning'); console.error('an error')");

    $page->assertScript('window.__pestBrowser.consoleLogs.map(({ message }) => message)', ['warn: a warning', 'error: an error']);
});
