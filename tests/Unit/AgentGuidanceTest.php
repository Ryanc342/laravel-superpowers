<?php

/*
 * The skills `php artisan boost:update` generates for Claude Code
 * (.claude/skills) and Codex (.agents/skills) from .ai/skills and the
 * installed packages. The UI is built with Ant Design, so no agent may be
 * steered to the old shadcn components or to Tailwind for app pages.
 */

/**
 * Whether a skill is there for an agent, as a directory or as a link to one,
 * a dangling link included: boost:update links .ai/skills into place, and a
 * link left behind still shows the agent a skill by that name.
 */
function agentSkillExists(string $path): bool
{
    $path = dirname(__DIR__, 2).'/'.$path;

    return is_link($path) || file_exists($path);
}

test('the old components skill is gone', function (string $path) {
    expect(agentSkillExists($path))->toBeFalse();
})->with([
    '.ai/skills/frontend-components',
    '.claude/skills/frontend-components',
    '.agents/skills/frontend-components',
]);

test('the ant design skill is generated for both agents', function (string $path) {
    expect(dirname(__DIR__, 2).'/'.$path)->toBeFile();
})->with([
    '.claude/skills/ant-design-ui/SKILL.md',
    '.agents/skills/ant-design-ui/SKILL.md',
]);

test('no agent guidance suggests tailwind for app pages', function (string $path) {
    expect(agentSkillExists($path))->toBeFalse();
})->with([
    '.claude/skills/tailwindcss-development',
    '.agents/skills/tailwindcss-development',
]);
