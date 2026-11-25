# Upgrading

What to do in a project started from laravel-superpowers after it merges a template version. There is one section per version (`sp-vX.Y.Z` tag), newest first. Do what every section newer than the version you were on lists, oldest first. [`.ai/guidelines/project.md`](.ai/guidelines/project.md) has the rules for the merge itself.

## sp-v1.3.0 (unreleased)

chisel is removed. The Stop hook now checks only what a session changed, with a SessionStart hook that records what was there before.

- If the merge stops with delete conflicts on chisel files (`chisel.php`, `chisel-paths.php`, `app/Console/Commands/InstallFeaturesCommand.php`), keep them deleted.
- Take `laravel/chisel` out of `composer.lock`, then run what `--no-scripts` skipped:

    ```bash
    composer update laravel/chisel --no-scripts
    php artisan package:discover
    php artisan boost:update
    ```

- Find the files that still hold chisel markers:

    ```bash
    grep -rlE '@(end-)?chisel-' . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=vendor
    ```

    A marker is a comment: `/* @chisel-x */` and `/* @end-chisel-x */`, written `{/* @chisel-x */}` inside JSX. chisel also accepted `<!-- @chisel-x -->` and `{{-- @chisel-x --}}`. Delete the comments and keep all the code, including everything between a start and an end marker. Delete a whole line only when the marker is all that is on it. When code shares the line, delete just the comment and the space beside it. The template had one such line pair, in `resources/js/pages/settings/security.tsx`:

    ```tsx
    } /* @chisel-passkeys */ & ManagePasskeysProps /* @end-chisel-passkeys */ /* @chisel-2fa */ &
        ManageTwoFactorProps; /* @end-chisel-2fa */
    ```

    which becomes:

    ```tsx
    } & ManagePasskeysProps &
        ManageTwoFactorProps;
    ```

- Run `npm install`.
- If `DB_DATABASE` in your `.env` is still `laravel`, give it a name no other project uses. The tests run in `<DB_DATABASE>_test`, so two projects that share a name also share a test database and break each other's runs. Then run `php artisan migrate --force`, which creates the new database.
- Install superpowers for Claude Code (user scope) and for Codex, as in step 6 of "Start a new project" in the [README](README.md#start-a-new-project).
- The new SessionStart hook in `.claude/settings.json` and `.codex/hooks.json` starts working with the next session. Until then, the Stop hook of a session that is already running has no record of what was there before, so it checks every change in the worktree it ends a turn in.
- If you added your own helpers to `tests/Pest.php`, move them into `tests/Support/*.php`, which `tests/Pest.php` loads. The next template merge then has nothing to conflict with.
