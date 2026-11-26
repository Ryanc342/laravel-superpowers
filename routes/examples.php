<?php

use App\Http\Controllers\Examples\DashboardController;
use App\Http\Controllers\Examples\ErrorPreviewController;
use App\Http\Controllers\Examples\OrderController;
use App\Http\Controllers\Examples\QueueController;
use App\Http\Controllers\Examples\ReportController;
use App\Http\Controllers\Examples\ReportExportController;
use App\Http\Controllers\Examples\ResultController;
use App\Http\Controllers\Examples\StepsFormController;
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

    Route::get('steps', [StepsFormController::class, 'create'])->name('steps.create');
    Route::post('steps', [StepsFormController::class, 'store'])->name('steps.store')
        ->middleware(HandlePrecognitiveRequests::class);

    Route::get('queue', [QueueController::class, 'index'])->name('queue.index');
    // A batch change of the tasks the user selected; the reassign dialog checks its field while the user picks.
    Route::patch('queue', [QueueController::class, 'update'])->name('queue.update')
        ->middleware(HandlePrecognitiveRequests::class);

    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard.index');

    Route::get('report', [ReportController::class, 'index'])->name('report.index');
    Route::get('report/export', ReportExportController::class)->name('report.export');

    Route::get('result/{status}', [ResultController::class, 'show'])->name('result.show')
        ->whereIn('status', ['success', 'error']);

    // The statuses the error page renders (bootstrap/app.php).
    Route::get('errors/{status}', [ErrorPreviewController::class, 'show'])->name('errors.show')
        ->whereIn('status', ['403', '404', '419', '429', '500', '503']);
});
