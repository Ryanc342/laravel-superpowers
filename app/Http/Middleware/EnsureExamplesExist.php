<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The page-type examples exist only in local development and in the tests.
 * routes/web.php loads their routes only there; this checks again on every
 * request, so that an example is a 404 anywhere else.
 */
class EnsureExamplesExist
{
    /**
     * The environments the examples exist in.
     *
     * @var list<string>
     */
    public const array ENVIRONMENTS = ['local', 'testing'];

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(app()->environment(self::ENVIRONMENTS), 404);

        return $next($request);
    }
}
