<?php

use App\Models\User;
use Dom\Element;
use Dom\HTMLDocument;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Http\Request;
use Illuminate\Routing\Route as RegisteredRoute;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Inertia\Ssr\SsrRenderFailed;
use Pest\Browser\Api\On;
use Pest\Browser\Api\PendingAwaitablePage;
use Symfony\Component\HttpFoundation\Response;
use Tests\Support\Template\SsrServer;

/*
 * Every page of the app and every example page, on a desktop and on a phone,
 * rendered on the server the way production renders it: through the SSR
 * bundle the build wrote, on the test run's own SSR server. A page:
 *
 * - comes from the server rendered: `#app` holds the page and its h1, and no
 *   Pro field that waits for its code ("…");
 * - hydrates in the browser with no JavaScript error and nothing in the
 *   console (a hydration error is both), shows no "…" field afterwards
 *   either, and the SSR server writes nothing while it renders it;
 * - has one h1, its title, and never scrolls sideways.
 */

/**
 * The template's signed-in pages, by what they are. An example page that is
 * not here fails the check below. A project lists its own in
 * `projectSweptPages()`.
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
 * The template's pages outside the signed-in app, by what they are, with who
 * opens them: a guest, a user whose email address is not verified yet, or a
 * signed-in user. A project lists its own guest pages in
 * `projectSweptGuestPages()`. The sweep skips a page whose Fortify feature
 * the project turned off (`fortifyFeatureOfPage()`).
 *
 * @return array<string, array{string, 'guest'|'unverified user'|'user'}>
 */
function sweptPagesOutsideTheApp(): array
{
    return [
        'the home page' => ['/', 'guest'],
        'the login page' => ['/login', 'guest'],
        'the registration page' => ['/register', 'guest'],
        'the forgotten password page' => ['/forgot-password', 'guest'],
        'the password reset page' => ['/reset-password/a-token?email=taylor%40example.com', 'guest'],
        'a page that does not exist' => ['/no/such/page', 'guest'],
        'the email verification notice' => ['/email/verify', 'unverified user'],
        'the password confirmation' => ['/user/confirm-password', 'user'],
    ];
}

/**
 * The signed-in pages: the template's and the project's own (`projectSweptPages()`).
 *
 * @return array<string, string>
 */
function pagesToSweep(): array
{
    return [...sweptPages(), ...projectSweptPages()];
}

/**
 * The pages outside the signed-in app: the template's and the project's own
 * guest pages (`projectSweptGuestPages()`).
 *
 * @return array<string, array{string, 'guest'|'unverified user'|'user'}>
 */
function pagesOutsideTheAppToSweep(): array
{
    return [
        ...sweptPagesOutsideTheApp(),
        ...array_map(fn (string $path): array => [$path, 'guest'], projectSweptGuestPages()),
    ];
}

/**
 * At the top of every page, before its own scripts. Pest records what the
 * page writes with `console.log`; this adds what it writes with `console.warn`
 * and `console.error` to the same record, which `assertNoConsoleLogs()` reads.
 * It also counts every Pro field placeholder ("…", `data-pro-field-loading`)
 * that enters the page, from the server's HTML or from React, in
 * `window.__sweptFieldPlaceholders`.
 */
const RECORD_THE_PAGE = <<<'HTML'
    <script>
        for (const level of ['warn', 'error']) {
            const write = console[level];

            console[level] = (...args) => {
                window.__pestBrowser?.consoleLogs.push({ timestamp: Date.now(), message: `${level}: ${args.map(String).join(' ')}` });
                write.apply(console, args);
            };
        }

        window.__sweptFieldPlaceholders = 0;

        new MutationObserver((mutations) => {
            for (const node of mutations.flatMap((mutation) => [...mutation.addedNodes])) {
                if (node instanceof Element && (node.matches('[data-pro-field-loading]') || node.querySelector('[data-pro-field-loading]'))) {
                    window.__sweptFieldPlaceholders++;
                }
            }
        }).observe(document, { childList: true, subtree: true });
    </script>
    HTML;

beforeEach(function () {
    $this->withServerRendering();

    // What the SSR server wrote before this test is not this test's.
    SsrServer::takeOutput();

    // The security page asks for the password first; the page itself is what is checked here.
    $this->withoutMiddleware(RequirePassword::class);

    // It keeps the last page the server sent, as the browser got it, and
    // every render the SSR server failed.
    app()->instance('record-the-page', $recorder = new class
    {
        public ?string $html = null;

        /** @var list<string> */
        public array $failedRenders = [];

        public function handle(Request $request, Closure $next): Response
        {
            $response = $next($request);
            $html = $response->getContent();

            if (is_string($html) && str_contains($html, '<head>')) {
                $this->html = $html;
                $response->setContent(preg_replace('/<head>/', '<head>'.RECORD_THE_PAGE, $html, 1));
            }

            return $response;
        }
    });
    // Through the kernel: it gives the router its groups again when it is first made.
    app(HttpKernel::class)->appendMiddlewareToGroup('web', 'record-the-page');

    Event::listen(SsrRenderFailed::class, function (SsrRenderFailed $failure) use ($recorder): void {
        $recorder->failedRenders[] = "{$failure->page['url']}: {$failure->error}";
    });
});

/**
 * The `#app` element of the last page the server sent.
 */
function serverRenderedApp(): Element
{
    $html = app('record-the-page')->html;

    expect($html)->toBeString('The server sent no page.');

    $app = HTMLDocument::createFromString($html, LIBXML_NOERROR)->getElementById('app');

    expect($app)->not->toBeNull('The page has no #app element.');

    return $app;
}

/**
 * Wait, in the browser, until React has hydrated the server's page and the
 * effects that run right after it (antd's breakpoints, which move Pro's menu
 * into a drawer on a phone) have settled. It fails when React has not
 * hydrated the page within 10 seconds. The wait runs in the browser, so the
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
        JS))->toBeTrue('React did not hydrate the page within 10 seconds.');
}

/**
 * Open a page on a desktop or a phone and check it as the sweep does.
 */
function sweep(string $path, string $device): void
{
    $page = $device === 'phone' ? visit($path)->on()->mobile() : visit($path);

    waitForHydration($page);

    expect(app('record-the-page')->failedRenders)->toBe([], "The SSR server failed to render {$path}.");

    $app = serverRenderedApp();

    expect($app->getAttribute('data-server-rendered'))->toBe('true', "The server did not render {$path}: the browser had to.")
        ->and($app->querySelectorAll('h1'))->toHaveCount(1, "The server's {$path} does not have one h1.")
        ->and($app->querySelectorAll('[data-pro-field-loading]'))->toHaveCount(0, "The server's {$path} has Pro fields that wait for their code (\"…\").")
        ->and(SsrServer::takeOutput())->toBe('', "The SSR server wrote this while it rendered {$path}.");

    // Pest reads a bare `h1` as text to look for, so the headings are counted
    // in the page. On a phone the browser widens `innerWidth` to fit what
    // overflows, so the screen's width is the visual viewport's.
    $page->assertPathIs((string) parse_url($path, PHP_URL_PATH))
        ->assertScript("document.querySelectorAll('h1').length", 1)
        ->assertScript('document.documentElement.scrollWidth <= window.visualViewport.width', true)
        ->assertScript('window.__sweptFieldPlaceholders', 0)
        ->assertNoJavaScriptErrors()
        ->assertNoConsoleLogs();
}

test('a signed-in page renders on the server, hydrates cleanly, has one h1 and is no wider than the screen', function (string $path, string $device) {
    $this->actingAs(User::factory()->create());

    sweep($path, $device);
})->with(pagesToSweep())->with(['desktop', 'phone']);

test('a page outside the app renders on the server, hydrates cleanly, has one h1 and is no wider than the screen', function (string $path, string $visitor, string $device) {
    // A project may turn a Fortify feature off, and Fortify then has no route for its pages.
    if (($feature = fortifyFeatureOfPage($path)) !== null) {
        $this->skipUnlessFortifyHas($feature, "{$path} is a page of the Fortify feature [{$feature}], which is not enabled.");
    }

    match ($visitor) {
        'unverified user' => $this->actingAs(User::factory()->unverified()->create()),
        'user' => $this->actingAs(User::factory()->create()),
        'guest' => null,
    };

    sweep($path, $device);
})->with(pagesOutsideTheAppToSweep())->with(['desktop', 'phone']);

test('the server\'s page is laid out for the screen before its JavaScript runs', function (string $path, string $device) {
    $this->actingAs(User::factory()->create());

    $page = $device === 'phone' ? visit($path)->on()->mobile() : visit($path);
    waitForHydration($page);

    $layout = layoutBeforeAndAfterJavaScript($page, app('record-the-page')->html);

    expect($layout['before'])->toBe($layout['after']);

    if ($device === 'phone') {
        expect($layout['before']['sideMenuWidth'])->toBe(0);
    }
})->with([
    'the profile settings' => '/settings/profile',
    'the orders example' => '/examples/orders',
])->with(['desktop', 'phone']);

/**
 * What decides the layout of a signed-in page, measured in the page as the
 * browser shows it once React has hydrated it (`after`), and in the server's
 * HTML before any script runs (`before`): that HTML is loaded, with its styles
 * and without its scripts, into a frame the size of the page.
 *
 * - `sideMenuWidth`: the side menu's width, 0 when there is none;
 * - `contentLeft`: where the page's content starts;
 * - `settingsMenuAcross`: whether the entries of the menu in the page's
 *   content, the settings menu, lie in one row (null on a page without one);
 * - `pageNumbers`: how many page numbers the pager shows.
 *
 * @param  PendingAwaitablePage|On  $page
 * @return array{before: array<string, mixed>, after: array<string, mixed>}
 */
function layoutBeforeAndAfterJavaScript(object $page, ?string $html): array
{
    expect($html)->toBeString('The server sent no page.');

    return $page->script(sprintf(<<<'JS'
        async () => {
            const measure = (view) => {
                const shown = (element) => element.getBoundingClientRect().width > 0;
                const sideMenus = [...view.querySelectorAll('.ant-pro-sider')].filter(shown);
                const content = view.querySelector('.ant-pro-layout-container');
                const settingsEntries = [...view.querySelectorAll('.ant-pro-layout-container .ant-menu-item')].filter(shown);
                const settingsRows = new Set(settingsEntries.map((entry) => Math.round(entry.getBoundingClientRect().top)));

                return {
                    sideMenuWidth: Math.max(0, ...sideMenus.map((menu) => Math.round(menu.getBoundingClientRect().width))),
                    contentLeft: Math.round(content?.getBoundingClientRect().left ?? -1),
                    settingsMenuAcross: settingsEntries.length === 0 ? null : settingsRows.size === 1,
                    pageNumbers: [...view.querySelectorAll('.ant-pagination-item')].filter(shown).length,
                };
            };
            const after = measure(document);
            const frame = document.createElement('iframe');

            frame.sandbox = 'allow-same-origin';
            frame.style.cssText = `position: absolute; top: 0; left: 0; width: ${document.documentElement.clientWidth}px; height: ${document.documentElement.scrollHeight}px; border: 0`;
            frame.srcdoc = %s;
            document.body.append(frame);
            await new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));

            // Measured while the frame is in the page: a removed one has no layout.
            const before = measure(frame.contentDocument);

            frame.remove();

            return { before, after };
        }
        JS, json_encode($html, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG)));
}

test('the sweep records what a page writes with console.warn and console.error', function () {
    $this->actingAs(User::factory()->create());

    $page = visit('/settings/profile');
    $page->script("console.warn('a warning'); console.error('an error')");

    $page->assertScript('window.__pestBrowser.consoleLogs.map(({ message }) => message)', ['warn: a warning', 'error: an error']);
});

test('the sweep counts the Pro field placeholders that enter the page', function () {
    $this->actingAs(User::factory()->create());

    $page = visit('/settings/profile');
    $page->script("document.body.append(Object.assign(document.createElement('span'), { textContent: '…' }), Object.assign(document.createElement('div'), { innerHTML: '<span data-pro-field-loading>…</span>' }))");

    $page->assertScript('window.__sweptFieldPlaceholders', 1);
});

test('the sweep opens the project\'s own pages as well as the template\'s', function () {
    // A project page under a template page's name would replace it in the sweep.
    expect(array_intersect_key(projectSweptPages(), sweptPages()))->toBe([])
        ->and(pagesToSweep())
        ->toMatchArray(sweptPages())
        ->toMatchArray(projectSweptPages())
        ->toHaveCount(count(sweptPages()) + count(projectSweptPages()))
        ->and(array_intersect_key(projectSweptGuestPages(), sweptPagesOutsideTheApp()))->toBe([])
        ->and(pagesOutsideTheAppToSweep())
        ->toMatchArray(sweptPagesOutsideTheApp())
        ->toHaveCount(count(sweptPagesOutsideTheApp()) + count(projectSweptGuestPages()));
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
    $this->actingAs(User::factory()->create());

    $entries = "document.querySelectorAll('[data-test=\"activity-entry\"]').length";

    $page = visit('/examples/dashboard')->assertScript($entries, 10);

    // The server rendered the button: a press before React hydrates the page is lost.
    waitForHydration($page);

    $page->press('@load-more-activity-button')
        ->assertScript($entries, 20)
        ->assertScript('location.search', '')
        ->assertNoJavaScriptErrors()
        ->assertNoConsoleLogs();
});
