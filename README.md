# Laravel Superpowers

A Laravel starter for building with AI coding agents. It is the official [Laravel React starter kit](https://github.com/laravel/react-starter-kit) (Laravel, Inertia, React, Tailwind, Fortify) set up to be worked on through [superpowers](https://github.com/obra/superpowers) in Claude Code and Codex:

- Project rules in `.ai/guidelines/project.md`, which [Laravel Boost](https://github.com/laravel/boost) turns into `CLAUDE.md` and `AGENTS.md`.
- `composer check` as the definition of done: Pint, PHPStan, Oxfmt + Oxlint, tsc, Vitest and Pest. `composer check:browser` adds the browser tests.
- A Stop hook that runs `composer check` for the changes a session made, and only those.
- Tests that run on MySQL in a database of their own, one test run at a time.

A project started from this template keeps its history, so it can merge later template versions in. [`UPGRADING.md`](UPGRADING.md) lists what to do after each one.

## Start a new project

You need PHP 8.4, Composer, Node (the version in `.node-version`), Git, and MySQL running on `127.0.0.1:3306` as `root` without a password, or the connection settings of your own in `.env`. Create an empty repository for the project first, without a README or a licence.

1. Clone the template with its history. The history is what lets the project merge template updates later; a copy made any other way cannot.

    ```bash
    git clone --branch main https://github.com/Ryanc342/laravel-superpowers.git <your-app>
    cd <your-app>
    ```

2. Point `origin` at the new project's repository, and keep the template as the `template` remote.

    ```bash
    git remote rename origin template
    git remote add origin <your-repo-url>
    ```

3. Create `develop` from `main`, and push both.

    ```bash
    git switch -c develop main
    git push -u origin main develop
    ```

4. Copy `.env.example` to `.env`, and set your own `APP_NAME` and a `DB_DATABASE` that no other project or checkout uses. The tests run in `<DB_DATABASE>_test` on the same server.

    ```bash
    cp .env.example .env
    perl -pi -e 's/^APP_NAME=.*/APP_NAME="<Your App>"/; s/^DB_DATABASE=.*/DB_DATABASE=<your_app>/' .env
    ```

5. Run the setup. It installs the Composer and npm packages, generates the app key, migrates (creating the database when it does not exist yet) and builds the frontend.

    ```bash
    composer setup
    ```

6. Install superpowers for Claude Code (user scope) and for Codex, and confirm both.

    ```bash
    claude plugin install superpowers@claude-plugins-official --scope user
    claude plugin list

    codex plugin add superpowers@openai-curated-remote
    codex plugin list | grep superpowers
    ```

    `claude plugin list` must show `superpowers@claude-plugins-official` as enabled, and `codex plugin list` must show `superpowers` as installed. The commands are the shell forms of what the [plugin's README](https://github.com/obra/superpowers#installation) says: `/plugin install superpowers@claude-plugins-official` in Claude Code, and for Codex open `/plugins`, search for `superpowers` and select Install Plugin (in the Codex app: Plugins in the sidebar, then `+` next to Superpowers). If `codex plugin add` does not know the `openai-curated-remote` marketplace, use that route.

7. Run the checks.

    ```bash
    composer check
    ```

    `composer check` must pass before you write any code. After a change to a page or a form, `composer check:browser` has to pass as well.

## Keep a project up to date

Template updates reach a project by merge, never any other way. The rules are in the Branches section of [`.ai/guidelines/project.md`](.ai/guidelines/project.md), which `CLAUDE.md` and `AGENTS.md` repeat. First see which template version the project is on:

```bash
git tag --merged HEAD --list 'sp-v*' --sort=-v:refname | head -1
```

Then merge the template on a branch of its own:

```bash
git switch develop
git switch -c chore/sync-template-$(date +%F)
git fetch template --tags
git merge template/main
```

Resolve the conflicts as those rules say for `composer.json`, `composer.lock` and `package-lock.json`, do what [`UPGRADING.md`](UPGRADING.md) lists for every version newer than the one you were on, run `composer check` and `composer check:browser`, and merge the branch into `develop`. Never merge the template into `main`.

Merging the official starter kit's updates into the template itself follows the same rules and is described in the same place.

## License

Open-sourced software licensed under the MIT license.
