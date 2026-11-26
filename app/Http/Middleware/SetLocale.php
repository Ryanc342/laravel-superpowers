<?php

namespace App\Http\Middleware;

use App\Enums\Locale;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applies the language of the request before the Inertia middleware shares
 * the page's text: the signed-in user's saved choice, then the `locale`
 * cookie, then the configured default (Locale::resolve decides).
 */
class SetLocale
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $cookie = $request->cookie('locale');

        App::setLocale(Locale::resolve(
            $request->user()?->locale,
            is_string($cookie) ? $cookie : null,
        )->value);

        return $next($request);
    }
}
