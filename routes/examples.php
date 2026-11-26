<?php

use App\Http\Controllers\Examples\OrderController;
use App\Http\Middleware\EnsureExamplesExist;
use Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Page-Type Examples
|--------------------------------------------------------------------------
|
| A working page for each common back-office page type, over made-up data.
| routes/web.php loads this file only in the local and testing environments,
| and every request checks the environment again (EnsureExamplesExist),
| before it is signed in: outside them, an example does not exist.
|
*/

Route::middleware([EnsureExamplesExist::class, 'auth'])->prefix('examples')->name('examples.')->group(function () {
    Route::resource('orders', OrderController::class)
        // A number of up to 9 digits, so that a longer one is a 404 and not too big for an int.
        ->where(['order' => '[0-9]{1,9}'])
        ->middlewareFor(['store', 'update'], HandlePrecognitiveRequests::class);
});
