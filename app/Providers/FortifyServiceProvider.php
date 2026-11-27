<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->showWayfinderEveryFeature();
    }

    /**
     * Let `wayfinder:generate` see the routes of every optional Fortify
     * feature, also of those config/fortify.php leaves out. The template's
     * pages import those routes' functions whether the feature is on or not,
     * and hide the way in through the `features` prop, so the front end builds
     * in any project. Fortify reads the list when it loads its routes, after
     * every register(). The app itself, its requests and every other command
     * keep the project's own list: a feature that is off has no routes.
     */
    private function showWayfinderEveryFeature(): void
    {
        if (! $this->app->runningConsoleCommand('wayfinder:generate')) {
            return;
        }

        /** @var list<string> $features */
        $features = config('fortify.features', []);

        // Each optional feature, with the options config/fortify.php ships with.
        $everyFeature = [
            Features::registration() => [],
            Features::resetPasswords() => [],
            Features::emailVerification() => [],
            Features::twoFactorAuthentication() => ['confirm' => true, 'confirmPassword' => true],
            Features::passkeys() => ['confirmPassword' => true],
        ];

        foreach ($everyFeature as $feature => $options) {
            if (in_array($feature, $features, true)) {
                continue;
            }

            $features[] = $feature;

            if ($options !== []) {
                config(["fortify-options.{$feature}" => $options]);
            }
        }

        config(['fortify.features' => $features]);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('passkeys', function (Request $request) {
            return Limit::perMinute(10)->by(
                ($request->input('credential.id') ?: $request->session()->getId()).'|'.$request->ip(),
            );
        });
    }
}
