# Vendor Skill Usage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agents invoke the `shadcn` skill before they change UI, and `web-design-guidelines` before they finish or review a UI change, even when nobody names the skills.

**Architecture:** This is guidance only. Three bullets in `.ai/guidelines/project.md`, which `php artisan boost:update` copies into `CLAUDE.md` and `AGENTS.md`, and which every session and subagent reads. README and UPGRADING notes go with them. The acceptance test is a behavioural probe: headless `claude -p` runs on throwaway worktrees of this branch.

**Tech Stack:** Laravel Boost (`boost:update`), Claude Code CLI 2.1.331 (`claude -p`, stream-json), superpowers 7.0.2 prompt templates.

**Spec:** `docs/superpowers/specs/2026-11-29-vendor-skill-usage-design.md`

## Global Constraints

- Branch `feature/vendor-skill-usage`, cut from `develop`.
- Never run `composer` or `php artisan boost:update` with `-q`.
- No hook, no change to `.ai/hooks/check.sh`, and no change to the files under `.agents/skills/`.
- No new Pest test. The probe in Task 2 is the test.
- The new version is `sp-v3.1.0`. Write no tag and no release.
- Delete `docs/superpowers/` from the branch before it merges into `develop`. Git history keeps the files.

## Review Focus

1. **Duplication on a template sync.** A project that already tells agents to use these skills gets the same rule twice. UPGRADING must say what to remove (Task 1, Step 5).
2. **Non-UI TypeScript.** A change to `resources/js/lib/*.ts` alone must not trigger either skill. The "UI here means" sentence draws that line (Task 1, Step 1).
3. **Boost drops the bullets.** If `boost:update` does not copy them, the rule never reaches anyone (Task 1, Step 3).
4. **A reviewer told not to crawl.** superpowers' task-reviewer prompt says "Do not crawl the broader codebase". The rule must win over it in practice (Task 2, the reviewer runs).
5. **A biased probe.** The spec, this plan and the memory notes all name the skills. Probe worktrees drop `docs/superpowers/`, and memory is off (Task 2, Steps 1 and 3).

---

### Task 1: The guidance, README and upgrade note

**Files:**

- Modify: `.ai/guidelines/project.md:9` (the "owns no UI code and no UI rules" bullet). Add two bullets after it.
- Regenerate: `CLAUDE.md`, `AGENTS.md`
- Modify: `README.md:8` and `README.md:13`
- Modify: `UPGRADING.md`. Add a `## sp-v3.1.0` section above `## sp-v3.0.1`.

**Interfaces:**

- Produces: the three bullet texts below. Task 2's probes run against them, and UPGRADING names them by their opening words.

- [ ] **Step 1: Replace `.ai/guidelines/project.md:9` with these three bullets, verbatim**

```markdown
- The template owns no UI code. Its only UI rules are the two that follow, for the `shadcn` and `web-design-guidelines` skills it installs, which their vendors maintain and `skills-lock.json` records. The starter kit's UI it ships belongs to the project from the start, and the project decides the rest of its UI.
- UI here means the pages, layouts and components under `resources/js`, and `resources/css`. Before writing or changing UI, invoke the `shadcn` skill (in Claude Code, with the Skill tool). Reading its files is not enough: invoking it also loads the project's shadcn configuration and the components it has. Where it and `tailwindcss-development` disagree on components or styling, follow the `shadcn` skill.
- Invoke the `web-design-guidelines` skill on the changed UI files before you report a task that changed UI as done, and in every review of a diff that changes UI. An implementer fixes what it finds or says why a finding stays. A reviewer reports what it finds as findings.
```

- [ ] **Step 2: Run `php artisan boost:update`**

Then run `git status --short`.

Expected: only `.ai/guidelines/project.md`, `CLAUDE.md` and `AGENTS.md` are modified. Any other rewritten file is a template file: restore it and find out why.

- [ ] **Step 3: Check that the bullets reached both generated files**

Run: `grep -c -E 'invoke the `shadcn`skill|Invoke the`web-design-guidelines` skill' CLAUDE.md AGENTS.md`

Expected: `CLAUDE.md:2` and `AGENTS.md:2`.

- [ ] **Step 4: Update `README.md`**

- Line 8 becomes: "- shadcn's `shadcn` skill and Vercel's `web-design-guidelines` skill are installed for both agents. The project rules say when agents use them: `shadcn` before any UI change, and `web-design-guidelines` before a UI change is done and in every review of one."
- Line 13 becomes: "The template owns no UI code, and its only UI rules are when to use those two skills. The starter kit's UI belongs to the project from the start, and the project decides the rest of its UI."

- [ ] **Step 5: Add the `## sp-v3.1.0` section to `UPGRADING.md`**

It goes above `## sp-v3.0.1` and says, in the file's voice:

- **What changed.** The project rules now tell agents when to use the two vendor skills: `shadcn` before writing or changing UI, and `web-design-guidelines` before a task that changed UI is reported done and in every review of a diff that changes UI. Until now, agents used them only when a plan or a prompt named them.
- **Taking the bullets.** `.ai/guidelines/project.md` is mixed. Take the three "Definition of Done" bullets that begin "The template owns no UI code", "UI here means" and "Invoke the `web-design-guidelines` skill" by hand, as step 4 of the template sync says. Then run `php artisan boost:update`.
- **Removing duplicates.** If the project already tells agents to use these skills, in `.ai/guidelines/project.md`, a skill of its own or `.ai/rules`, remove what the new bullets now say. Keep only what is the project's own, such as its preset or how its components are wired.
- **Who does what.** A project on sp-v3.0.1 runs the template sync, then does the two steps above.

- [ ] **Step 6: Run `composer check`**

Expected: it passes. If Oxfmt reformats the Markdown, run `composer fix`, then run `composer check` again.

- [ ] **Step 7: Commit**

```bash
git add .ai/guidelines/project.md CLAUDE.md AGENTS.md README.md UPGRADING.md
git commit -m "Tell agents when to use the shadcn and web-design-guidelines skills"
```

---

### Task 2: Acceptance probe

The fixtures and scripts from the 2026-11-29 check are in the scratchpad. Call it `$S`, which is `/private/tmp/claude-501/-Users-ryan-Projects-laravel-superpowers/9a7a6015-518f-4176-a958-d84eb59ceb4c/scratchpad`:

- `$S/fixtures/0001-*.patch`: Task 1 of the customer feature, a finished backend.
- `$S/fixtures/0002-*.patch`: a flawed customer-list page.
- `$S/fixtures/task-2-brief.md` and `$S/fixtures/task-2-report.md`.
- `$S/fixtures/prompt-impl.template.txt` and `$S/fixtures/prompt-review.template.txt`: superpowers 7.0.2 prompts, filled in for `probe-impl-1` and `probe-review-1`, with the SHAs `45e7d0b` and `397eba3`.
- `$S/run-probe2.sh`, `$S/resume-main.sh` and `$S/summarize.py`.

**Files:** none in the repository. Everything happens in `.worktrees/probe-*`, and those are removed at the end.

**Interfaces:**

- Consumes: Task 1's commit on `feature/vendor-skill-usage`.

- [ ] **Step 1: Build five probe worktrees from the branch's HEAD**

The names are `main`, `impl-s`, `impl-o`, `review-s` and `review-o`. In each:

- `git worktree add --detach .worktrees/probe-<name> feature/vendor-skill-usage`.
- `git rm -r -q docs/superpowers && git commit -q -m "Hide the design docs"`.

Then add the fixtures:

- `impl-*`: `git am` patch 0001. Copy the brief to `.superpowers/sdd/customers/task-2-brief.md`.
- `review-*`: `git am` both patches. Copy the brief and the report. Write `.superpowers/sdd/customers/task-2-diff.txt` with the commit list, `--stat` and `-U10` diff of the second patch's commit against the first.

`main`, `impl-s` and `impl-o` get a full setup:

- copy `.env` with `DB_DATABASE=laravel_superpowers_probe_<name>`, using `_` for `-`;
- `composer install`, `npm install`, `php artisan migrate --force`, `npm run build`.

Expected: all five are listed by `git worktree list`, and the three set-up ones each have `vendor/bin/pest` and `public/build/manifest.json`.

- [ ] **Step 2: Write the prompts**

- `$S/prompt-impl-s.txt` and `$S/prompt-impl-o.txt`: the impl template with `probe-impl-1` replaced by the worktree's name.
- `$S/prompt-review-s.txt` and `$S/prompt-review-o.txt`: the review template with `probe-review-1`, `45e7d0b` and `397eba3` replaced by the worktree's name and the two new SHAs.

Expected: `grep -c` finds no old name or SHA in any of the four.

- [ ] **Step 3: Run the subagent-style probes**

- Add `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` to `resume-main.sh`'s `claude` line. `run-probe2.sh` already sets it.
- Run these four in the background, in parallel:
    - `PERM=auto run-probe2.sh impl-s sonnet 4 off …`
    - `PERM=auto run-probe2.sh impl-o opus 4 off …`
    - `run-probe2.sh review-s sonnet 2 off …`
    - `run-probe2.sh review-o opus 2 off …`

Hooks are off, as a subagent has no SessionStart injection, and memory is off.

- [ ] **Step 4: Run the main-session probe**

Hooks stay on, and memory is off.

1. `run-probe2.sh main default 5 on $S/prompt-main.txt`.
2. Write the result's `session_id` to `$S/main-session-id.txt`.
3. `resume-main.sh "可以" 6 t2`.
4. If it asks how to execute, run `PERM=auto resume-main.sh "用第二种，你直接做。这个目录的依赖和 .env 已经配好了。" 8 t3`. If it offers subagent-driven execution and recommends it, answer with that choice instead.

- [ ] **Step 5: Judge the runs with `python3 -I $S/summarize.py $S/out-<name>.jsonl`**

For the main session, also list the `Skill` calls in its subagents' transcripts, under `~/.claude/projects/-Users-ryan-Projects-laravel-superpowers--worktrees-probe-main/<session>/subagents/`.

It passes when all of these hold:

- `impl-s`, `impl-o`, and `main` if it writes UI itself, each show `Skill: skill=shadcn` before their first Edit or Write under `resources/js/pages`, `resources/js/components`, `resources/js/layouts` or `resources/css`.
- `impl-s`, `impl-o`, and `main` or its implementer subagents, each show `Skill: skill=web-design-guidelines` before their final report.
- `review-s`, `review-o`, and every reviewer subagent of `main`, each show `Skill: skill=web-design-guidelines`.

A run that ends BLOCKED before its first UI edit proves nothing. Rerun it once.

- [ ] **Step 6: Clean up and report**

- `git worktree remove --force` each probe worktree.
- Drop each `laravel_superpowers_probe_*` database and its `_test` twin.
- Delete any branch the main probe created.
- Report the table of runs, the passes, the misses and the cost to the owner.
- If any run missed, propose approach B from the spec, and widen no wording.
