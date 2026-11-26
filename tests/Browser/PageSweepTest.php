<?php

use App\Models\User;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Http\Request;
use Illuminate\Routing\Route as RegisteredRoute;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

/*
 * Every signed-in page of the app and every example page, on a desktop and on
 * a phone: it loads with no JavaScript error and nothing in the console, it
 * has one h1, its title, and the page itself never scrolls sideways.
 */

/**
 * The template's pages, by what they are. An example page that is not here
 * fails the check below. A project lists its own in `projectSweptPages()`.
 *
 * @return array<string, string>
 */
function sweptPages(): array
{
    return [
        'the dashboard' => '/dashboard',
        'the profile settings' => '/settings/profile',
        'the security settings' => '/settings/security',
        'the appearance settings' => '/settings/appearance',
        'the orders example' => '/examples/orders',
        'an order' => '/examples/orders/5',
        'a new order' => '/examples/orders/create',
        'an order to edit' => '/examples/orders/5/edit',
        'the steps example' => '/examples/steps',
        'the queue example' => '/examples/queue',
        'the dashboard example' => '/examples/dashboard',
        'the report example' => '/examples/report',
        'the success result' => '/examples/result/success',
        'the error result' => '/examples/result/error',
        'the 403 page' => '/examples/errors/403',
        'the 404 page' => '/examples/errors/404',
        'the 419 page' => '/examples/errors/419',
        'the 429 page' => '/examples/errors/429',
        'the 500 page' => '/examples/errors/500',
        'the 503 page' => '/examples/errors/503',
    ];
}

/**
 * The template's pages and the project's own (`projectSweptPages()`).
 *
 * @return array<string, string>
 */
function pagesToSweep(): array
{
    return [...sweptPages(), ...projectSweptPages()];
}

/**
 * Pest records what the page writes with `console.log`, from before the page's
 * scripts run. This script, at the top of every page, adds what it writes with
 * `console.warn` and `console.error` to the same record, which
 * `assertNoConsoleLogs()` reads.
 */
const RECORD_CONSOLE_WARNINGS = <<<'HTML'
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
    $this->actingAs(User::factory()->create());

    // The security page asks for the password first; the page itself is what is checked here.
    $this->withoutMiddleware(RequirePassword::class);

    app()->instance('record-console-warnings', new class
    {
        public function handle(Request $request, Closure $next): Response
        {
            $response = $next($request);
            $html = $response->getContent();

            if (is_string($html) && str_contains($html, '<head>')) {
                $response->setContent(preg_replace('/<head>/', '<head>'.RECORD_CONSOLE_WARNINGS, $html, 1));
            }

            return $response;
        }
    });
    // Through the kernel: it gives the router its groups again when it is first made.
    app(HttpKernel::class)->appendMiddlewareToGroup('web', 'record-console-warnings');
});

test('a page loads cleanly, with one h1, and is no wider than the screen', function (string $path, string $device) {
    $page = $device === 'phone' ? visit($path)->on()->mobile() : visit($path);

    // Pest reads a bare `h1` as text to look for, so the headings are counted
    // in the page. On a phone the browser widens `innerWidth` to fit what
    // overflows, so the screen's width is the visual viewport's.
    $page->assertPathIs($path)
        ->assertScript("document.querySelectorAll('h1').length", 1)
        ->assertScript('document.documentElement.scrollWidth <= window.visualViewport.width', true)
        ->assertNoJavaScriptErrors()
        ->assertNoConsoleLogs();
})->with(pagesToSweep())->with(['desktop', 'phone']);

test('the sweep records what a page writes with console.warn and console.error', function () {
    $page = visit('/dashboard');
    $page->script("console.warn('a warning'); console.error('an error')");

    $page->assertScript('window.__pestBrowser.consoleLogs.map(({ message }) => message)', ['warn: a warning', 'error: an error']);
});

test('the sweep opens the project\'s own pages as well as the template\'s', function () {
    // A project page under a template page's name would replace it in the sweep.
    expect(array_intersect_key(projectSweptPages(), sweptPages()))->toBe([])
        ->and(pagesToSweep())
        ->toMatchArray(sweptPages())
        ->toMatchArray(projectSweptPages())
        ->toHaveCount(count(sweptPages()) + count(projectSweptPages()));
});

test('every example page is in the sweep', function () {
    $swept = collect(sweptPages())
        ->map(fn (string $path) => app('router')->getRoutes()->match(Request::create($path))->getName())
        ->all();
    $examplePages = collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RegisteredRoute $route) => str_starts_with((string) $route->getName(), 'examples.')
            && in_array('GET', $route->methods(), true))
        ->map(fn (RegisteredRoute $route) => $route->getName())
        // A download, not a page.
        ->reject(fn (string $name) => $name === 'examples.report.export')
        ->values()
        ->all();

    expect($swept)->toContain(...$examplePages);
});

test('the dashboard example loads more activity at the end of the feed, and the address keeps no page', function () {
    $entries = "document.querySelectorAll('[data-test=\"activity-entry\"]').length";

    visit('/examples/dashboard')
        ->assertScript($entries, 10)
        ->press('@load-more-activity-button')
        ->assertScript($entries, 20)
        ->assertScript('location.search', '')
        ->assertNoJavaScriptErrors()
        ->assertNoConsoleLogs();
});
