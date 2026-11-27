<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Finder\SplFileInfo;

/*
 * A project turns a feature off by leaving it out of config/fortify.php, so
 * these tests expect the switches it has, and a test that needs a feature on
 * skips while the project has it off.
 */

test('the features prop says which Fortify features are on', function () {
    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('features', fortifyFeatureFlags()));
});

test('turning a feature off sets its flag to false and leaves the others as they were', function (string $flag, string $feature) {
    $this->skipUnlessFortifyHas($feature);

    $flagsBefore = fortifyFeatureFlags();

    turnFortifyFeatureOff($feature);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('features', [...$flagsBefore, $flag => false]));
})->with([
    'registration' => ['registration', Features::registration()],
    'password reset' => ['resetPasswords', Features::resetPasswords()],
    'email verification' => ['emailVerification', Features::emailVerification()],
    'two-factor authentication' => ['twoFactorAuthentication', Features::twoFactorAuthentication()],
    'passkeys' => ['passkeys', Features::passkeys()],
]);

test('with email verification off an unverified user reaches the dashboard', function () {
    turnFortifyFeatureOff(Features::emailVerification());

    $this->actingAs(User::factory()->unverified()->create())
        ->get(route('dashboard'))
        ->assertOk();
});

test('with email verification off registering sends no verification mail', function () {
    $this->skipUnlessFortifyHas(Features::registration());

    turnFortifyFeatureOff(Features::emailVerification());
    Notification::fake();

    $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticated();
    Notification::assertNothingSent();
});

test('with email verification on an unverified user is sent to the notice', function () {
    $this->skipUnlessFortifyHas(Features::emailVerification());

    $this->actingAs(User::factory()->unverified()->create())
        ->get(route('dashboard'))
        ->assertRedirect(route('verification.notice'));
});

test('with email verification on registering sends the verification mail', function () {
    $this->skipUnlessFortifyHas(Features::registration());
    $this->skipUnlessFortifyHas(Features::emailVerification());

    Notification::fake();

    $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    Notification::assertSentTo(User::query()->sole(), VerifyEmail::class);
});

test("the profile page's mustVerifyEmail follows the email verification feature", function (bool $emailVerificationIsOn) {
    if ($emailVerificationIsOn) {
        $this->skipUnlessFortifyHas(Features::emailVerification());
    } else {
        turnFortifyFeatureOff(Features::emailVerification());
    }

    $this->actingAs(User::factory()->create())
        ->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('mustVerifyEmail', $emailVerificationIsOn));
})->with([
    'on' => true,
    'off' => false,
]);

/*
 * The template's pages import the route functions of every feature, and hide
 * the way in while it is off. Wayfinder writes those functions from the routes
 * the app has, so it is shown every feature's routes, whichever are on: the
 * front end then builds in any project. The app itself keeps only the routes
 * of the features config/fortify.php has on.
 */
test('Wayfinder writes the routes of every feature, while the app has none of a feature that is off', function () {
    $everyFeatureOn = [
        Features::registration(),
        Features::resetPasswords(),
        Features::emailVerification(),
        Features::twoFactorAuthentication(),
        Features::passkeys(),
    ];
    // The options config/fortify.php ships with.
    $shippedOptions = [
        Features::twoFactorAuthentication() => ['confirm' => true, 'confirmPassword' => true],
        Features::passkeys() => ['confirmPassword' => true],
    ];
    $work = sys_get_temp_dir().'/fortify-features-'.Str::random(8);
    $artisan = fn (string $configCache, string ...$arguments) => Process::path(base_path())
        ->env(['APP_CONFIG_CACHE' => $configCache])
        ->run([PHP_BINARY, 'artisan', ...$arguments])
        ->throw();
    $generatedFiles = fn (string $path): array => collect(Finder::create()->files()->in($path))
        ->mapWithKeys(fn (SplFileInfo $file) => [str_replace('\\', '/', $file->getRelativePathname()) => $file->getContents()])
        ->sortKeys()
        ->all();

    try {
        File::ensureDirectoryExists($work);

        // The app's configuration, once with every feature off and once with every one on.
        $artisan("{$work}/config.php", 'config:cache');
        $configuration = require "{$work}/config.php";

        foreach (['off' => [], 'on' => $everyFeatureOn] as $features => $list) {
            $configuration['fortify']['features'] = $list;
            $configuration['fortify-options'] = $features === 'on' ? $shippedOptions : [];

            File::put("{$work}/config-{$features}.php", '<?php return '.var_export($configuration, true).';'.PHP_EOL);
            $artisan("{$work}/config-{$features}.php", 'wayfinder:generate', '--with-form', "--path={$work}/wayfinder-{$features}");
        }

        $off = $generatedFiles("{$work}/wayfinder-off");
        $on = $generatedFiles("{$work}/wayfinder-on");
        $routes = collect(json_decode($artisan("{$work}/config-off.php", 'route:list', '--json')->output(), true))->pluck('name');

        expect(array_keys($off))->toBe(array_keys($on))
            ->and($off)->toBe($on)
            ->and($routes)->toContain('login')
            ->and($routes->intersect(['register', 'password.request', 'verification.notice', 'two-factor.login', 'passkey.login-options'])->values()->all())->toBe([]);
    } finally {
        File::deleteDirectory($work);
    }
});
