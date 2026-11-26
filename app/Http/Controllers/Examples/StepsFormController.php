<?php

namespace App\Http\Controllers\Examples;

use App\Http\Controllers\Controller;
use App\Http\Requests\Examples\StepsFormRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The step-by-step form example: a new supplier, in three steps. Nothing is
 * saved: the supplier is validated like a real one, then the user is shown
 * the result page a real one would show.
 */
class StepsFormController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('examples/steps');
    }

    public function store(StepsFormRequest $request): RedirectResponse
    {
        return to_route('examples.result.show', ['status' => 'success']);
    }
}
