# 模板工具链修复（第 1 步）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 修好模板里和界面无关的工具链问题：拿掉 chisel；让 Stop hook 只为本会话的改动拦人；测试被杀后不留孤儿进程；`composer dev` 开着也能跑测试；补齐规则和文档；合并官方的 2 次更新。

**Architecture：** 修改集中在五处：

- `.ai/hooks/check.sh`：一个脚本同时处理 SessionStart 和 Stop 两个事件。
- `tests/bootstrap.php`：测试库锁可配置等待时间，并启动一个看守进程。
- `tests/TestCase.php` 和 `tests/Pest.php`：测试环境隔离 Vite。
- 规则和文档：`.ai/guidelines/project.md`、`README.md`、`UPGRADING.md`。
- 一次 `upstream/main` 合并。

hook 的行为用 Vitest 测试：在临时 git 仓库里运行真实脚本，用 PATH 上的假 `composer` 和 `npx` 替身记录调用。

**Tech Stack：** Bash（必须兼容 macOS 自带的 bash 3.2）、PHP 8.4、Laravel 13、Pest 5 + pest-plugin-browser、Vitest（`vp test`）、Laravel Boost 2.10、Composer、Vite+。

**Spec：** `docs/superpowers/specs/2026-11-26-template-tooling-fixes-design.md`

## Global Constraints

**环境和分支**

- 在 worktree `/Users/ryan/Projects/laravel-superpowers/.worktrees/template-tooling` 的 `fix/template-tooling` 分支上工作。所有命令都从这个目录运行。
- 每个任务结束前，`composer check` 必须通过。Task 7、Task 8 和最终验收还要通过 `composer check:browser`。

**Composer 和依赖**

- Task 1 完成之前，`composer update/require/remove` 一律加 `--no-scripts`，之后再手动运行 `php artisan package:discover` 和 `php artisan boost:update`。
- 任何 `composer` 或 `boost:update` 命令都不加 `-q`。
- 依赖只允许两处变化：移除 `laravel/chisel`（Task 1），以及合并 `upstream/main` 带来的 vite-plus 1.8.0 和 Oxc React Compiler（Task 9）。

**脚本写法**

- 脚本不能依赖 `jq`、`timeout`、`setsid`、`mapfile` 或关联数组。解析 JSON 用 `php -r`。
- 文件名可能带空格或中文。处理 `git status` 一律用 `-z` 输出。
- 禁止 `pkill -f` 和 `killall`。代码和规则里都只能按 PID 或进程组结束进程。

**固定的值**

- 环境变量：
    - `TEST_DATABASE_LOCK_WAIT`：秒，默认 `600`。
    - `CHECK_HOOK_DEADLINE`：秒，默认 `540`。
- hook 基准目录：`$(git rev-parse --git-common-dir)/claude-check/<session_id>/`。SessionStart 时删掉超过 7 天的子目录。
- `systemMessage` 文案：
    - 测试库被占用：`Another test run is using the test database, so composer check did not run. Run composer check once it finishes.`
    - 超过期限：`composer check did not finish within {N} seconds and was stopped. Run composer check yourself.`，`{N}` 是实际期限。
    - 现有的两条失败文案保持不变。

## Review Focus

以下情况最容易出错，测试都写在负责的任务里：

1. **会话中途换了工作区**：会话从主目录开始，用 superpowers 新建 `.worktrees/x` 并在里面改代码。Stop 时 `cwd` 是 `.worktrees/x`，没有基准，这个工作区必须被检查（Task 4）。
2. **会话恢复**：同一个 `session_id` 恢复时，SessionStart 会再次触发（`source: "resume"`）。这时不能覆盖原来的基准，否则会话之前的改动会被当成"开始前就有的"（Task 4）。
3. **文件名带空格和中文**：例如 `docs/调研 笔记.md`。它必须被识别为本会话的改动并被格式化，不能被拆成两个路径（Task 4）。
4. **hook 输入为空或不是 JSON**：Codex 的输入格式可能不同。这时退回到旧行为，检查当前工作区，不能因为解析失败而报错（Task 4）。
5. **测试正常结束时**：看守进程不能误杀任何进程，而且要在 2 秒内自己退出（Task 3）。

---

### Task 1：拿掉 chisel

**Files：**

- 删除：`chisel.php`、`chisel-paths.php`、`app/Console/Commands/InstallFeaturesCommand.php`。由 chisel 自己删除。
- 修改：
    - 所有带 `@chisel-*` 标记的文件，由 chisel 去掉标记。可以用 `grep -rln '@chisel-' --exclude-dir=vendor --exclude-dir=node_modules .` 列出。
    - `composer.json`：`post-update-cmd`、`extra.laravel.installer`、`require`。
    - `composer.lock`。
    - `.ai/guidelines/project.md`：删掉 `--no-scripts` / `install:features` 那一条。

**Interfaces：**

- Produces：仓库里没有 chisel。后面的任务运行 `composer` 时不再需要 `--no-scripts`。

- [ ] **Step 1：用"全部保留"的答案运行一次 chisel**

```bash
php artisan install:features --no-interaction --answers='{"auth_features":["email-verification","registration","2fa","passkeys","password-confirmation"]}'
```

预期：命令成功，最后会运行 `composer lint`、`wayfinder:generate` 和 `npm run check:fix`。`chisel.php`、`chisel-paths.php` 和 `InstallFeaturesCommand.php` 已被删除，`composer.json` 里没有 `"@php artisan install:features --ansi"` 这一行了。

- [ ] **Step 2：手动清理 chisel 没碰的地方**

- 删除 `composer.json` 里的 `extra.laravel.installer`。删完后如果 `extra.laravel` 只剩 `dont-discover`，就保留它。
- 删除 `.ai/guidelines/project.md` 第 22 行那条以 "While `composer.json` still lists" 开头的规则。

- [ ] **Step 3：移除依赖**

```bash
composer remove laravel/chisel
git status --short
```

预期：`git status` 里出现 `composer.json`、`composer.lock`、Step 1 改过的文件，以及 `boost:update` 重新生成的 `CLAUDE.md` 和 `AGENTS.md`。不能出现别的模板文件被意外改写。

- [ ] **Step 4：验证**

```bash
grep -rn -i chisel --exclude-dir=vendor --exclude-dir=node_modules --exclude-dir=.git . | grep -v "^./docs/superpowers/" | grep -v "^./composer.lock"
composer check
```

预期：`grep` 没有输出，`composer check` 通过。

- [ ] **Step 5：提交**

`git add -A`，然后提交，提交说明为 `Remove chisel so composer update can no longer strip features`。

---

### Task 2：测试库锁的等待时间可以配置

**Files：**

- 修改：`tests/bootstrap.php`（"One Test Run at a Time" 那一段）
- 测试：`tests/Feature/TestDatabaseTest.php`

**Interfaces：**

- Produces：
    - 环境变量 `TEST_DATABASE_LOCK_WAIT`，单位是秒，默认 `600`。
    - 设成 `0` 时，拿不到锁的运行会立刻向 STDERR 写 `Another test run is using the {database} database.`，然后以 1 退出。Task 5 靠这句话识别"测试库被占用"。
    - 大于 0 时，行为和现在一样：先输出等待提示，再等待。

- [ ] **Step 1：写一个会失败的测试**

在 `tests/Feature/TestDatabaseTest.php` 加一个测试：`a second test run gives up at once when TEST_DATABASE_LOCK_WAIT is 0`。

- 当前运行已经持有锁。用 `Illuminate\Support\Facades\Process`（或 Symfony Process）启动 `php vendor/bin/pest --filter='a test run keeps the test database locked'`。
- 子进程的环境变量：`TEST_DATABASE_LOCK` 设为 `false`，表示不继承，让子进程自己去拿锁；`TEST_DATABASE_LOCK_WAIT` 设为 `'0'`。
- 断言：
    - 退出码是 1；
    - 错误输出包含 `Another test run is using the`；
    - 整个过程不到 30 秒。

- [ ] **Step 2：运行，确认失败**

运行 `php artisan test --compact --filter='TEST_DATABASE_LOCK_WAIT'`。
预期：FAIL。子进程会进入 10 分钟的等待，直到超时。

- [ ] **Step 3：实现**

在 `tests/bootstrap.php` 里读取 `TEST_DATABASE_LOCK_WAIT`（默认 600）：

- 值为 0：输出上面那句话后直接 `exit(1)`。
- 值大于 0：沿用现在的两段式等待，但等待时长用这个值。提示文案里的 "{N} minutes" 改成按秒或分钟计算后的值。

更新那一段的注释说明。

- [ ] **Step 4：运行，确认通过**

再运行 Step 2 的命令，预期 PASS。然后运行 `composer check`。

- [ ] **Step 5：提交**

提交说明：`Let a test run give up at once on a busy test database`。

---

### Task 3：测试运行被杀后不留孤儿进程

**Files：**

- 新建：`tests/process-watchdog.sh`
- 修改：`tests/bootstrap.php`。在拿到锁的那个分支里启动看守进程，也就是只在主进程里启动，并行 worker 不启动。
- 测试：`tests/js/test-runner/process-watchdog.test.ts`

**Interfaces：**

- Produces：`bash tests/process-watchdog.sh <pid> <marker-file>`
    - 每秒检查一次。如果 `<marker-file>` 不存在了，就以 0 退出，什么也不做。
    - 如果 `<pid>` 还活着，就记下它当前所有后代进程的 PID。用 `ps -A -o pid=,ppid=` 遍历进程树。
    - 如果 `<pid>` 已经消失而 marker 还在：
        - 对上一次记下的全部后代发 `TERM`，等 2 秒，再对还活着的发 `KILL`；
        - 删除 marker，然后退出。
- 在 `tests/bootstrap.php` 中：
    - 创建 marker 文件，放在 `sys_get_temp_dir()` 下，文件名带 `getmypid()`。
    - 后台启动看守进程，stdin、stdout、stderr 全部指向 `/dev/null`。它不能占着调用方的管道，否则会让代理的命令一直挂着。
    - 用 `register_shutdown_function` 删除 marker。

- [ ] **Step 1：写会失败的测试**

文件第一行写 `// @vitest-environment node`。用 `node:child_process` 准备场景：

1. 用 `spawn('bash', ['-c', 'sleep 300 & sleep 300 & wait'])` 起一个"父进程"。它有两个 `sleep` 子进程。
2. 创建 marker 文件，以父进程的 PID 运行看守脚本。
3. 等看守脚本至少记录过一次（等 1.5 秒）。

写两个测试：

- `it kills the descendants of a run that was killed`：对父进程发 `SIGKILL`。断言 5 秒内，两个 `sleep` 子进程都不在了（用 `process.kill(pid, 0)` 检查）。
- `it leaves everything alone when the run ends normally`：删除 marker，再正常结束父进程。断言看守脚本在 2 秒内以 0 退出，而且不会去结束任何进程。准备场景时多起一个与父进程无关的 `sleep`，断言它还活着。

- [ ] **Step 2：运行，确认失败**

运行 `npm run test -- tests/js/test-runner/process-watchdog.test.ts`，预期 FAIL，因为脚本不存在。

- [ ] **Step 3：实现**

按 Interfaces 写 `tests/process-watchdog.sh`，再在 `tests/bootstrap.php` 里启动它。

- [ ] **Step 4：运行，确认通过**

运行 Step 2 的命令，预期 PASS。

- [ ] **Step 5：用真实的浏览器测试验收**

1. 在后台运行 `composer check:browser`。
2. 等 `ps` 里出现 `playwright run-server`。
3. 对 Pest 的主进程发 `kill -9`。这个主进程就是父进程不是 Pest 的那个 `php` 进程。

预期：

- 5 秒内，`ps -A -o pid=,command= | grep -E "playwright run-server|vendor/bin/pest"` 里没有这次运行留下的进程；
- 紧接着运行 `php artisan test --compact --filter=TestDatabaseTest`，能立刻拿到锁并通过。

- [ ] **Step 6：提交**

提交说明：`Stop a killed test run's workers and Playwright server`。

---

### Task 4：Stop hook 只为本会话的改动拦人

**Files：**

- 修改：
    - `.ai/hooks/check.sh`
    - `.claude/settings.json`：新增 SessionStart；同时按 Task 6 的格式要求整理这个文件。
    - `.codex/hooks.json`：只有在 Codex 支持 SessionStart 时才加。
- 测试：
    - `tests/js/ai-hooks/check-hook.test.ts`
    - `tests/js/ai-hooks/harness.ts`

**Interfaces：**

- Produces：
    - `check.sh` 从 stdin 读取 hook 输入 JSON，按 `hook_event_name` 分派。
        - `SessionStart`：写基准，不向 stdout 输出任何内容，因为 Claude Code 会把 SessionStart 的 stdout 放进对话上下文。
        - `Stop`：检查。字段缺失时一律当作 Stop。
        - 用到的输入字段：`hook_event_name`、`session_id`、`cwd`、`stop_hook_active`。
    - 项目仓库是 `CLAUDE_PROJECT_DIR`。没有设置时，用当前目录的 `git rev-parse --show-toplevel`。
    - 基准存放在 `<git-common-dir>/claude-check/<session_id>/<工作区路径的 sha1>`。每行格式为 `<内容哈希或 deleted>\t<路径>`，数据来自 `git status --porcelain -z --untracked-files=all`，内容哈希用 `git hash-object`。
    - "本会话改动的文件"和"要检查哪些工作区"按 spec 5.2 第 1、2 点执行。
    - `harness.ts` 导出供 Task 5 复用：
        - `makeRepo(): Promise<{ dir: string; addWorktree(name: string): Promise<string> }>`：建一个临时 git 仓库，已有一次提交。
        - `runHook(input: object | string, opts: { projectDir: string; env?: Record<string, string> }): Promise<{ code: number; stdout: string; stderr: string; calls: string[] }>`：`calls` 是假 `composer` 和 `npx` 被调用时的记录，每条格式为 `"<cwd> <命令> <参数>"`。
        - 用 `STUB_COMPOSER_EXIT`、`STUB_COMPOSER_OUTPUT`、`STUB_COMPOSER_SLEEP` 控制假 `composer` 的行为。

- [ ] **Step 1：写测试工具和会失败的测试**

文件第一行写 `// @vitest-environment node`。`harness.ts` 在临时目录里准备：

- 假的 `composer` 和 `npx` 脚本，放在 PATH 最前面。
- 一个临时仓库。设置好 `git config user.email` 和 `user.name`，提交 `README.md`。

`check-hook.test.ts` 包含以下测试，一个测试只断言一件事：

- `it does not check changes that were there before the session started`：先改 `app.php`，然后 SessionStart，然后 Stop。断言 `calls` 为空，退出码 0。
- `it checks a file the session changed`：SessionStart 之后改 `app.php`，再 Stop。断言 `calls` 里有一条在仓库目录执行的 `composer check`。
- `it counts a file the session put back as changed`：`app.php` 在 SessionStart 前已改动，会话中把它还原，再 Stop。断言执行了 `composer check`。
- `it checks a worktree the session created and moved into`（Review Focus 1）：SessionStart 时还没有这个工作区；之后 `addWorktree('x')` 并在里面改文件；Stop 的 `cwd` 指向它。断言 `composer check` 在 `.worktrees/x` 里执行。
- `it skips another session's new worktree`：同上，但 Stop 的 `cwd` 是主目录。断言没有执行 `composer check`。
- `it keeps the first baseline when a session resumes`（Review Focus 2）：SessionStart，改文件，再次 SessionStart（`source: "resume"`），然后 Stop。断言执行了 `composer check`。
- `it only formats and checks Markdown when only Markdown changed`（Review Focus 3）：会话中新建 `docs/调研 笔记.md`。断言：
    - `calls` 里有 `npx vp fmt`，参数正好是这个路径（一个参数，没有被拆开）；
    - 有一次 `npx vp check`；
    - 没有 `composer check`。
- `it formats only the session's Markdown`：`other.md` 在 SessionStart 前已改动；会话中改 `app.php` 和 `mine.md`。断言 `npx vp fmt` 的参数里只有 `mine.md`，而且执行了 `composer check`。
- `it falls back to checking the current worktree when the input is not JSON`（Review Focus 4）：输入是空字符串，改动的是 `app.php`。断言执行了 `composer check`，而且退出码不是由解析错误导致的。
- `it hands a failure back to the agent once`：`STUB_COMPOSER_EXIT=1`，`STUB_COMPOSER_OUTPUT` 设为 `boom`。断言退出码 2，stderr 包含 `composer check failed` 和 `boom`。
- `it lets the turn end after a second failure in a row`：同上，但 `stop_hook_active` 为 true。断言退出码 0，stdout 是包含 `systemMessage` 的 JSON。
- `it does not run composer check twice for changes that already passed`：同一组改动连续 Stop 两次，第一次通过。断言 `composer check` 只执行了一次。
- `it deletes baselines older than seven days`：先造一个 mtime 为 8 天前的基准目录，然后 SessionStart。断言那个目录已被删除。

- [ ] **Step 2：运行，确认失败**

运行 `npm run test -- tests/js/ai-hooks/check-hook.test.ts`。
预期：大部分测试 FAIL。现有脚本没有基准，也不认 `cwd`。

- [ ] **Step 3：实现**

按 Interfaces 和 spec 5.2 第 1 到 4 点、第 7 点改写 `check.sh`。第 5、6 点留给 Task 5。

- 现有的"同一状态已通过就跳过"逻辑，改为每个工作区各自记录，放在 `git -C <工作区> rev-parse --git-dir` 下。
- 同一次 Stop 检查多个工作区时，按顺序执行；任何一个失败就按失败处理。

`.claude/settings.json` 新增：

```json
"SessionStart": [{ "hooks": [{ "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.ai/hooks/check.sh\"", "timeout": 30 }] }]
```

写入时遵守 Task 6 的格式要求。

Codex：查 Codex 官方文档，或者用一个把 stdin 写进文件的临时 hook 做实验，确认它是否支持 SessionStart、输入里有没有 `session_id` 和 `cwd`。支持就在 `.codex/hooks.json` 加 SessionStart；不支持就不加。把结论写在提交说明里。

- [ ] **Step 4：运行，确认通过**

运行 Step 2 的命令，预期 PASS。然后运行 `composer check`。

- [ ] **Step 5：提交**

提交说明：`Let the Stop hook check only what the session changed, wherever it worked`。

---

### Task 5：Stop hook 不被测试库锁或超时卡住

**Files：**

- 修改：`.ai/hooks/check.sh`
- 测试：`tests/js/ai-hooks/check-hook.test.ts`，复用 Task 4 的 harness

**Interfaces：**

- Consumes：
    - Task 2 的 `TEST_DATABASE_LOCK_WAIT`，以及 `Another test run is using the` 这句输出。
    - Task 4 的 `runHook`、`makeRepo`。
- Produces：
    - hook 运行 `composer check` 时设置环境变量 `TEST_DATABASE_LOCK_WAIT=0`。
    - 整次 hook 有一个总期限：`CHECK_HOOK_DEADLINE`，默认 540 秒。
    - `composer check` 在独立的进程组里运行。bash 3.2 的做法：先 `set -m`，再放到后台，进程组号就是 `$!`。期限一到，就对整个进程组发 `TERM`，再发 `KILL`。

- [ ] **Step 1：写会失败的测试**

- `it does not block the agent when another test run holds the database`：`STUB_COMPOSER_EXIT=1`，`STUB_COMPOSER_OUTPUT` 设为 `Another test run is using the x_test database.`。断言：
    - 退出码 0；
    - stdout 是 JSON，`systemMessage` 正好等于 Global Constraints 里那条"测试库被占用"的文案；
    - 假 `composer` 收到的环境变量里 `TEST_DATABASE_LOCK_WAIT=0`。为此，让假 `composer` 把这个环境变量也写进 `calls`。
- `it stops composer check at the deadline and leaves nothing running`：
    - 设置 `CHECK_HOOK_DEADLINE=2`、`STUB_COMPOSER_SLEEP=60`。
    - 让假 `composer` 在后台再起一个 `sleep 60` 子进程，并把它的 PID 写进文件。
    - 断言：hook 在 6 秒内以 0 退出；stdout 的 `systemMessage` 等于把 `{N}` 换成 `2` 之后的超时文案；那个子进程 PID 已经不存在。

- [ ] **Step 2：运行，确认失败**

运行 `npm run test -- tests/js/ai-hooks/check-hook.test.ts`，预期这两个新测试 FAIL。

- [ ] **Step 3：实现**

按 Interfaces 修改 `check.sh`。测试库被占用和超时都不算失败：既不写"已通过"状态，也不拦代理。

- [ ] **Step 4：运行，确认通过**

运行 Step 2 的命令，预期全部 PASS。然后运行 `composer check`。

- [ ] **Step 5：提交**

提交说明：`Keep the Stop hook from waiting on a busy test database or running past its time`。

---

### Task 6：测试环境隔离 Vite，以及几处一两行的修复

**Files：**

- 修改：
    - `tests/TestCase.php`
    - `tests/Pest.php`
    - `phpunit.xml`
    - `package.json`、`package-lock.json`
    - `phpstan.neon`
    - `.claude/settings.json`
    - `.gitignore`
    - `.env.example`
- 新建：`tests/Support/browser.php`，把 `visitSecurityPage()` 从 `tests/Pest.php` 移过来。
- 测试：`tests/Feature/ViteIsolationTest.php`

**Interfaces：**

- Produces：
    - `tests/Pest.php` 会 `require_once` `tests/Support/*.php` 里的每个文件。
    - 所有测试都不会因为 `public/hot` 存在而去连 Vite 开发服务器或 SSR。
    - Feature 测试不依赖已构建的 manifest。

- [ ] **Step 1：写会失败的测试**

在 `tests/Feature/ViteIsolationTest.php` 写两个测试：

- `pages render while the Vite dev server is running`：
    - 如果 `public/hot` 不存在，就写入 `http://127.0.0.1:5173`，测试结束后删掉。只删自己写的；原本就存在的不碰。
    - `Http::preventStrayRequests()`，然后 `$this->get(route('login'))->assertOk()`。
- `pages render without a built Vite manifest`：
    - `Vite::useManifestFilename('missing-manifest.json')`，然后 `$this->get(route('login'))->assertOk()`。

- [ ] **Step 2：运行，确认失败**

运行 `php artisan test --compact tests/Feature/ViteIsolationTest.php`，预期至少第一个测试 FAIL。

- [ ] **Step 3：实现**

**Vite 隔离：**

- `TestCase::setUp()` 调用 `Vite::useHotFile()`，指向一个不存在的路径，例如 `storage_path('framework/testing/vite.hot')`。
- Feature 套件在 `tests/Pest.php` 里通过 `->beforeEach(fn () => $this->withoutVite())` 加上 `withoutVite()`。浏览器测试不加。
- 如果第一个测试仍然因为 SSR 请求失败，就在测试环境里关闭 Inertia SSR，二选一：
    - `phpunit.xml` 的 `<env>`，前提是 `config/inertia.php` 改为读取 env；
    - 或者在 `TestCase` 里设置。

**几处小修复：**

- `phpunit.xml` 的 `<php>` 里加 `<ini name="memory_limit" value="512M"/>`。
- `package.json` 在 `$schema` 之后加 `"name": "laravel-superpowers"`，然后运行 `npm install`，让 `package-lock.json` 的 name 一致。
- `phpstan.neon` 的 `parameters:` 下加 `tmpDir: storage/framework/cache/phpstan`。
- `.claude/settings.json` 改成 Claude Code 自己写出的格式：
    - 2 空格缩进；
    - 数组每个元素各占一行，例如 `"enabledMcpjsonServers": [\n    "laravel-boost"\n  ]`；
    - 文件末尾有换行。

    对照 `/Users/ryan/Projects/FC-ERP-Suite/.claude/settings.json` 当前的写法，同时保留 Task 4 加进去的 SessionStart。

- `.gitignore` 加 `/.superpowers`。
- `.env.example` 的 `DB_DATABASE=laravel` 改成 `DB_DATABASE=change_me`，上一行加注释 `# Give every project and worktree its own database name.`。

**移动辅助函数：**

- `visitSecurityPage()` 移到 `tests/Support/browser.php`。
- `tests/Pest.php` 改为加载 `tests/Support/*.php`，并在注释里写明：项目自己的辅助函数放在 `tests/Support/`。

- [ ] **Step 4：运行，确认通过**

- 运行 `php artisan test --compact tests/Feature/ViteIsolationTest.php`，预期 PASS。
- 运行 `composer check` 和 `composer check:browser`，都要通过。后者能证明 `visitSecurityPage()` 仍然能被加载。
- 用 `git diff .claude/settings.json` 和 FC-ERP 的文件逐字对照，除 SessionStart 外应当一致。

- [ ] **Step 5：提交**

提交说明：`Keep tests away from the Vite dev server and settle small tooling gaps`。

---

### Task 7：`composer dev` 开着时跑完整检查（验收）

这个任务不写新代码，只验证 spec 5.4 的验收条件。如果发现问题，就在 Task 6 的文件里修，并补上能重现问题的测试。

- [ ] **Step 1：在后台启动 `composer dev`**

用后台命令启动，并记下 PID。等 `public/hot` 出现。

- [ ] **Step 2：运行两项检查**

运行 `composer check` 和 `composer check:browser`。预期两项都通过，不出现 `StrayRequestException`，浏览器测试也不卡住。

- [ ] **Step 3：结束 `composer dev`**

按 Step 1 记下的进程组结束它，再确认 `public/hot` 已被删除。如果没有删除，手动删掉。

- [ ] **Step 4：提交**

如果有修复，提交说明为 `Keep the checks passing while composer dev runs`。

---

### Task 8：规则、README 和 UPGRADING

**Files：**

- 修改：`.ai/guidelines/project.md`、`README.md`
- 新建：`UPGRADING.md`
- 删除：`docs/superpowers/plans/2026-11-23-laravel-superpowers-template.md`
- 再生成：`php artisan boost:update` 和 `php artisan boost:index-rules` 产生的文件

**Interfaces：**

- Consumes：Task 1 到 Task 6 的最终行为。规则必须和实际行为一致，例如 hook 会做什么、`tests/Support/` 的位置。

- [ ] **Step 1：在 `project.md` 里写入 spec 5.3 和 5.6 的规则**

按 spec 原文写入以下各条，每条都要简短、能直接照着做：

- 禁止按名字批量结束进程。
- 同步模板时：`composer.json`、`composer.lock`、`package-lock.json` 分别怎么处理，以及合并后要读 `UPGRADING.md`。
- 合并官方更新：从 `develop` 切 `chore/sync-upstream-<YYYY-MM-DD>`，再执行 `git merge upstream/main`；冲突处理规则照 spec 写。
- 架构规则：以 `vendor/pestphp/pest/src/ArchPresets/{Php,Security,Laravel}.php` 为准，只列会拦人的。至少包括：
    - `App\Http` 只能被 `App\Http` 和 `App\Providers` 使用（所以 middleware 里的东西不能被别处依赖）；
    - 控制器的 public 方法只能是 `__construct`、`__invoke`、`index`、`show`、`create`、`store`、`edit`、`update`、`destroy`、`middleware`；
    - `App\Console\Commands` 下的类以 `Command` 结尾；
    - `App\Http\Requests` 下的类以 `Request` 结尾，并且有 `rules()`；
    - `App\Mail` 下的类实现 `ShouldQueue`；
    - `App\Models` 下的类不以 `Model` 结尾；
    - `config/` 以外不能用 `env()`；
    - 不能用 `dd`、`dump`、`ray`、`exit`。
- CI：推送 `main` 后用 `gh run watch` 看结果；CI 失败时先修好。
- 模板自己的 spec 和 plan：在合并进 `develop` 之前删掉。这条只适用于 laravel-superpowers 本身。
- 项目自己的 Pest 辅助函数放在 `tests/Support/`。

同时把 "A Stop hook ..." 那条更新成新的行为：只检查本会话改过的工作区；只改了 Markdown 时只格式化和检查格式；测试库被占用或超时时只提示，不拦代理。

- [ ] **Step 2：写 `UPGRADING.md`**

标题为 `# Upgrading`，下面加一节 `## sp-v1.3.0 (unreleased)`，写下游项目合并这次改动后要做的事：

- 合并时出现 chisel 文件的删除冲突，就保持删除。
- 运行 `composer update laravel/chisel --no-scripts`，把它从 lock 里去掉；然后运行 `php artisan package:discover` 和 `php artisan boost:update`。
- 用 `grep -rln '@chisel-' .` 找出剩下的标记行，删掉标记，保留标记之间的内容。
- 运行 `npm install`。
- 本地数据库名如果还是 `laravel`，改成项目独有的名字。
- 安装 superpowers，按 README 的步骤。
- 新的 SessionStart hook 会在下一个会话开始时生效。

- [ ] **Step 3：改写 `README.md`**

把官方 starter kit 的内容替换成这个模板自己的说明：

- 一段介绍。
- `## Start a new project`：照 spec 5.8 的 7 步写，命令要能直接复制运行。
- `## Keep a project up to date`：指向 `project.md` 的同步规则和 `UPGRADING.md`。

不写 `laravel new --using`。

- [ ] **Step 4：删除模板自己的旧计划，再重新生成**

```bash
git rm docs/superpowers/plans/2026-11-23-laravel-superpowers-template.md
php artisan boost:update
php artisan boost:index-rules
ls .ai/rules/index.md
```

预期：`index.md` 存在。如果 `boost:index-rules` 因为 `.ai/rules` 是空目录而不生成文件，就改用 Boost 能识别并会保留的最小做法，例如加一条带 `paths` frontmatter、说明这个目录用途的规则。再次运行 `boost:update` 后，这个文件必须还在，并且内容不变。

- [ ] **Step 5：验证并提交**

运行 `composer check` 和 `npx vp fmt --check README.md UPGRADING.md`。
提交说明：`Write down how to start, sync and upgrade projects from the template`。

---

### Task 9：合并官方的 2 次更新

**Files：** 合并 `upstream/main` 带来的改动，涉及 `package.json`、`package-lock.json` 和 `vite.config.ts`。

- [ ] **Step 1：在本分支上合并**

```bash
git fetch upstream
git merge upstream/main
```

本分支是从 `develop` 切出来的，这样就符合 Task 8 写下的"从 `develop` 切分支后合并"规则。

预期：`package.json` 有冲突。按规则处理：

- 工具和依赖的版本号用官方较新的值，例如 vite-plus 用 `1.8.0`；
- 我们自己加的部分保留，例如 `"name"`、我们的脚本和依赖。

- [ ] **Step 2：重新安装并检查**

运行 `npm install`、`composer check`、`composer check:browser`。预期全部通过。

如果 Oxc React Compiler 替换了 babel 插件，`vite.config.ts` 里不能同时留着两套 compiler 配置。

- [ ] **Step 3：提交合并**

提交说明：`Merge the official starter kit's vite-plus 1.8.0 and Oxc React Compiler updates`。

---

### 最终验收（在 finishing-a-development-branch 之前）

- [ ] 在这个 worktree 里，`composer check` 和 `composer check:browser` 都通过。
- [ ] 用 Task 3 Step 5 的方法，再验证一次孤儿进程清理。
- [ ] 按 spec 5.7，删掉本次的 spec 和 plan，用一个提交完成，提交说明为 `Remove the template's own working docs before merging`。然后才能合并进 `develop`。
