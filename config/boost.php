<?php

declare(strict_types=1);

/*
 * Only the options this kit changes. Boost merges its own defaults
 * (vendor/laravel/boost/config/boost.php) in for everything else.
 */
return [

    /*
    |--------------------------------------------------------------------------
    | Test Enforcement Guideline
    |--------------------------------------------------------------------------
    |
    | Always include Boost's "Test Enforcement" rules in CLAUDE.md and
    | AGENTS.md. Without this, Boost decides by listing the tests, which
    | prints nothing under `-q` and silently drops the rules.
    |
    */

    'enforce_tests' => true,

];
