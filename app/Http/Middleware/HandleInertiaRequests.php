<?php

namespace App\Http\Middleware;

use App\Enums\Locale;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Middleware;
use Laravel\Fortify\Features;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            // The language of this request (SetLocale) and, for Chinese, the sentences React translates
            // with t(). English needs none: a sentence is its own English text. The sentences are sent
            // once per language, and again when the language changes.
            'locale' => Locale::current()->value,
            'locales' => Locale::options(),
            'translations' => Inertia::once(fn (): array => Locale::current()->sentences())
                ->as('translations.'.Locale::current()->value),
            // Which of Fortify's features config/fortify.php has on. The pages hide every way into a
            // feature that is off.
            'features' => [
                'registration' => Features::enabled(Features::registration()),
                'resetPasswords' => Features::enabled(Features::resetPasswords()),
                'emailVerification' => Features::enabled(Features::emailVerification()),
                'twoFactorAuthentication' => Features::canManageTwoFactorAuthentication(),
                'passkeys' => Features::enabled(Features::passkeys()),
            ],
            'auth' => [
                'user' => $request->user(),
            ],
            // The menu's group of page-type examples, which exist only in local development and in
            // the tests (EnsureExamplesExist): null anywhere else.
            'examples' => app()->environment(EnsureExamplesExist::ENVIRONMENTS) ? $this->exampleMenu() : null,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            // The rows-per-page choices under every paginated list (components/shared/pagination.tsx).
            'perPageOptions' => [10, 20, 50, 100],
        ];
    }

    /**
     * The menu's group of page-type examples. Their routes are named here, on the
     * server, so the browser's code names no example route: a production build has
     * no example routes, and leaves the example pages out. The labels are English,
     * and the browser translates them. Each entry is named after the page it opens.
     *
     * @return list<array{key: string, label: string, href: string, children: list<array{key: string, label: string, href: string, children?: list<array{key: string, label: string, href: string}>}>}>
     */
    private function exampleMenu(): array
    {
        /** @param  array<string, string|int>  $parameters */
        $entry = fn (string $key, string $label, string $route, array $parameters = []): array => [
            'key' => "examples.{$key}",
            'label' => $label,
            'href' => route($route, $parameters, absolute: false),
        ];
        $errors = [
            403 => 'No permission',
            404 => 'Page not found',
            419 => 'Page expired',
            429 => 'Too many requests',
            500 => 'Something went wrong',
            503 => 'Back soon',
        ];

        return [
            [
                'key' => 'examples',
                'label' => 'Examples',
                // Where the examples' URLs start (routes/examples.php); not a page.
                'href' => '/examples',
                'children' => [
                    $entry('orders', 'Orders', 'examples.orders.index'),
                    $entry('steps', 'New supplier', 'examples.steps.create'),
                    $entry('queue', 'Support queue', 'examples.queue.index'),
                    $entry('dashboard', 'Sales overview', 'examples.dashboard.index'),
                    $entry('report', 'Sales by product', 'examples.report.index'),
                    [
                        'key' => 'examples.result',
                        'label' => 'Result pages',
                        'href' => '/examples/result',
                        'children' => [
                            $entry('result.success', 'Supplier added', 'examples.result.show', ['status' => 'success']),
                            $entry('result.error', 'Supplier not added', 'examples.result.show', ['status' => 'error']),
                        ],
                    ],
                    [
                        'key' => 'examples.errors',
                        'label' => 'Error pages',
                        'href' => '/examples/errors',
                        'children' => array_map(
                            fn (int $status, string $title) => $entry("errors.{$status}", $title, 'examples.errors.show', ['status' => $status]),
                            array_keys($errors),
                            $errors,
                        ),
                    ],
                ],
            ],
        ];
    }
}
