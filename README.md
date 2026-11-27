# Laravel Superpowers

A toolkit for building Laravel apps with AI coding agents: the official [Laravel React starter kit](https://github.com/laravel/react-starter-kit), unchanged, plus `composer check`, `composer check:browser`, tests on a MySQL database of their own with a lock, the AI workflow ([superpowers](https://github.com/obra/superpowers), [Laravel Boost](https://github.com/laravel/boost) and a Stop hook) for Claude Code and Codex, and two agent skills maintained by their vendors.

- `composer check` is the definition of done: Pint, PHPStan, Oxfmt + Oxlint, tsc, Vitest and Pest. `composer check:browser` builds the frontend and runs the browser tests, among them a page sweep that opens each page on a desktop and a phone.
- The tests run on MySQL, in `<DB_DATABASE>_test`, which they create when it is missing. A lock lets one test run use it at a time.
- The project rules are in `.ai/guidelines/project.md`, which Boost turns into `CLAUDE.md` and `AGENTS.md`. Work goes through the superpowers skills, and a Stop hook runs `composer check` for the changes a session made, and only those.
- shadcn's `shadcn` skill and Vercel's `web-design-guidelines` skill are installed for both agents.

The template owns no UI code and no UI rules. The starter kit's UI belongs to the project from the start, and the project decides its own UI.

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

4. Copy `.env.example` to `.env`, and set your own `APP_NAME` and a `DB_DATABASE` that no other project or checkout uses. The tests run in `<DB_DATABASE>_test` on the same server. Give `package.json` the project's own `"name"` too, in lowercase: it still has the template's.

    ```bash
    cp .env.example .env
    perl -pi -e 's/^APP_NAME=.*/APP_NAME="<Your App>"/; s/^DB_DATABASE=.*/DB_DATABASE=<your_app>/' .env
    npm pkg set name=<your-app>
    ```

5. Run the setup. It installs the Composer and npm packages (npm writes the new name into `package-lock.json`), generates the app key, migrates (creating the database when it does not exist yet) and builds the frontend. Then commit the new name.

    ```bash
    composer setup
    git commit -m "Name the project" package.json package-lock.json
    git push
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

Template updates reach a project by merge, never any other way, and they bring in tooling only. Upstream's UI and app changes no longer reach a project through the template: a project that wants one takes it from laravel/react-starter-kit itself.

First see which template version the project is on:

```bash
git tag --merged HEAD --list 'sp-v*' --sort=-v:refname | head -1
```

Then fetch the template's `main` and its `sp-v*` tags, and read its [`UPGRADING.md`](UPGRADING.md). Never pass `--force` when you fetch the template's tags: it would rewrite the project's own tags of the same names.

```bash
git fetch template main 'refs/tags/sp-v*:refs/tags/sp-v*'
git show template/main:UPGRADING.md
```

Do what it lists for every version newer than the one the project is on, and follow the "Template sync" steps in [`.ai/guidelines/project.md`](.ai/guidelines/project.md), which `CLAUDE.md` and `AGENTS.md` repeat. A project on sp-v1.3.0 follows the sp-v3.0.0 entry, which writes those steps out with every path filled in. If it already ran `git merge template/main` as sp-v1.3.0's rules say, it aborts that merge and starts again, as step 1 of that entry says. Never merge the template into `main`.

Merging the official starter kit's updates into the template itself is the "Upstream sync" section of the same file.

## License

Open-sourced software licensed under the MIT license.
