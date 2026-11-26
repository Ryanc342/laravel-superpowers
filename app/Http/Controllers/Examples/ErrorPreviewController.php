<?php

namespace App\Http\Controllers\Examples;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A preview of the error page for one of the statuses it renders. In local
 * development debug mode is on, so a real error shows Laravel's own page:
 * this shows the one users get. The preview itself answers 200.
 */
class ErrorPreviewController extends Controller
{
    public function show(int $status): Response
    {
        return Inertia::render('error', ['status' => $status]);
    }
}
