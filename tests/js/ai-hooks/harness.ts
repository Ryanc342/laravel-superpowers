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

/**
 * The environment of the git commands and of the hook: the test run's own,
 * without the variables of an outer git command, an outer agent session or
 * an outer run of the stubs, and with no global or system git config, so
 * that the user's settings cannot change what the tests see.
 */
const isolatedEnvironment = (): NodeJS.ProcessEnv => {
    const environment: NodeJS.ProcessEnv = {};

    for (const [key, value] of Object.entries(process.env)) {
        if (!/^(GIT_|CLAUDE_|STUB_)/.test(key)) {
            environment[key] = value;
        }
    }

    return {
        ...environment,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
    };
};

/** A new empty directory, removed by removeTemporaryDirectories(). */
const temporaryDirectory = (prefix: string): string => {
    const directory = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
    temporaryDirectories.push(directory);

    return directory;
};

/** Removes every directory the harness created; call it after each test. */
export const removeTemporaryDirectories = () => {
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
 * Creates a git repository with one commit (README.md, and a .gitignore that
 * ignores .worktrees/ as the project's does). The path is a physical one, so
 * it compares equal to the working directory the stubs record.
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
    writeFileSync(join(dir, '.gitignore'), '/.worktrees/\n');
    await git(dir, 'add', 'README.md', '.gitignore');
    await git(dir, 'commit', '-q', '-m', 'Start');

    return {
        dir,
        addWorktree: async (name: string) => {
            const worktree = join(dir, '.worktrees', name);
            await git(dir, 'worktree', 'add', '-q', worktree);

            return worktree;
        },
    };
};

/**
 * The start of both stubs: it appends the stub's working directory, its name
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
 * The stubs. After recording its call, the composer stub prints
 * $STUB_COMPOSER_OUTPUT, sleeps for $STUB_COMPOSER_SLEEP seconds and exits
 * with $STUB_COMPOSER_EXIT (0 when unset). The npx stub exits with 0.
 */
const stubs = {
    composer:
        recordCall +
        String.raw`
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

export type Command = { cwd: string; command: string; args: string[] };

/**
 * Runs .ai/hooks/check.sh with the given input on stdin, from projectDir and
 * with CLAUDE_PROJECT_DIR set to it, and with the composer and npx stubs
 * first on the PATH. `calls` lists each call of a stub as
 * "<cwd> <command> <arguments>"; `commands` lists the same calls with their
 * arguments kept apart.
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
}> => {
    const directory = temporaryDirectory('check-hook-stubs-');
    const callsFile = join(directory, 'calls');
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

    const commands = existsSync(callsFile)
        ? readFileSync(callsFile, 'utf8')
              .split('\n')
              .filter(Boolean)
              .map((line) => {
                  const [cwd, command, ...args] = line.split('\t');

                  return { cwd, command, args };
              })
        : [];

    return {
        code,
        stdout,
        stderr,
        calls: commands.map(({ cwd, command, args }) =>
            [cwd, command, ...args].join(' '),
        ),
        commands,
    };
};
