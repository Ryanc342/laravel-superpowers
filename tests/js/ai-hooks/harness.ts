import { execFile, spawn } from 'node:child_process';
import {
    chmodSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const hookScript = resolve(__dirname, '../../../.ai/hooks/check.sh');

const temporaryDirectories: string[] = [];

/** The files the composer stubs write the pids of their background sleeps to. */
const childPidFiles: string[] = [];

/**
 * The environment of the git commands and of the hook: the test run's own,
 * without the variables of an outer git command, an outer agent session, an
 * outer run of the hook (whose `composer check` runs these tests) or an outer
 * run of the stubs, and with no global or system git config, so that the
 * user's settings cannot change what the tests see.
 */
const isolatedEnvironment = (): NodeJS.ProcessEnv => {
    const environment: NodeJS.ProcessEnv = {};

    for (const [key, value] of Object.entries(process.env)) {
        if (
            !/^(GIT_|CLAUDE_|STUB_)/.test(key) &&
            !['CHECK_HOOK_DEADLINE', 'TEST_DATABASE_LOCK_WAIT'].includes(key)
        ) {
            environment[key] = value;
        }
    }

    return {
        ...environment,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
    };
};

/** A new empty directory, removed by cleanUp(). */
export const temporaryDirectory = (prefix: string): string => {
    const directory = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
    temporaryDirectories.push(directory);

    return directory;
};

/** The pids written, one per line, to the file at `path`, if it exists. */
const pidsIn = (path: string): number[] =>
    existsSync(path)
        ? readFileSync(path, 'utf8').split('\n').filter(Boolean).map(Number)
        : [];

/**
 * Kills every background sleep a composer stub started that is still there,
 * as it is when a hook under test did not stop it, and removes every
 * directory the harness created. Call it after each test.
 */
export const cleanUp = () => {
    for (const pid of childPidFiles.flatMap(pidsIn)) {
        try {
            process.kill(pid, 'SIGKILL');
        } catch {
            // Already gone.
        }
    }

    childPidFiles.length = 0;

    for (const directory of temporaryDirectories) {
        rmSync(directory, { force: true, recursive: true });
    }

    temporaryDirectories.length = 0;
};

/** Runs git in the given directory and resolves with what it printed. */
export const git = async (cwd: string, ...args: string[]) => {
    const { stdout } = await promisify(execFile)('git', args, {
        cwd,
        env: isolatedEnvironment(),
    });

    return stdout;
};

/**
 * The start of every stub: it appends the stub's working directory, its name
 * and its arguments, separated by tabs, as one line to $STUB_CALLS.
 */
const recordCall = String.raw`#!/usr/bin/env bash
{
    printf '%s\t%s' "$(pwd -P)" "$(basename "$0")"

    for argument in "$@"; do
        printf '\t%s' "$argument"
    done

    printf '\n'
} >> "$STUB_CALLS"
`;

/**
 * The stubs on the PATH of the hook. After recording its call, the composer
 * stub records the TEST_DATABASE_LOCK_WAIT it was given, if any, as a line
 * "env<tab>TEST_DATABASE_LOCK_WAIT<tab><value>". It then starts a background
 * sleep of $STUB_COMPOSER_CHILD_SLEEP seconds, when that is set, and appends
 * its pid to $STUB_CHILD_PIDS; prints $STUB_COMPOSER_OUTPUT; sleeps for
 * $STUB_COMPOSER_SLEEP seconds; and exits with $STUB_COMPOSER_EXIT (0 when
 * unset). The npx stub, which the hook must never call, exits with 0.
 */
const stubs = {
    composer:
        recordCall +
        String.raw`
if [ -n "$TEST_DATABASE_LOCK_WAIT" ]; then
    printf 'env\tTEST_DATABASE_LOCK_WAIT\t%s\n' "$TEST_DATABASE_LOCK_WAIT" >> "$STUB_CALLS"
fi

if [ -n "$STUB_COMPOSER_CHILD_SLEEP" ]; then
    sleep "$STUB_COMPOSER_CHILD_SLEEP" &
    printf '%s\n' "$!" >> "$STUB_CHILD_PIDS"
fi

if [ -n "$STUB_COMPOSER_OUTPUT" ]; then
    printf '%s\n' "$STUB_COMPOSER_OUTPUT"
fi

if [ -n "$STUB_COMPOSER_SLEEP" ]; then
    sleep "$STUB_COMPOSER_SLEEP"
fi

exit $((STUB_COMPOSER_EXIT))
`,
    npx: recordCall,
};

/**
 * Puts a stub for the vite-plus binary, which records its calls and exits
 * with 0, where npm would install it: node_modules/.bin/vp.
 */
const installVitePlus = (directory: string) => {
    mkdirSync(join(directory, 'node_modules', '.bin'), { recursive: true });
    writeFileSync(join(directory, 'node_modules', '.bin', 'vp'), recordCall);
    chmodSync(join(directory, 'node_modules', '.bin', 'vp'), 0o755);
};

/**
 * Creates a git repository with one commit (README.md, and a .gitignore that
 * ignores .worktrees/ and node_modules/ as the project's does) and the
 * vite-plus stub. A worktree added with addWorktree() gets the stub too. The
 * paths are physical ones, so they compare equal to the working directory
 * the stubs record.
 */
export const makeRepo = async (): Promise<{
    dir: string;
    addWorktree: (name: string) => Promise<string>;
}> => {
    const dir = temporaryDirectory('check-hook-repo-');

    await git(dir, 'init', '-q', '-b', 'main');
    await git(dir, 'config', 'user.email', 'test@example.com');
    await git(dir, 'config', 'user.name', 'Test');
    writeFileSync(join(dir, 'README.md'), '# Test\n');
    writeFileSync(join(dir, '.gitignore'), '/.worktrees/\nnode_modules/\n');
    await git(dir, 'add', 'README.md', '.gitignore');
    await git(dir, 'commit', '-q', '-m', 'Start');
    installVitePlus(dir);

    return {
        dir,
        addWorktree: async (name: string) => {
            const worktree = join(dir, '.worktrees', name);
            await git(dir, 'worktree', 'add', '-q', worktree);
            installVitePlus(worktree);

            return worktree;
        },
    };
};

export type Command = {
    cwd: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
};

/**
 * Runs .ai/hooks/check.sh with the given input on stdin, from projectDir and
 * with CLAUDE_PROJECT_DIR set to it, and with the composer and npx stubs
 * first on the PATH. `calls` lists each call of a stub as
 * "<cwd> <command> <arguments>"; `commands` lists the same calls with their
 * arguments kept apart, and with the environment variables the stub recorded
 * in `env`. `childPids` are the pids of the background sleeps the composer
 * stub started.
 */
export const runHook = async (
    input: object | string,
    opts: { projectDir: string; env?: Record<string, string> },
): Promise<{
    code: number;
    stdout: string;
    stderr: string;
    calls: string[];
    commands: Command[];
    childPids: number[];
}> => {
    const directory = temporaryDirectory('check-hook-stubs-');
    const callsFile = join(directory, 'calls');
    const childPidsFile = join(directory, 'child-pids');
    childPidFiles.push(childPidsFile);
    mkdirSync(join(directory, 'bin'));

    for (const [name, script] of Object.entries(stubs)) {
        writeFileSync(join(directory, 'bin', name), script);
        chmodSync(join(directory, 'bin', name), 0o755);
    }

    const hook = spawn('bash', [hookScript], {
        cwd: opts.projectDir,
        env: {
            ...isolatedEnvironment(),
            PATH: `${join(directory, 'bin')}:${process.env.PATH}`,
            CLAUDE_PROJECT_DIR: opts.projectDir,
            STUB_CALLS: callsFile,
            STUB_CHILD_PIDS: childPidsFile,
            ...opts.env,
        },
    });

    let stdout = '';
    let stderr = '';
    hook.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    hook.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    hook.stdin.end(typeof input === 'string' ? input : JSON.stringify(input));

    const code = await new Promise<number>((done) =>
        hook.once('close', (exitCode) => done(exitCode ?? -1)),
    );

    const commands: Command[] = [];
    const lines = existsSync(callsFile)
        ? readFileSync(callsFile, 'utf8').split('\n').filter(Boolean)
        : [];

    for (const line of lines) {
        const [first, ...rest] = line.split('\t');

        // A path is absolute, so a first field "env" is an environment
        // variable of the call recorded just before.
        if (first === 'env') {
            const [name, value] = rest;
            const call = commands[commands.length - 1];
            call.env = { ...call.env, [name]: value };
        } else {
            const [command, ...args] = rest;
            commands.push({ cwd: first, command, args });
        }
    }

    return {
        code,
        stdout,
        stderr,
        calls: commands.map(({ cwd, command, args }) =>
            [cwd, command, ...args].join(' '),
        ),
        commands,
        childPids: pidsIn(childPidsFile),
    };
};
