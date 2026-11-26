<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureTranslations();
        $this->configureRateLimiting();
    }

    /**
     * Limit the password form to six sends a minute. The checks that run while
     * the user types (Precognition) count apart, so that typing a password
     * never uses up the sends. A check does not tell whether the current
     * password is right (PasswordUpdateRequest), so its limit is far higher.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('password-update', function (Request $request): Limit {
            $userKey = (string) $request->user()?->getAuthIdentifier();

            return $request->isAttemptingPrecognition()
                ? Limit::perMinute(120)->by('precognition|'.$userKey)
                : Limit::perMinute(6)->by($userKey);
        });
    }

    /**
     * Read the template's own sentences from lang/template. The project's
     * lang/zh_CN.json is read after them, so on the same key it wins.
     */
    protected function configureTranslations(): void
    {
        Lang::addJsonPath(lang_path('template'));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
