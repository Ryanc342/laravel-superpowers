<?php

namespace App\Http\Controllers;

/**
 * Answers a URL no route matches. The fallback route that points here sits in
 * the web group, so the 404 it raises comes from a request that went through
 * the session, the language and the Inertia middleware: the error page knows
 * the signed-in user and has every shared prop.
 */
class NotFoundController extends Controller
{
    public function __invoke(): never
    {
        abort(404);
    }
}
