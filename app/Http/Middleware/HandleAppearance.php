<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class HandleAppearance
{
    /** The themes the appearance cookie may name; anything else is the system's. */
    private const array APPEARANCES = ['light', 'dark', 'system'];

    /**
     * Share the theme the page starts in. The cookie is the browser's, so a
     * value that is not a theme is ignored rather than written into the page.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $appearance = $request->cookie('appearance');

        View::share('appearance', in_array($appearance, self::APPEARANCES, true) ? $appearance : 'system');

        return $next($request);
    }
}
