<?php

/*
 * The agent guidance holds for any project, whatever its UI. These tests
 * check only that the skills the tooling records are really installed for
 * Claude Code (.claude/skills) and Codex (.agents/skills): the ones
 * `php artisan boost:update` lists in boost.json, and the vendor skills the
 * skills CLI lists in skills-lock.json.
 */

test('every skill boost.json lists is generated for both agents', function (string $agentDirectory) {
    $root = dirname(__DIR__, 2);
    $skills = json_decode((string) file_get_contents("$root/boost.json"), true)['skills'] ?? [];

    foreach ($skills as $skill) {
        expect("$root/$agentDirectory/$skill/SKILL.md")->toBeFile();
    }
})->with(['.claude/skills', '.agents/skills']);

test('every skill in skills-lock.json is installed for both agents', function (string $agentDirectory) {
    $root = dirname(__DIR__, 2);

    expect("$root/skills-lock.json")->toBeFile();

    $skills = array_keys(json_decode((string) file_get_contents("$root/skills-lock.json"), true)['skills'] ?? []);

    expect($skills)->not->toBeEmpty();

    foreach ($skills as $skill) {
        expect("$root/$agentDirectory/$skill/SKILL.md")->toBeFile();
    }
})->with(['.claude/skills', '.agents/skills']);
