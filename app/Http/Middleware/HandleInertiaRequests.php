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
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            // The rows-per-page choices under every paginated list (components/shared/pagination.tsx).
            'perPageOptions' => [10, 20, 50, 100],
        ];
    }
}
