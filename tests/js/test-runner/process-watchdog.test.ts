// @vitest-environment node
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import {
    chmodSync,
    existsSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vite-plus/test';

const watchdogScript = resolve(__dirname, '../../process-watchdog.sh');

const spawned: ChildProcess[] = [];
const extraPids: number[] = [];
const markers: string[] = [];
const groups: number[] = [];

/**
 * Whether a number can safely be signalled as one process or one group: 0 and
 * negative numbers would reach the group of these tests or every process of
 * the user, and 1 is init.
 */
const isProcessId = (pid: number): boolean => Number.isInteger(pid) && pid > 1;

const wait = (milliseconds: number) =>
    new Promise<void>((done) => setTimeout(done, milliseconds));

const isAlive = (pid: number): boolean => {
    if (!isProcessId(pid)) {
        throw new Error(`Not a process id: ${pid}`);
    }

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
 * stand-in's pid and the pids of its two sleeps. The stand-in gets a process
 * group of its own, so the watchdog never looks into the group these tests
 * run in.
 */
const startFakeRun = async () => {
    const run = spawn(
        'bash',
        [
            '-c',
            'sleep 300 & echo $!; (trap "" TERM; exec sleep 300) & echo $!; wait',
        ],
        { detached: true, stdio: ['ignore', 'pipe', 'ignore'] },
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

/**
 * Starts the watchdog with a `ps` in front of the real one that, on its second
 * call of the given kind, first ends the run (and removes the marker when
 * asked) and only then answers. That puts the end of the run at an exact place
 * in the watchdog's loop, between two of its steps, with no timing involved:
 * 'list' is the call that lists all processes to find the run's descendants
 * (not the one that lists process groups), 'state' the one that asks whether
 * the run is still there.
 */
const startWatchdogThatSeesTheRunEndAt = (
    call: 'list' | 'state',
    runPid: number,
    options: { removeMarker: boolean },
) => {
    const marker = join(tmpdir(), `watchdog-test-${process.pid}-${runPid}`);
    writeFileSync(marker, '');
    markers.push(marker);

    const shimDirectory = mkdtempSync(join(tmpdir(), 'watchdog-test-ps-'));
    markers.push(shimDirectory);

    writeFileSync(
        join(shimDirectory, 'ps'),
        `#!/usr/bin/env bash
kind=other
for argument in "$@"; do
    case $argument in
        -A) kind=list ;;
        stat=) kind=state ;;
    esac
done
for argument in "$@"; do
    case $argument in
        pgid=) kind=other ;;
    esac
done

if [ "$kind" = "$SHIM_CALL" ]; then
    count=$(( $(cat "$SHIM_DIRECTORY/count" 2>/dev/null || echo 0) + 1 ))
    echo "$count" > "$SHIM_DIRECTORY/count"

    if [ "$count" -eq 2 ]; then
        if [ -n "$SHIM_REMOVE_MARKER" ]; then
            rm -f -- "$SHIM_MARKER"
        fi

        kill -KILL "$SHIM_RUN_PID"

        until state=$("$SHIM_REAL_PS" -o stat= -p "$SHIM_RUN_PID"); [ -z "$state" ] || [ "\${state#Z}" != "$state" ]; do
            sleep 0.05
        done
    fi
fi

exec "$SHIM_REAL_PS" "$@"
`,
    );
    chmodSync(join(shimDirectory, 'ps'), 0o755);

    const watchdog = spawn('bash', [watchdogScript, String(runPid), marker], {
        stdio: 'ignore',
        env: {
            ...process.env,
            PATH: `${shimDirectory}:${process.env.PATH}`,
            SHIM_CALL: call,
            SHIM_DIRECTORY: shimDirectory,
            SHIM_MARKER: marker,
            SHIM_REMOVE_MARKER: options.removeMarker ? '1' : '',
            SHIM_REAL_PS: execFileSync('sh', ['-c', 'command -v ps'])
                .toString()
                .trim(),
            SHIM_RUN_PID: String(runPid),
        },
    });
    spawned.push(watchdog);

    return { watchdog, marker };
};

type LeftBehindRun = {
    marker: string;
    pids: Record<
        | 'caller'
        | 'bystander'
        | 'run'
        | 'early'
        | 'watchdog'
        | 'late'
        | 'lateChild',
        number
    > & { resident?: number; worker?: number };
};

/**
 * Starts a test run below a caller, in one of two shapes:
 *
 * - 'left-behind': the caller and the run share a process group of their own,
 *   and the caller's own parent has gone, as with `nohup composer check &`
 *   from a terminal that was closed since. Before the run the caller leaves a
 *   sleep running with no parent but init (`resident`), as
 *   `mysql.server start && composer check` leaves MySQL's supervisor in the
 *   command's group. Next to the run the caller started a shell that looks
 *   after a sleep (`bystander`) and starts another one (`worker`) while the
 *   run is going, as `php artisan serve &` looks after its server and starts
 *   new workers.
 * - 'pipeline': the caller is a shell with job control that runs
 *   `run | bystander`, as a terminal runs `composer check | tee`. The pipeline
 *   gets a group of its own, and the bystander's parent, the caller, is
 *   outside it.
 *
 * The run starts a sleep (`early`), then the watchdog the way
 * tests/bootstrap.php does, so the watchdog sits in the run's group with no
 * parent of its own either.
 *
 * A `ps` in front of the real one makes the watchdog miss a process: on the
 * watchdog's listing of the run's descendants number `endAt`, it has the run
 * start a shell with a sleep below it (`late` and `lateChild`, as dash's
 * `sh -c` starts the Playwright server on Linux), kills the run straight
 * after, and only then answers. The watchdog last noted the run's processes
 * before `late` existed, the way a Playwright server started just before
 * `kill -9` goes unseen. With `endAt` 1 it never noted anything, not even
 * `early`.
 */
const startRunBelowACaller = async (
    shape: 'left-behind' | 'pipeline',
    endAt: 1 | 2 = 2,
): Promise<LeftBehindRun> => {
    const fixture = mkdtempSync(join(tmpdir(), 'watchdog-test-left-behind-'));
    markers.push(fixture);

    const marker = join(fixture, 'marker');
    const pidsFile = join(fixture, 'pids');
    writeFileSync(marker, '');
    writeFileSync(pidsFile, '');

    writeFileSync(
        join(fixture, 'caller.sh'),
        shape === 'left-behind'
            ? `echo "caller $$" >> "$FIXTURE/pids"
( sleep 300 & echo "resident $!" >> "$FIXTURE/pids" )
bash "$FIXTURE/bystander.sh" &
bash "$FIXTURE/run.sh"
wait
`
            : `echo "caller $$" >> "$FIXTURE/pids"
set -m
bash "$FIXTURE/run.sh" | sh -c 'echo "bystander $$" >> "$FIXTURE/pids"; exec sleep 300'
`,
    );

    writeFileSync(
        join(fixture, 'bystander.sh'),
        `echo "bystanderShell $$" >> "$FIXTURE/pids"
startWorker() {
    sleep 300 &
    echo "worker $!" >> "$FIXTURE/pids"
}
trap startWorker USR2
sleep 300 &
echo "bystander $!" >> "$FIXTURE/pids"
while :; do wait; done
`,
    );

    writeFileSync(
        join(fixture, 'run.sh'),
        `echo "run $$" >> "$FIXTURE/pids"
startLate() {
    sh -c 'sleep 300 & echo "lateChild $!" >> "$FIXTURE/pids"; wait' &
    echo "late $!" >> "$FIXTURE/pids"
}
trap startLate USR1
sleep 300 &
echo "early $!" >> "$FIXTURE/pids"
( bash "$WATCHDOG" $$ "$FIXTURE/marker" < /dev/null > /dev/null 2>&1 & echo "watchdog $!" >> "$FIXTURE/pids" )
while :; do sleep 0.05; done
`,
    );

    writeFileSync(
        join(fixture, 'ps'),
        `#!/usr/bin/env bash
descendants=
for argument in "$@"; do
    case $argument in
        -A) descendants=1 ;;
    esac
done
for argument in "$@"; do
    case $argument in
        pgid=) descendants= ;;
    esac
done

if [ -n "$descendants" ]; then
    count=$(( $(cat "$FIXTURE/count" 2>/dev/null || echo 0) + 1 ))
    echo "$count" > "$FIXTURE/count"

    if [ "$count" -eq "$END_AT" ]; then
        bystanderShell=$(awk '$1 == "bystanderShell" { print $2 }' "$FIXTURE/pids")

        if [ -n "$bystanderShell" ]; then
            kill -USR2 "$bystanderShell"

            until grep -q '^worker ' "$FIXTURE/pids"; do
                sleep 0.05
            done
        fi

        run=$(awk '$1 == "run" { print $2 }' "$FIXTURE/pids")
        kill -USR1 "$run"

        until grep -q '^late ' "$FIXTURE/pids" && grep -q '^lateChild ' "$FIXTURE/pids"; do
            sleep 0.05
        done

        kill -KILL "$run"

        until state=$("$REAL_PS" -o stat= -p "$run"); [ -z "$state" ] || [ "\${state#Z}" != "$state" ]; do
            sleep 0.05
        done
    fi
fi

exec "$REAL_PS" "$@"
`,
    );
    chmodSync(join(fixture, 'ps'), 0o755);

    // For 'left-behind' the outer bash leads the new group and exits as soon
    // as it has started the caller, which is then left with no parent but
    // init (or a subreaper on Linux).
    const command =
        shape === 'left-behind'
            ? 'bash "$FIXTURE/caller.sh" &'
            : 'exec bash "$FIXTURE/caller.sh"';

    const leader = spawn('bash', ['-c', command], {
        detached: true,
        stdio: 'ignore',
        env: {
            ...process.env,
            PATH: `${fixture}:${process.env.PATH}`,
            END_AT: String(endAt),
            FIXTURE: fixture,
            REAL_PS: execFileSync('sh', ['-c', 'command -v ps'])
                .toString()
                .trim(),
            WATCHDOG: watchdogScript,
        },
    });
    groups.push(leader.pid!);

    const pidsOf = (): Partial<LeftBehindRun['pids']> =>
        Object.fromEntries(
            readFileSync(pidsFile, 'utf8')
                .split('\n')
                .filter(Boolean)
                .map((line) => {
                    const [name, pid] = line.split(' ');

                    return [name, Number(pid)];
                })
                .filter(([, pid]) => isProcessId(pid as number)),
        );

    const expected = shape === 'left-behind' ? 10 : 7;

    await waitUntil(() => Object.keys(pidsOf()).length === expected, 5000);

    const pids = pidsOf() as LeftBehindRun['pids'];

    if (Object.keys(pids).length !== expected) {
        throw new Error(
            `The fixture wrote only ${JSON.stringify(pids)} in ${pidsFile}`,
        );
    }
    extraPids.push(...Object.values(pids));

    if (shape === 'pipeline') {
        // The pipeline's group is led by its first process, the run.
        groups.push(pids.run);
    }

    return { marker, pids };
};

/**
 * Leaves a sleep behind in a process group of its own: its parent is gone, as
 * with what another command or session left running.
 */
const startOrphanInAnotherGroup = async (): Promise<number> => {
    const leader = spawn('bash', ['-c', 'sleep 300 & echo $!'], {
        detached: true,
        stdio: ['ignore', 'pipe', 'ignore'],
    });
    groups.push(leader.pid!);

    const pid = await new Promise<number>((done) => {
        leader.stdout!.once('data', (chunk: Buffer) =>
            done(Number(chunk.toString().trim())),
        );
    });
    leader.stdout!.destroy();
    extraPids.push(pid);

    return pid;
};

afterEach(() => {
    for (const group of groups.filter(isProcessId)) {
        try {
            process.kill(-group, 'SIGKILL');
        } catch {
            // Nothing left in it.
        }
    }

    for (const child of spawned) {
        child.kill('SIGKILL');
    }

    for (const pid of extraPids.filter(isProcessId)) {
        try {
            process.kill(pid, 'SIGKILL');
        } catch {
            // Already gone, which is what the tests want.
        }
    }

    for (const path of markers) {
        rmSync(path, { force: true, recursive: true });
    }

    spawned.length = 0;
    extraPids.length = 0;
    markers.length = 0;
    groups.length = 0;
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

    it('still ends what it noted when the run is gone before it can list the descendants again', async () => {
        const { runPid, sleepPids } = await startFakeRun();
        const { watchdog } = startWatchdogThatSeesTheRunEndAt('list', runPid, {
            removeMarker: false,
        });

        await waitUntil(() => !sleepPids.some(isAlive), 6000);

        expect(sleepPids.map(isAlive)).toEqual([false, false]);
        expect(await exitCodeOf(watchdog)).toBe(0);
    }, 20000);

    it('ends nothing when the run removes its marker and exits between two checks of the watchdog', async () => {
        const { runPid, sleepPids } = await startFakeRun();
        const { watchdog } = startWatchdogThatSeesTheRunEndAt('state', runPid, {
            removeMarker: true,
        });

        expect(await exitCodeOf(watchdog)).toBe(0);

        await wait(3000);

        expect(sleepPids.map(isAlive)).toEqual([true, true]);
    }, 20000);

    it('ends what the run started too shortly before it was killed to be noted, and what that started', async () => {
        const { marker, pids } = await startRunBelowACaller('left-behind');

        await waitUntil(() => !isAlive(pids.watchdog), 6000);

        expect([pids.late, pids.lateChild].map(isAlive)).toEqual([
            false,
            false,
        ]);

        // The watchdog removes the marker last, so it did not end itself on the way.
        expect(isAlive(pids.watchdog)).toBe(false);
        expect(existsSync(marker)).toBe(false);
    }, 20000);

    it('ends what the run had started before the watchdog first looked, when the run is gone by then', async () => {
        const { pids } = await startRunBelowACaller('left-behind', 1);

        await waitUntil(() => !isAlive(pids.watchdog), 6000);

        expect(isAlive(pids.watchdog)).toBe(false);
        expect([pids.early, pids.late, pids.lateChild].map(isAlive)).toEqual([
            false,
            false,
            false,
        ]);
    }, 20000);

    it('spares the callers of the run, what they look after or start meanwhile, what was already left running in its group, and what other process groups left behind', async () => {
        const otherOrphan = await startOrphanInAnotherGroup();
        const { pids } = await startRunBelowACaller('left-behind');

        await waitUntil(() => !isAlive(pids.watchdog), 6000);

        expect(isAlive(pids.watchdog)).toBe(false);
        expect(
            [
                pids.caller,
                pids.bystander,
                pids.worker!,
                pids.resident!,
                otherOrphan,
            ].map(isAlive),
        ).toEqual([true, true, true, true, true]);
    }, 20000);

    it('spares the rest of a pipeline, which the shell outside its group still looks after', async () => {
        const { pids } = await startRunBelowACaller('pipeline');

        await waitUntil(() => !isAlive(pids.watchdog), 6000);

        expect(isAlive(pids.watchdog)).toBe(false);
        expect(isAlive(pids.late)).toBe(false);
        expect(isAlive(pids.bystander)).toBe(true);
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
