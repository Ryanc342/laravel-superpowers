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

    /*
    |--------------------------------------------------------------------------
    | Excluded Skills
    |--------------------------------------------------------------------------
    |
    | Boost generates a skill for each package it finds, and boost.json only
    | records what it generated. App pages are built with Ant Design, and
    | Tailwind is for marketing pages only, so Boost's Tailwind skill, which
    | would steer agents to Tailwind for every page, is never generated. The
    | ant-design-ui skill in .ai/skills says where Tailwind belongs.
    |
    */

    'skills' => [
        'exclude' => ['tailwindcss-development'],
    ],

];
