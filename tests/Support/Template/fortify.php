<?php

use Laravel\Fortify\Features;

/*
 * The template's own Fortify test helpers. tests/Pest.php loads this file
 * after the project's tests/Support/*.php, and each helper is declared only
 * when no function of its name exists yet: a project's own one replaces it.
 */

if (! function_exists('turnFortifyFeatureOff')) {
    /**
     * Turn a Fortify feature off the way a project does: leave it out of the
     * `features` list in config/fortify.php.
     */
    function turnFortifyFeatureOff(string $feature): void
    {
        config(['fortify.features' => array_values(array_diff(config('fortify.features'), [$feature]))]);
    }
}

if (! function_exists('fortifyFeatureFlags')) {
    /**
     * Which of Fortify's optional features config/fortify.php has on, by the
     * name the `features` shared prop gives each.
     *
     * @return array{registration: bool, resetPasswords: bool, emailVerification: bool, twoFactorAuthentication: bool, passkeys: bool}
     */
    function fortifyFeatureFlags(): array
    {
        return [
            'registration' => Features::enabled(Features::registration()),
            'resetPasswords' => Features::enabled(Features::resetPasswords()),
            'emailVerification' => Features::enabled(Features::emailVerification()),
            'twoFactorAuthentication' => Features::enabled(Features::twoFactorAuthentication()),
            'passkeys' => Features::enabled(Features::passkeys()),
        ];
    }
}

if (! function_exists('fortifyFeatureOfPage')) {
    /**
     * The Fortify feature a template page belongs to, by its path, or null
     * for a page that is there whatever the project turned off. With its
     * feature off, Fortify has no route for the page.
     */
    function fortifyFeatureOfPage(string $path): ?string
    {
        $path = (string) parse_url($path, PHP_URL_PATH);

        return match (true) {
            $path === '/register' => Features::registration(),
            $path === '/forgot-password', str_starts_with($path, '/reset-password/') => Features::resetPasswords(),
            $path === '/email/verify', str_starts_with($path, '/email/verify/') => Features::emailVerification(),
            $path === '/two-factor-challenge' => Features::twoFactorAuthentication(),
            default => null,
        };
    }
}
