<?php

namespace App\Http\Controllers;

use App\Http\Requests\LocaleUpdateRequest;
use Illuminate\Http\RedirectResponse;

/**
 * The language switch. It changes only the caller's own preference, so it is
 * open to guests: it always sets the `locale` cookie, saves the choice on the
 * user when signed in, and sends the caller back so the page comes back
 * translated.
 */
class LocaleController extends Controller
{
    /**
     * The minutes the `locale` cookie lasts: a year.
     */
    private const COOKIE_MINUTES = 60 * 24 * 365;

    public function update(LocaleUpdateRequest $request): RedirectResponse
    {
        $locale = $request->locale();

        $request->user()?->update(['locale' => $locale->value]);

        return back()->withCookie(cookie('locale', $locale->value, self::COOKIE_MINUTES));
    }
}
