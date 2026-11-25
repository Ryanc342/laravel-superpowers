// @vitest-environment node
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vite-plus/test';

const watchdogScript = resolve(__dirname, '../../process-watchdog.sh');

const spawned: ChildProcess[] = [];
const extraPids: number[] = [];
const markers: string[] = [];

const wait = (milliseconds: number) =>
    new Promise<void>((done) => setTimeout(done, milliseconds));

const isAlive = (pid: number): boolean => {
    try {
        process.kill(pid, 0);

        return true;
    } catch {
        return false;
    }
};

const waitUntil = async (condition: () => boolean, milliseconds: number) => {
    const deadline = Date.now() + milliseconds;

    while (!condition() && Date.now() < deadline) {
        await wait(100);
    }
};

const exitCodeOf = (child: ChildProcess): Promise<number | null> =>
    new Promise((done) => {
        if (child.exitCode !== null) {
            done(child.exitCode);

            return;
        }

        child.once('exit', (code) => done(code));
    });

/**
 * Starts a stand-in for a test run: a bash with two sleeps below it, one of
 * which ignores TERM, as a worker stuck in a test might. Resolves with the
 * stand-in's pid and the pids of its two sleeps.
 */
const startFakeRun = async () => {
    const run = spawn(
        'bash',
        [
            '-c',
            'sleep 300 & echo $!; (trap "" TERM; exec sleep 300) & echo $!; wait',
        ],
        { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    spawned.push(run);

    const sleeps = await new Promise<number[]>((done) => {
        let output = '';

        run.stdout!.on('data', (chunk: Buffer) => {
            output += chunk.toString();

            const pids = output.split('\n').filter(Boolean).map(Number);

            if (pids.length === 2) {
                done(pids);
            }
        });
    });
    run.stdout!.destroy();
    extraPids.push(...sleeps);

    return { run, runPid: run.pid!, sleepPids: sleeps };
};

const startWatchdog = (runPid: number) => {
    const marker = join(tmpdir(), `watchdog-test-${process.pid}-${runPid}`);
    writeFileSync(marker, '');
    markers.push(marker);

    const watchdog = spawn('bash', [watchdogScript, String(runPid), marker], {
        stdio: 'ignore',
    });
    spawned.push(watchdog);

    return { watchdog, marker };
};

afterEach(() => {
    for (const child of spawned) {
        child.kill('SIGKILL');
    }

    for (const pid of extraPids) {
        try {
            process.kill(pid, 'SIGKILL');
        } catch {
            // Already gone, which is what the tests want.
        }
    }

    for (const marker of markers) {
        rmSync(marker, { force: true });
    }

    spawned.length = 0;
    extraPids.length = 0;
    markers.length = 0;
});

describe('process-watchdog.sh', () => {
    it('kills the descendants of a run that was killed', async () => {
        const { runPid, sleepPids } = await startFakeRun();
        const { watchdog, marker } = startWatchdog(runPid);

        await wait(1500);
        process.kill(runPid, 'SIGKILL');

        await waitUntil(() => !sleepPids.some(isAlive), 5000);

        expect(sleepPids.map(isAlive)).toEqual([false, false]);
        expect(await exitCodeOf(watchdog)).toBe(0);
        expect(existsSync(marker)).toBe(false);
    }, 20000);

    it('leaves everything alone when the run ends normally', async () => {
        const { run, runPid, sleepPids } = await startFakeRun();
        const unrelated = spawn('sleep', ['300'], { stdio: 'ignore' });
        spawned.push(unrelated);

        const { watchdog, marker } = startWatchdog(runPid);

        await wait(1500);
        rmSync(marker);
        run.kill('SIGTERM');

        const exitCode = await Promise.race([
            exitCodeOf(watchdog),
            wait(2000).then(() => 'timed out'),
        ]);

        expect(exitCode).toBe(0);

        // Give a watchdog that wrongly went on to kill something time to do it.
        await wait(3000);

        expect(isAlive(unrelated.pid!)).toBe(true);
        expect(sleepPids.map(isAlive)).toEqual([true, true]);
    }, 20000);

    it('lets go of the descriptors it inherited, so a killed run frees what it held', async () => {
        const { runPid } = await startFakeRun();
        const marker = join(tmpdir(), `watchdog-test-${process.pid}-inherited`);
        writeFileSync(marker, '');
        markers.push(marker);

        // The test keeps the read end of a pipe. It sees the end of the pipe
        // only when nothing is left that holds the write end, as the MySQL
        // connection of a test run is held while any process keeps its socket.
        const watchdog = spawn(
            'bash',
            [watchdogScript, String(runPid), marker],
            {
                stdio: ['ignore', 'ignore', 'ignore', 'pipe'],
            },
        );
        spawned.push(watchdog);

        const pipeEnded = new Promise<boolean>((done) => {
            watchdog.stdio[3]!.once('close', () => done(true));
            setTimeout(() => done(false), 1500);
        });

        expect(await pipeEnded).toBe(true);
        expect(watchdog.exitCode).toBeNull();
    });
});
