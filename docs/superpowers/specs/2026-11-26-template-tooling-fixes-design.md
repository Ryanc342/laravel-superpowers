# 模板工具链修复（第 1 步）设计

> 状态：待确认 · 2026-11-26 · 分支 `fix/template-tooling`

## 1. 为什么做

2026-11-25 检查了用这个模板开发的下游项目（DulaBot、FC-ERP-Suite、MyCompany，以及已删除的 WMS-Template），找出 21 个源自模板的问题。其中和界面无关的工具链问题放在这一步修。这些问题已经造成过实际损害：

- chisel 自己跑起来，改坏了 FC-ERP 约 20 个文件。
- Stop hook 白白卡住会话，DulaBot 累计浪费约 35 分钟。
- 孤儿测试进程让一个同步代理卡了约 11 小时。
- 按名字批量关进程，误杀了其他项目的测试。

修完后，用户在任何一个项目、任何一个工作区里开发时，检查工具都只拦真正的问题，不再自己捣乱。

这一步之后是第 2 步（界面换成 Ant Design + Pro），再之后是下游项目逐个迁移。界面相关的问题（i18n、错误页、共享组件缺口、`frontend-components` 技能文件冲突、分页参数）留给第 2 步。

## 2. 目标、不做的事、反目标

**目标**

- Stop hook 检查会话实际改动过的工作区，包括主目录和 `.worktrees/` 下的目录。只为本会话造成的改动拦人，不会被会话开始前就存在的改动、别的测试运行或超时卡住。
    - 已知限制：同一个工作区里如果同时有另一个会话在改文件，本会话仍可能被它的改动拦下。superpowers 的流程是每个分支用独立的工作区，所以很少遇到。
- 测试和检查跑完或被中断后，不留下任何进程。
- `composer dev` 开着时，所有测试照常能跑。
- 模板里不再有会自己删文件的东西（chisel）。
- 开新项目、同步模板、合并官方更新这三件事，各有写清楚的步骤和冲突处理规则。
- 下游项目同步后，不再需要各自补同样的东西（内存上限、`withoutVite`、`tmpDir` 等）。

**不做**

- 不改 superpowers 插件本身，只改模板自己的文件。
- 不碰界面：页面、组件和 UI 规则留给第 2 步。
- 不做下游项目的同步。那是这一步完成后的独立任务。

**反目标**（技术上做到了也算失败）

- hook 变得更"聪明"，却开始放过真正的失败：只要本会话改了代码，就必须跑完整的 `composer check`。
- 修复本身给下游增加新的同步冲突点。

## 3. 约束

- `composer check` 和 `composer check:browser` 必须通过（CLAUDE.md 的完成标准）。
- Claude Code（`.claude/settings.json`）和 Codex（`.codex/hooks.json`）共用 `.ai/hooks/check.sh`。如果 Codex 不支持某个能力，就退回到现在的行为，但不能报错。
- 依赖变化只有两处，用户已同意：移除 `laravel/chisel`，以及合并官方的 2 次更新（vite-plus 1.8.0、Oxc React Compiler）。
- 拿掉 chisel 之前，`composer update/require/remove` 一律加 `--no-scripts`（现行规则）。

## 4. 方案选择

### 4.1 chisel：拿掉（用户已定）

| 做法                                                  | 取舍                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **拿掉**（选定）                                      | 再也不会自己删文件；第 2 步的新页面不用埋删除标记。代价：开新项目时不能一键删掉不要的登录功能 |
| 保留，只从 `post-update-cmd` 里去掉，改成手动运行一次 | 能一键删功能，但每个页面都得维护 chisel 标记；下游已经删过 chisel 的，以后同步会出现删除冲突  |

不要的登录功能改用设置关掉。这件事要到第 2 步才完整可用，第 1 步只负责拿掉 chisel：

- 第 2 步重写页面时，页面要跟着设置隐藏对应入口。
- 浏览器测试和 `visitSecurityPage()` 要跟着设置跳过或改变流程。现在只有 7 个 Feature 测试文件用了 `skipUnlessFortifyHas()`。
- "修改安全设置前先确认密码"不是 Fortify 的功能，而是 `routes/settings.php` 里的路由中间件。第 2 步要给它加一个开关。

第 1 步完成后到第 2 步之前，不会开新项目，所以这段空档没有影响。

### 4.2 Stop hook 怎么判断"本会话的改动"（我的决定）

| 做法                                                                                              | 取舍                                                                                       |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **会话开始时记一个基准**（选定）：为每个工作区记下每个改动文件的哈希，Stop 时只看和基准不同的文件 | 只读会话不会被会话开始前就有的改动卡住；本会话一改动就照样完整检查。需要 SessionStart hook |
| 读会话记录，找出本会话改过的文件，只检查这些文件                                                  | 更精确，但要解析两种工具的会话记录格式，维护成本高；`composer check` 本来也只能整体跑      |
| 维持现状（检查整个工作区）                                                                        | 就是现在的问题                                                                             |

### 4.3 文档格式（我的决定）

| 做法                                                     | 取舍                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| **hook 先自动格式化本次改动的 Markdown，再检查**（选定） | 文档保持整齐，也不再因为格式被拦。Claude Code 和 Codex 都适用 |
| 把 `docs/**` 从 Oxfmt 里排除                             | 最简单，但文档会越来越乱                                      |
| 用 PostToolUse hook 在每次写文件后格式化                 | Codex 没有对应的钩子                                          |

## 5. 设计

下面的编号对应检查报告里的问题编号。没写"用户已定"的，都是我的决定，可以改。

### 5.1 拿掉 chisel（问题 1，用户已定）

- 用"全部功能都保留"的答案运行一次 chisel：`php artisan install:features --answers='{"auth_features":["email-verification","registration","2fa","passkeys","password-confirmation"]}'`。它会去掉所有 `@chisel-*` 标记、删掉 `composer.json` 里的 `install:features` 脚本行，然后删掉自己（`InstallFeaturesCommand.php`、`chisel.php`、`chisel-paths.php`）。
- 删掉 `extra.laravel.installer.post-create-project` 里的 `install:features`。
- `composer remove laravel/chisel --no-scripts`，然后运行 `php artisan package:discover` 和 `php artisan boost:update`。
- 删掉 `project.md` 里关于 `--no-scripts` 和 `install:features` 的那条规则；保留"不要加 `-q`、更新后检查 `git status`"那条。
- 验收：仓库里搜不到 `chisel`，只有 `composer.lock` 历史和本文档里还提到它。

### 5.2 Stop hook（问题 2、3，以及问题 4 的一部分）

`check.sh` 改成按下面的顺序执行：

1. **基准**：新增 SessionStart hook。会话开始时，对项目仓库（`CLAUDE_PROJECT_DIR`）的每个工作区（`git worktree list`：主目录和 `.worktrees/*`），记下每个未提交改动文件（已修改的和未跟踪的）的路径和内容哈希。存到 `$(git rev-parse --git-common-dir)/claude-check/<session_id>/`。超过 7 天的基准目录在下次 SessionStart 时清理。
2. **本会话改了什么**：Stop 时，对同一仓库的每个工作区，找出"本会话改动的文件"，也就是当前哈希和基准不同的文件、新出现的文件，以及基准里有但现在已经恢复原样的文件。
    - 有基准的工作区：只要有本会话改动的文件，就检查这个工作区。主目录里会话转去工作区之前留下的东西（例如写好的 spec）也包括在内。
    - 会话开始后才出现的工作区（没有基准）：只有当它就是 hook 输入里 `cwd` 所在的工作区时才检查，把它的所有未提交改动都算作本会话的。其他没有基准的工作区多半属于别的会话，跳过。
    - 不在本项目仓库里的目录（例如同步时去了下游项目）：不检查。那个项目有它自己的 hook。
    - Codex：如果没有 SessionStart 或 `session_id`，就没有基准，退回到现在的行为（检查 `git rev-parse --show-toplevel` 那一个工作区的全部改动），但不能报错。
3. **已经通过的状态**：保留现有的"同一状态已通过就跳过"逻辑，按工作区分别记录。
4. **只改了 Markdown**：先对本会话改动的 `*.md` 运行 `npx vp fmt <files>`，不碰别人留下的 Markdown。如果本会话改动的文件全部是 Markdown，格式化后跑 `npx vp check <files>` 就结束，不跑 Pest。
5. **测试库被占用**：`tests/bootstrap.php` 的等待时间改成可以用环境变量 `TEST_DATABASE_LOCK_WAIT`（秒）设置，默认仍是 10 分钟。hook 运行时设成 0。拿不到锁时，hook 不拦代理，而是输出 `systemMessage`："另一个测试正在使用测试库，这次没有检查，结束后请运行 composer check"。
6. **超时**：hook 给自己设一个比配置的 hook 超时短的期限，例如 hook 超时 600 秒，期限就设 540 秒。到期后结束 `composer check` 的整个进程组（见 5.3），然后用 `systemMessage` 告诉用户检查太久没跑完，请自己运行一次。这种情况不算失败，不拦代理。
7. 失败处理保持不变：第一次失败把输出末尾交还给代理；第二次连续失败就放行并警告。

### 5.3 进程清理（问题 4）

清理要覆盖所有测试运行，不只是 hook 的那一次。原因是 `composer check` 不跑浏览器测试（`phpunit.xml` 的 `defaultTestSuite` 是 `Unit,Feature`），而留下孤儿 `playwright run-server` 的，是 `composer check:browser` 和代理自己启动、又被超时或中断杀掉的测试运行。

- **测试栈本身负责清理**：一次 Pest 运行的主进程被杀掉（包括 `SIGKILL`）之后，它启动的 Pest 子进程（并行 worker）和 Playwright 服务器也要在短时间内退出，不能继续占着测试库的锁或管道。实现方式由实施者决定，例如在 `tests/bootstrap.php` 里启动一个看守进程，主进程消失后由它结束剩下的进程；或者让 composer 脚本经过一个包装脚本来运行。验收条件：用 `kill -9` 杀掉 `composer check:browser` 的主进程，几秒内不剩任何相关进程，下一次测试运行能立刻拿到锁。
- **hook**：在独立的进程组里运行 `composer check`，超时（5.2 第 6 点）时结束整个进程组。
- `project.md` 新增规则：禁止 `pkill -f`、`killall` 这类按名字批量关进程的命令。要停掉卡住的测试，只按自己启动的 PID 或进程组关闭。

### 5.4 `composer dev` 开着时跑测试（问题 5）

- `Tests\TestCase::setUp()` 里调用 `Vite::useHotFile()`，指向一个不存在的路径。这样 `public/hot` 存在时，测试也不会去连 Vite 开发服务器。
- Inertia SSR 在测试里不能去请求 SSR 服务器或 Vite。实施时要确认 `public/hot` 存在时 Feature 测试不会出现 `StrayRequestException`，浏览器测试也不会卡住。
- 验收：开着 `composer dev` 跑 `composer check` 和 `composer check:browser`，都通过。

### 5.5 小改动（问题 6、9、14、15、16、17、18）

| 问题 | 改法                                                                                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6    | `phpunit.xml` 加 `<ini name="memory_limit" value="512M"/>`                                                                                                 |
| 9    | Feature 测试默认 `withoutVite()`。浏览器测试仍然使用已构建的资源，所以只加在 Feature 套件上                                                                |
| 14   | `package.json` 加 `"name": "laravel-superpowers"`                                                                                                          |
| 15   | `phpstan.neon` 设 `tmpDir`，放在项目内、已被 git 忽略的目录，例如 `storage/framework/cache/phpstan`                                                        |
| 16   | `.claude/settings.json` 按 Claude Code 自己写出的格式提交：2 空格缩进，键的顺序和结尾换行都与它一致。FC-ERP-Suite 当前的工作副本就是它写出的样子，可以对照 |
| 17   | 让 CLAUDE.md 引用的 `.ai/rules/index.md` 真实存在，而且要用 Boost 自己的机制生成，这样 `boost:update` 不会把它删掉或改回去。第 2 步的 UI 规则也会放在这里  |
| 18   | 删掉 `docs/superpowers/plans/2026-11-23-laravel-superpowers-template.md`，规则见 5.7                                                                       |

### 5.6 规则补充（问题 13、19、20、21）

写进 `.ai/guidelines/project.md`，再由 `boost:update` 生成 CLAUDE.md 和 AGENTS.md：

- **同步模板**（问题 13）：
    - `composer.json` 冲突时，手动把两边的改动合在一起。
    - `composer.lock` 不能直接保留项目的版本：先用项目的版本，再对模板改过约束的包运行 `composer update <这些包> --no-scripts`。不要加 `-W`；如果确实需要连带升级，只用 `--with-dependencies` 并点名具体包。
    - `package-lock.json` 也按同样的思路处理。
    - 每次合并后都要读 `UPGRADING.md`。
- **`UPGRADING.md`**（新文件，放在仓库根目录）：按模板版本（`sp-vX.Y.Z` 标签）列出下游合并后要做的事，例如要运行的命令、要手动改的地方。以后模板每次发布都要更新它，不再只写在合并提交信息里。
- **合并官方更新**（新规则）：
    - 从 `develop` 切 `chore/sync-upstream-<日期>`，在上面 `git merge upstream/main`，跑两项检查后再并回 `develop`。方向和同步模板一样："我们的"一边始终是模板。
    - 冲突处理：页面、组件和样式用我们的；工具和依赖的版本号用官方较新的；chisel 的文件继续删掉；其他两边合在一起。
- **架构规则**（问题 19）：列出 `ArchTest.php` 里 Pest `php`、`security`、`laravel` 三个 preset 实际会检查的规则，例如命令类必须以 `Command` 结尾、控制器只能有哪些方法、不能依赖 middleware。以 `vendor/pestphp/pest` 里 preset 的源码为准，只写会拦人的那些。
- **CI**（问题 21）：推送 `main` 后用 `gh run watch` 看 CI 结果。CI 失败时，先修好再合并或推送其他东西。CI 的触发条件维持现状（推送 `main` 和 PR）。
- **项目自己的测试辅助函数**（问题 12 的测试部分）：模板的 `tests/Pest.php` 自动加载 `tests/Support/*.php`。规则写明项目自己的 Pest 辅助函数和 expectation 放在 `tests/Support/`，不要改 `tests/Pest.php`，避免同步冲突。

### 5.7 模板自己的设计文档（问题 18）

模板自己的 spec 和 plan 在分支合并进 `develop` 之前删掉，git 历史里仍然留着。这样下游同步时不会收到模板的工作文档。规则写进 `project.md`，只适用于 laravel-superpowers 本身，下游项目照常保留自己的文档。本文档也照这条处理。

`docs/superpowers/research/`（UI 调研）不提交。它只在主目录里，已经写进本机的 `.git/info/exclude`（这一步之外、已经做完的本机设置），所以 hook 不会把它当成任何会话的改动。

### 5.8 开新项目（问题 1、20）

- `README.md` 改写成这个模板自己的说明。一个"开新项目"章节写清楚以下步骤：
    1. 克隆模板，保留历史。
    2. 把 `origin` 改成新项目的仓库，加上 `template` remote。
    3. 从 `main` 切出 `develop`。
    4. 复制 `.env`，改 `APP_NAME`，给 `DB_DATABASE` 取一个独有的名字。
    5. 运行 `composer setup`。
    6. 为 Claude Code（用户范围）和 Codex 安装 superpowers，并确认装好了。
    7. 运行 `composer check`。

    README 不再写 `laravel new --using`，因为这样建的项目没有模板历史，以后无法同步。

- `.env.example` 的 `DB_DATABASE` 改成明显需要替换的值，例如 `change_me`，再加一行注释提醒。
- `.gitignore` 加 `/.superpowers`。

### 5.9 合并官方的 2 次更新

按 5.6 的新规则，从 `develop` 切分支后合并 `upstream/main` 上的 `53e1062`（vite-plus 1.8.0）和 `50a9f6c`（Oxc React Compiler）。已知 `package.json` 有冲突，取官方较新的版本；`vite.config.ts` 能自动合并。合并后跑两项检查。

## 6. 留给实施者决定的

- hook 的具体期限，以及进程组的实现方式（macOS 自带的 bash 3.2 没有 `timeout`）。
- Codex hook 输入里有哪些字段、是否支持 SessionStart。以 Codex 文档为准；不支持就退回现在的行为。
- `withoutVite()` 和 `Vite::useHotFile()` 具体放在哪里（`TestCase` 还是 `Pest.php`），以及 Inertia SSR 在测试里怎么关闭。
- Boost 生成 `.ai/rules/index.md` 的具体方式。
- 每项修复都按 TDD 写测试：能用 Pest 或 Vitest 覆盖的就写；hook 脚本的行为至少用一个可以重复运行的 shell 测试覆盖，放在 `tests/` 下合适的位置。

## 7. 这一步之后

- 打新版本标签，并在 `UPGRADING.md` 里写好下游要做的事。
- DulaBot、FC-ERP-Suite、MyCompany 逐个同步模板，各自是独立的任务。MyCompany 同步前，要先修好它不稳定的 `InvoiceFlowTest`：`InvoiceFactory` 随机生成 1 到 3 行，测试却去填第 3 行。
