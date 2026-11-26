<?php

use App\Models\User;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Finder\SplFileInfo;

/*
 * The page-type examples exist only in local development and in the tests:
 * routes/web.php loads routes/examples.php only there, and the examples'
 * routes check the environment again on every request.
 */

test('the orders example opens in the testing environment', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('examples.orders.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('examples/orders/index'));
});

test('a guest is sent to log in before an example', function () {
    $this->get(route('examples.orders.index'))
        ->assertRedirect(route('login'));
});

test('the examples answer 404 once the environment is production', function () {
    $this->actingAs(User::factory()->create());
    $url = route('examples.orders.index');

    app()->detectEnvironment(fn () => 'production');

    $this->get($url)->assertNotFound();
});

test('the menu gets the examples from the server, and none outside local and testing', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('examples.0.key', 'examples')
            ->where('examples.0.label', 'Examples')
            ->where('examples.0.children.0.label', 'Orders')
            ->where('examples.0.children.0.href', '/examples/orders'));

    app()->detectEnvironment(fn () => 'production');

    $this->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('examples', null));
});

// The menu's labels are English, and the browser translates them with t(),
// so the check of the sentences the code shows does not see them.
test('every label of the examples menu has Chinese', function () {
    $this->actingAs(User::factory()->create());

    $labels = function (array $items) use (&$labels): array {
        return collect($items)->flatMap(fn (array $item) => [$item['label'], ...$labels($item['children'] ?? [])])->all();
    };
    $menu = $this->get(route('dashboard'))->inertiaProps('examples');
    $chinese = json_decode(File::get(lang_path('template/zh_CN.json')), true);

    expect($labels($menu))->not->toBeEmpty()->each(fn ($label) => $label->toBeIn(array_keys($chinese)));
});

// A cached route list keeps its middleware: a closure would be cached but could not be loaded.
test('the routes can be cached and loaded again with the examples in them', function () {
    $cache = sys_get_temp_dir().'/routes-'.Str::random(8).'.php';

    try {
        $artisan = fn (string ...$arguments) => Process::path(base_path())
            ->env(['APP_ROUTES_CACHE' => $cache])
            ->run([PHP_BINARY, 'artisan', ...$arguments]);

        expect($artisan('route:cache')->successful())->toBeTrue();

        $list = $artisan('route:list', '--path=examples/orders');

        expect($list->successful())->toBeTrue($list->output())
            ->and($list->output())->toContain('examples.orders.index');
    } finally {
        File::delete($cache);
    }
});

/*
 * Wayfinder writes the route functions a build imports when the build starts,
 * from the routes the app has. A production build has no example routes and
 * leaves the example pages out, so nothing else may import an example page,
 * an example route, or a generated module that has more in local and testing
 * than in production: the build would stop, or the page would break when it
 * runs. CI also builds for production, after every other check.
 */
test('outside the example pages, the front end imports only what a production build has', function () {
    $production = sys_get_temp_dir().'/wayfinder-production-'.Str::random(8);
    $local = sys_get_temp_dir().'/wayfinder-testing-'.Str::random(8);

    try {
        foreach (['production' => $production, 'testing' => $local] as $environment => $path) {
            Process::path(base_path())
                ->env(['APP_ENV' => $environment])
                ->run([PHP_BINARY, 'artisan', 'wayfinder:generate', '--path='.$path])
                ->throw();
        }

        $sources = collect(Finder::create()->files()->in(resource_path('js'))->name(['*.ts', '*.tsx'])
            ->notPath('#^(actions|routes|wayfinder|pages/examples)/#'))
            ->mapWithKeys(fn (SplFileInfo $file) => [str_replace('\\', '/', $file->getRelativePathname()) => $file->getContents()])
            ->all();

        expect($sources)->toHaveKey('ui/example-menu.ts')
            ->and(productionImportProblems($sources, $production, $local))->toBe([]);
    } finally {
        File::deleteDirectory($production);
        File::deleteDirectory($local);
    }
});

test('the import check finds each way into what a production build does not have', function () {
    $generated = sys_get_temp_dir().'/wayfinder-made-up-'.Str::random(8);
    $write = function (string $path, string $code) use ($generated): void {
        File::ensureDirectoryExists(dirname("{$generated}/{$path}"));
        File::put("{$generated}/{$path}", $code);
    };

    // Production's routes, then local's: the same, and the examples.
    foreach (['production', 'local'] as $environment) {
        $write("{$environment}/wayfinder/index.ts", "export const queryParams = () => ''\nexport type RouteDefinition = {}\n");
        $write("{$environment}/routes/index.ts", "import { queryParams } from './../wayfinder'\nexport const dashboard = () => '/dashboard'\n");
        $write("{$environment}/actions/App/Http/index.ts", "import Controllers from './Controllers'\nconst Http = { Controllers }\nexport default Http\n");
        $write("{$environment}/actions/App/Http/Controllers/LocaleController.ts", "const LocaleController = () => '/locale'\nexport default LocaleController\n");
    }
    $write('production/actions/App/Http/Controllers/index.ts', "import LocaleController from './LocaleController'\nexport default { LocaleController }\n");
    $write('local/actions/App/Http/Controllers/index.ts', "import LocaleController from './LocaleController'\nimport Examples from './Examples'\nexport default { LocaleController, Examples }\n");
    $write('local/actions/App/Http/Controllers/Examples/index.ts', "export default {}\n");
    $write('local/routes/examples/orders/index.ts', "export const index = () => '/examples/orders'\n");

    $sources = [
        'ui/alias-page.ts' => "import { formatMoney } from '@/pages/examples/orders/order';",
        'ui/relative-page.tsx' => "import { formatMoney } from '../pages/examples/orders/order.ts';",
        'ui/dynamic-page.ts' => "const page = () => import('@/pages/examples/orders/index');",
        'ui/relative-route.ts' => "import {\n    index,\n} from '../routes/examples/orders';",
        'ui/default-index.ts' => "import Controllers from '@/actions/App/Http/Controllers';",
        'ui/namespace-of-parent.ts' => "import * as Http from '@/actions/App/Http';",
        'ui/re-export.ts' => "export * from '@/actions/App/Http/Controllers';",
        'ui/missing-name.ts' => "import { dashboard, examples } from '@/routes';",
        'ui/fine.tsx' => implode("\n", [
            "import { dashboard } from '@/routes';",
            "import LocaleController from '@/actions/App/Http/Controllers/LocaleController';",
            "import { queryParams, type RouteDefinition } from '@/wayfinder';",
            "import type { OrderRow } from '@/pages/examples/orders/order';",
            "import { Button } from 'antd';",
            "import './app.css';",
        ]),
    ];

    try {
        expect(productionImportProblems($sources, "{$generated}/production", "{$generated}/local"))->toBe([
            '@/pages/examples/orders/order (ui/alias-page.ts): an example page, which a production build leaves out',
            '../pages/examples/orders/order.ts (ui/relative-page.tsx): an example page, which a production build leaves out',
            '@/pages/examples/orders/index (ui/dynamic-page.ts): an example page, which a production build leaves out',
            '../routes/examples/orders (ui/relative-route.ts): not generated in production',
            '@/actions/App/Http/Controllers (ui/default-index.ts): the whole module, which has more in local and testing than in production',
            '@/actions/App/Http (ui/namespace-of-parent.ts): the whole module, which has more in local and testing than in production',
            '@/actions/App/Http/Controllers (ui/re-export.ts): the whole module, which has more in local and testing than in production',
            '@/routes (ui/missing-name.ts): examples is not exported in production',
        ]);
    } finally {
        File::deleteDirectory($generated);
    }
});
