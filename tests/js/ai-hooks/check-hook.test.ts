// @vitest-environment node
import { existsSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { git, makeRepo, removeTemporaryDirectories, runHook } from './harness';

const sessionId = 'session-1';

const sessionStart = (dir: string, source = 'startup') =>
    runHook(
        {
            hook_event_name: 'SessionStart',
            session_id: sessionId,
            cwd: dir,
            source,
        },
        { projectDir: dir },
    );

const stop = (
    dir: string,
    options: {
        cwd?: string;
        stopHookActive?: boolean;
        env?: Record<string, string>;
    } = {},
) =>
    runHook(
        {
            hook_event_name: 'Stop',
            session_id: sessionId,
            cwd: options.cwd ?? dir,
            stop_hook_active: options.stopHookActive ?? false,
        },
        { projectDir: dir, env: options.env },
    );

const write = (path: string, contents = 'changed\n') => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
};

const composerChecks = (calls: string[]) =>
    calls.filter((call) => call.endsWith(' composer check'));

afterEach(removeTemporaryDirectories);

describe('.ai/hooks/check.sh', { timeout: 30_000 }, () => {
    it('does not check changes that were there before the session started', async () => {
        const { dir } = await makeRepo();
        write(join(dir, 'app.php'));
        const start = await sessionStart(dir);

        const { code, calls } = await stop(dir);

        expect([...start.calls, ...calls]).toEqual([]);
        expect(code).toBe(0);
    });

    it('checks a file the session changed', async () => {
        const { dir } = await makeRepo();
        await sessionStart(dir);
        write(join(dir, 'app.php'));

        const { calls } = await stop(dir);

        expect(calls).toContain(`${dir} composer check`);
    });

    it('counts a file the session put back as changed', async () => {
        const { dir } = await makeRepo();
        write(join(dir, 'app.php'), 'committed\n');
        await git(dir, 'add', 'app.php');
        await git(dir, 'commit', '-q', '-m', 'Add app.php');
        write(join(dir, 'app.php'));
        await sessionStart(dir);
        await git(dir, 'checkout', '--', 'app.php');

        const { calls } = await stop(dir);

        expect(calls).toContain(`${dir} composer check`);
    });

    it('checks a worktree the session created and moved into', async () => {
        const { dir, addWorktree } = await makeRepo();
        await sessionStart(dir);
        const worktree = await addWorktree('x');
        write(join(worktree, 'app.php'));

        const { calls } = await stop(dir, { cwd: worktree });

        expect(calls).toContain(`${dir}/.worktrees/x composer check`);
    });

    it("skips another session's new worktree", async () => {
        const { dir, addWorktree } = await makeRepo();
        await sessionStart(dir);
        const worktree = await addWorktree('x');
        write(join(worktree, 'app.php'));

        const { calls } = await stop(dir);

        expect(composerChecks(calls)).toEqual([]);
    });

    it('keeps the first baseline when a session resumes', async () => {
        const { dir } = await makeRepo();
        await sessionStart(dir);
        write(join(dir, 'app.php'));
        await sessionStart(dir, 'resume');

        const { calls } = await stop(dir);

        expect(calls).toContain(`${dir} composer check`);
    });

    it('only formats and checks Markdown when only Markdown changed', async () => {
        const { dir } = await makeRepo();
        await sessionStart(dir);
        write(join(dir, 'docs', '调研 笔记.md'), '# 调研\n');

        const { calls, commands } = await stop(dir);

        expect(commands).toContainEqual({
            cwd: dir,
            command: 'npx',
            args: ['vp', 'fmt', 'docs/调研 笔记.md'],
        });
        expect(
            calls.filter((call) => call.startsWith(`${dir} npx vp check`)),
        ).toHaveLength(1);
        expect(composerChecks(calls)).toEqual([]);
    });

    it("formats only the session's Markdown", async () => {
        const { dir } = await makeRepo();
        write(join(dir, 'other.md'), '# Other\n');
        await sessionStart(dir);
        write(join(dir, 'app.php'));
        write(join(dir, 'mine.md'), '# Mine\n');

        const { calls, commands } = await stop(dir);

        expect(
            commands.filter(
                ({ command, args }) => command === 'npx' && args[1] === 'fmt',
            ),
        ).toEqual([
            { cwd: dir, command: 'npx', args: ['vp', 'fmt', 'mine.md'] },
        ]);
        expect(calls).toContain(`${dir} composer check`);
    });

    it('falls back to checking the current worktree when the input is not JSON', async () => {
        const { dir } = await makeRepo();
        write(join(dir, 'app.php'));

        const { code, calls } = await runHook('', { projectDir: dir });

        expect(calls).toContain(`${dir} composer check`);
        expect(code).toBe(0);
    });

    it('hands a failure back to the agent once', async () => {
        const { dir } = await makeRepo();
        await sessionStart(dir);
        write(join(dir, 'app.php'));

        const { code, stderr } = await stop(dir, {
            env: { STUB_COMPOSER_EXIT: '1', STUB_COMPOSER_OUTPUT: 'boom' },
        });

        expect(code).toBe(2);
        expect(stderr).toContain('composer check failed');
        expect(stderr).toContain('boom');
    });

    it('lets the turn end after a second failure in a row', async () => {
        const { dir } = await makeRepo();
        await sessionStart(dir);
        write(join(dir, 'app.php'));

        const { code, stdout } = await stop(dir, {
            stopHookActive: true,
            env: { STUB_COMPOSER_EXIT: '1', STUB_COMPOSER_OUTPUT: 'boom' },
        });

        expect(code).toBe(0);
        expect(JSON.parse(stdout)).toHaveProperty('systemMessage');
    });

    it('does not run composer check twice for changes that already passed', async () => {
        const { dir } = await makeRepo();
        await sessionStart(dir);
        write(join(dir, 'app.php'));

        const first = await stop(dir);
        const second = await stop(dir);

        expect(composerChecks([...first.calls, ...second.calls])).toHaveLength(
            1,
        );
    });

    it('deletes baselines older than seven days', async () => {
        const { dir } = await makeRepo();
        const oldBaselines = join(dir, '.git', 'claude-check', 'old-session');
        write(join(oldBaselines, 'baseline'), '');
        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
        utimesSync(oldBaselines, eightDaysAgo, eightDaysAgo);

        await sessionStart(dir);

        expect(existsSync(oldBaselines)).toBe(false);
    });
});
