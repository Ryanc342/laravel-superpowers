# Tell agents when to use the shadcn and web-design-guidelines skills — design

A small change. The owner picked approach A on 2026-11-29.

## Intent

Developers on projects started from the template state only business requirements. They never name a skill or ask for a UI review. The template installs two vendor skills, `shadcn` and `web-design-guidelines`, and they have to be used at the right moments without anyone asking.

A check on 2026-11-29 found that they are not:

- **The probe.** It ran a business-only prompt through the full superpowers flow on a copy of `develop`, plus separate implementer and reviewer runs. Out of 1 main session, 4 implementers and 3 reviewers, `shadcn` was invoked once, in a run biased by a memory note. `web-design-guidelines` was never invoked.
- **The downstream logs.** About 180 subagents in three downstream projects, on 2026-11-28, used the skills only where the plan or the dispatch prompt named them.
- **The causes:**
    - The guidance says only that the skills are installed.
    - `web-design-guidelines`' own description triggers only on requests like "review my UI".
    - superpowers' implementer and reviewer prompts never mention project skills.
    - `tailwindcss-development` and `inertia-react-development` win the match for page work.

There is evidence that a guidance line works. Agents follow the CLAUDE.md line "Read the `testing-best-practices` skill before writing tests": implementers invoked that skill in the probe and in the downstream logs. They also followed the shadcn CLI line.

The owner ruled on 2026-11-29 that using these two skills is tool usage and a generic UI rule, so it belongs in the template.

## Goals

- Every agent that writes or changes UI invokes `shadcn` first. That covers the main session working inline and every implementer subagent.
- Every agent that finishes a UI change, or reviews one, runs `web-design-guidelines` on the changed UI files.
- The rule reaches subagents without the plan or the dispatch prompt naming the skills.

## Non-goals

- No hook, and no change to `.ai/hooks/check.sh`. Approach B, below, is the fallback if the probe still misses.
- No change to the vendor skills' own files. `skills-lock.json` pins them, and their vendors maintain them.
- No project-specific UI rules, such as looks, components or page patterns.
- No Codex-only work.

## Anti-goals

- A rule that names a downstream project, or that depends on the developer typing a skill name.
- A rule that fires on non-UI TypeScript, such as a helper in `resources/js/lib`, and makes every task pay for both skills.

## Approaches

- **A. Guidance only (picked).** Add the rule to `.ai/guidelines/project.md`, which `boost:update` turns into `CLAUDE.md` and `AGENTS.md`, and every session and subagent reads. Verify by running the probe again.
    - Lowest maintenance.
    - It still depends on agents following CLAUDE.md, but the `testing-best-practices` line shows they do.
- **B. Guidance plus a reminder on edit.** A PostToolUse hook would remind the agent once when it edits UI files. It fires in subagents too.
    - A template-owned script and its tests to maintain.
    - Noise.
    - Kept as the fallback.
- **C. Guidance plus a gate at the end of the turn.** The Stop hook would block a turn that changed UI without a `web-design-guidelines` run.
    - It does not cover reviews inside subagents.
    - It risks false blocks.
    - Dropped.

## The change

1. **`.ai/guidelines/project.md`, Definition of Done.**
    - Rewrite the "owns no UI code and no UI rules" bullet: the template owns no UI code, and its only UI rules are the two that follow, for the vendor skills. The project decides the rest of its UI.
    - Add the two rules after that bullet:
        - **shadcn.** Before writing or changing UI, invoke the `shadcn` skill (in Claude Code, with the Skill tool). UI means the pages, layouts and components under `resources/js`, and `resources/css`. Reading its files is not enough, because invoking it also loads the project's shadcn configuration and installed components. Where it and `tailwindcss-development` disagree on components or styling, the `shadcn` skill wins.
        - **web-design-guidelines.** Invoke it on the changed UI files at two moments: before reporting a task that changed UI as done, and in every review of a diff that changes UI. An implementer fixes what it finds or says why a finding stays. A reviewer reports what it finds as findings.
2. **`php artisan boost:update`.** It regenerates `CLAUDE.md` and `AGENTS.md`.
3. **`UPGRADING.md`, a new `sp-v3.1.0` entry.**
    - `project.md` is a mixed file, so a project takes the template's new hunk by hand and runs `boost:update`.
    - A project that already has its own rule for these skills, in a project skill or in `.ai/rules`, removes the duplicate and keeps only facts specific to itself.
4. **`README.md`.** Say that the guidance tells agents when to use the two skills.

## Acceptance

Run the probe again on this branch, with memory off (`CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`). Every run gets its own worktree with dependencies installed and its own database. The runs are the same as on 2026-11-29:

- the main session, with superpowers' hooks on: the same business prompt, then "可以", then inline execution;
- 2 implementer runs, Sonnet and Opus, on the customer-list task;
- 2 task-reviewer runs on the flawed customer-list page.

It passes when:

- every run that writes UI invokes `shadcn` before its first UI edit;
- every implementer and every reviewer invokes `web-design-guidelines`;
- `composer check` passes on the branch.

If any run misses, report it and propose B. Do not widen the wording until the miss is understood.

## Calls made without the owner

- **The version.** `sp-v3.1.0`, because the agents' behaviour changes. It is a minor version, and nothing is released until the owner asks.
- **No new Pest test.** The change is guidance text, and the probe is the test that matters.
- **The precedence clause.** `shadcn` wins over `tailwindcss-development` on components and styling.
- **What counts as UI.** The scope "pages, layouts and components under `resources/js`, and `resources/css`" keeps pure TypeScript out.
