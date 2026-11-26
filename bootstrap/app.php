<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\ExceptionResponse;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state', 'locale']);

        $middleware->web(append: [
            HandleAppearance::class,
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $rendersJson = fn (Request $request): bool => $request->is('api/*') || $request->expectsJson();

        $exceptions->shouldRenderJsonWhen($rendersJson);

        /*
         * Outside debug mode these statuses render the `error` page (Inertia v3's "Exception Handling").
         * An error can come before the middleware that shares the page's props: a stale CSRF token
         * (419) stops the request ahead of the appearance and language middleware, and maintenance mode
         * (503) ahead of the whole web group. So the theme and the language are set here and the shared
         * props are added here, whether or not the middleware ran. If the page cannot be made (the
         * database is down, say), the plain response stays.
         *
         * An expired page (419) on a submit does not replace the form: it goes back, with a flashed toast,
         * and the form keeps what was typed. The redirect is a 303, as Inertia needs after a PUT, a PATCH
         * or a DELETE. On a GET it is the error page, with its Refresh button.
         */
        Inertia::handleExceptionsUsing(function (ExceptionResponse $error) use ($rendersJson): ?Response {
            $status = $error->statusCode();

            if (app()->hasDebugModeEnabled()
                || $rendersJson($error->request)
                || ! in_array($status, [403, 404, 419, 429, 500, 503], true)) {
                return null;
            }

            try {
                foreach ([HandleAppearance::class, SetLocale::class] as $middleware) {
                    app($middleware)->handle($error->request, fn () => $error->response);
                }

                if ($status === 419 && ! $error->request->isMethodSafe()) {
                    Inertia::flash('toast', ['type' => 'error', 'message' => __('The page expired. Try again.')]);

                    return back(303);
                }

                $page = $error->render('error', ['status' => $status])
                    ->withSharedData()
                    ->toResponse($error->request);
            } catch (Throwable $secondFailure) {
                report($secondFailure);

                return null;
            }

            if ($error->response->headers->has('Retry-After')) {
                $page->headers->set('Retry-After', $error->response->headers->get('Retry-After'));
            }

            return $page;
        });
    })->create();
