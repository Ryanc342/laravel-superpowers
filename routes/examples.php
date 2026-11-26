<?php

use App\Http\Controllers\Examples\OrderController;
use Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

/*
|--------------------------------------------------------------------------
| Page-Type Examples
|--------------------------------------------------------------------------
|
| A working page for each common back-office page type, over made-up data.
| routes/web.php loads this file only in the local and testing environments,
| and every request checks the environment again, before it is signed in:
| outside them, an example does not exist.
|
*/

// A group's attributes, since `Route::middleware()` takes only middleware names.
Route::group([
    'middleware' => [
        function (Request $request, Closure $next): Response {
            abort_unless(app()->environment(['local', 'testing']), 404);

            return $next($request);
        },
        'auth',
    ],
    'prefix' => 'examples',
    'as' => 'examples.',
], function () {
    Route::resource('orders', OrderController::class)
        // A number of up to 9 digits, so that a longer one is a 404 and not too big for an int.
        ->where(['order' => '[0-9]{1,9}'])
        ->middlewareFor(['store', 'update'], HandlePrecognitiveRequests::class);
});
