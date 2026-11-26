<?php

use App\Models\User;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Symfony\Component\Finder\Finder;

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
 * from the routes the app has. A production build has no example routes, so
 * nothing outside the examples' own pages, which a production build leaves
 * out, may import one: the build would stop.
 */
test('outside the example pages, the front end imports only routes a production build has', function () {
    $generated = sys_get_temp_dir().'/wayfinder-production-'.Str::random(8);

    try {
        Process::path(base_path())
            ->env(['APP_ENV' => 'production'])
            ->run([PHP_BINARY, 'artisan', 'wayfinder:generate', '--path='.$generated])
            ->throw();

        $files = Finder::create()->files()->in(resource_path('js'))->name(['*.ts', '*.tsx'])
            ->notPath('#^(actions|routes|wayfinder|pages/examples)/#');
        $missing = [];

        foreach ($files as $file) {
            preg_match_all("~['\"]@/((?:routes|actions)(?:/[^'\"]*)?)['\"]~", $file->getContents(), $imports);

            foreach ($imports[1] as $module) {
                if (! File::exists("{$generated}/{$module}.ts") && ! File::exists("{$generated}/{$module}/index.ts")) {
                    $missing[] = "@/{$module} (".$file->getRelativePathname().')';
                }
            }
        }

        expect($missing)->toBe([]);
    } finally {
        File::deleteDirectory($generated);
    }
});
