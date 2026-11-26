<?php

namespace App\Http\Controllers\Examples;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The result example: what the user sees after the step-by-step form, when
 * it worked (`success`) and when it did not (`error`), with what to do next.
 */
class ResultController extends Controller
{
    public function show(string $status): Response
    {
        return Inertia::render('examples/result', ['status' => $status]);
    }
}
