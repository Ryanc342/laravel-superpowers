<?php

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
