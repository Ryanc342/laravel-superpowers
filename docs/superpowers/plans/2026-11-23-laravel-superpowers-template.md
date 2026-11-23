# Laravel Superpowers 模板实施计划

> 状态：待确认 · 2026-11-23
> 位置：`/Users/ryan/Projects/laravel-superpowers`

## 1. 目标

做一个 Laravel 项目模板，用 `laravel new my-app --using=ryanc342/laravel-superpowers` 创建新项目。

- 基底：官方 `laravel/react-starter-kit`
- Laravel 规范：Laravel Boost
- 开发流程：superpowers
- 质量门禁：`composer check`，本地、agent、CI 跑同一条命令
- 前端组件和设计 token：来自 `ryanc342/laravel-agent-starter`，只搬组件

## 2. 工具分工

一句话：Boost 管"代码写成什么样"，superpowers 管"按什么步骤做"，`composer check` 管"做完对不对"，CI 管"合并前再验一次"。

| 工具                             | 负责什么                                                                                                                                                                    | 阶段 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Laravel React starter kit        | 应用骨架：Laravel 13 + Inertia 3 + React 19 + TypeScript + Tailwind 4 + shadcn/ui；Fortify 认证；Wayfinder 把 PHP 路由生成 TS 函数；Vite+ 构建；chisel 在建项目时选认证功能 | 1    |
| MySQL 8.4                        | 开发库和测试库，与生产版本一致                                                                                                                                              | 2    |
| Pest                             | 后端功能测试、单元测试、架构预设（php / security / laravel）                                                                                                                | 2    |
| Vitest（Vite+ 自带的 `vp test`） | 前端组件和 hook 的单元测试                                                                                                                                                  | 3    |
| Pest 浏览器测试（Playwright）    | 在真实浏览器里走关键流程，断言没有 JS 报错                                                                                                                                  | 4    |
| Pint                             | PHP 代码风格                                                                                                                                                                | 5    |
| PHPStan（Larastan）              | PHP 静态类型分析，level 7                                                                                                                                                   | 5    |
| Oxlint                           | JS/TS 代码规则，带类型信息；新开 `react`（hooks 规则）和 `jsx-a11y`（无障碍）插件                                                                                           | 5    |
| Oxfmt                            | 前端格式检查，含 Tailwind class 排序                                                                                                                                        | 5    |
| tsc                              | TypeScript 类型检查，含 Wayfinder 生成的路由类型                                                                                                                            | 5    |
| Laravel Boost                    | guidelines 常驻 CLAUDE.md；skills 按需加载；MCP 查表结构、读日志、执行查询、搜文档；`.ai/` 放项目自己的规则                                                                 | 6    |
| superpowers                      | 澄清需求 → 设计 spec → 实施计划 → 先写测试 → 子代理实现 → 代码审查 → 收尾合并；系统化排错；完成前必须验证                                                                   | 7    |
| Stop hook 门禁                   | agent 结束时有改动就跑 `composer check`，失败就让它接着修                                                                                                                   | 7    |
| agent kit 组件与 token           | ui 基础组件、shared 组件、整套设计 token                                                                                                                                    | 8    |
| GitHub Actions                   | 检查、浏览器测试、依赖漏洞扫描                                                                                                                                              | 9    |

## 3. 决定记录

### 已确定

| 项           | 决定                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 基底         | `laravel/react-starter-kit` main，保留官方历史，加 `upstream` remote 以便合并官方更新                                                      |
| 官方页面     | 2026-11-23 改：官方页面、设置页、对话框和首页全部换成 shared 组件（带框字段、StackedForm、SubmitButton、ConfirmButton 等），颜色改用 token |
| Heading      | 你的版本一字不改（无 description）；官方 7 处调用改为在 Heading 下面自己写一行说明                                                         |
| 分页         | 组件原样搬；后端只补共享 prop `perPageOptions`（10/20/50/100）和它的类型，不搬 `PerPage` 枚举                                              |
| popover      | 搬，新增依赖 `@radix-ui/react-popover`                                                                                                     |
| 校验错误提示 | 方案 B：只对你的带框字段、以及页面上找不到对应输入框的错误弹 toast；官方页面的输入框保留下方红字，不弹 toast。每个错误只显示一次           |
| 组件         | 只搬组件（ui、shared 及其依赖），原样复制；不搬页面、布局、应用外壳、`users/*`、`notifications/*`                                          |
| 设计 token   | 整套搬，包括 `qr-background`；另改 `app.blade.php` 一行首屏背景色                                                                          |
| 错误页       | 不带                                                                                                                                       |
| chisel       | 保留                                                                                                                                       |
| 数据库       | MySQL；生产 8.4，CI 用 8.4                                                                                                                 |
| Boost        | 先只配 Claude Code；后来要求兼容 Codex，见阶段 11                                                                                          |
| superpowers  | 官方插件市场 `superpowers@claude-plugins-official`                                                                                         |
| 提交前检查   | 不做（和 `composer check` 重合）                                                                                                           |
| 门禁         | 简单 Stop hook                                                                                                                             |
| 发布         | 本地做完、验收通过后再定                                                                                                                   |

### 待定

1. props 类型同步：PHP 改了 props 字段名，tsc 发现不了。基础模板做完后再定。

## 4. 实施阶段

每个阶段一个 commit。阶段 5 之后，每个阶段结束时 `composer check` 必须全绿。

### 阶段 1：导入官方基底

- `git init`，添加 `upstream` = `https://github.com/laravel/react-starter-kit`，以 `upstream/main` 为起点。
- `composer install`、`npm install`。
- 跑官方自带检查（`composer test`、`npm run check`、`npm run types:check`），确认起点全绿。
- 固定版本：新增 `.node-version`（24 LTS），composer `config.platform.php` 设为 8.4.1（当前依赖 `symfony/http-foundation` 8.x 要求 PHP ≥ 8.4.1，所以生产 PHP 也必须 ≥ 8.4.1）。
- 提交 `composer.lock` 和 `package-lock.json`（官方不提交，模板仓库提交，避免 CI 依赖版本浮动）。

验收：官方自带检查全绿。

执行记录（已完成）：

- 起点为官方 `012f424`，共 386 个提交。
- 基线：Pint 通过、PHPStan 0 错误、Oxlint 64 个文件无问题、Oxfmt 71 个文件格式正确、tsc 通过、PHPUnit 42 个测试通过。
- **维护模板的注意事项**：官方 `composer.json` 的 `post-update-cmd` 会执行 `install:features`。只要 `chisel.php` 还在，非交互环境下它会按默认全选跑完 chisel，并把 chisel 自己删掉，模板就失去建项目时选功能的能力。`composer require`、`composer update`、没有 lock 时的 `composer install` 都会触发。在模板仓库里执行这些命令时必须带 `LARAVEL_INSTALLER_DEFER_HOOKS=1`。用模板新建出来的项目不受影响，因为 chisel 已经执行完并删除了自己。
- 本机 PHP `memory_limit` 是 128M，PHPStan 会因内存不够崩溃，`composer check` 里统一带 `--memory-limit=1G`。
- 本机 Node 是 26.4.0（不是 LTS 版本），满足 Vitest 要求；CI 用 `.node-version` 指定的 24。

### 阶段 2：MySQL + Pest

MySQL：

- `.env.example` 默认改为 MySQL。
- `phpunit.xml` 指向独立测试库 `<项目名>_test`（测试会清空它，不能和开发库共用）。
- `composer setup` 自动创建开发库和测试库。
- 本地沿用 Homebrew MySQL（3306）。

Pest：

- 去掉 `phpunit/phpunit` 直接依赖，加 `pestphp/pest ^4`、`pestphp/pest-plugin-laravel ^4`，新增 `tests/Pest.php`。
- 用 `pest-plugin-drift` 把官方测试转成 Pest 写法，转完删除 drift。
- **保留 chisel 标记**：`AuthenticationTest`、`SecurityTest` 等文件里的段落标记注释，转换后必须原样存在，逐个核对。
- 架构预设：`arch()->preset()->php()`、`->security()`、`->laravel()`。

验收：全部 Pest 测试在 MySQL 上通过。

执行记录（已完成）：

- Pest 4.7.8；PHPUnit 由 Pest 锁定为 12.5.33。45 个测试通过（官方 42 个 + 3 个架构预设），官方代码没有触发任何架构预设规则。
- drift 转换丢了 4 个 chisel 标记：`AuthenticationTest` 里包住 2FA 跳转测试的那对，以及 `SecurityTest` 里包住"需要确认密码"测试的那对。两对都已手工补回，现在共 14 个，和转换前一致。方法链中间的标记都保住了。模拟 chisel 删除每个功能段后，两个文件语法都正确。
- `RefreshDatabase` 统一在 `tests/Pest.php` 对 `Feature` 目录生效，去掉了各文件里重复的声明。
- 测试库由 `tests/bootstrap.php` 处理：库名固定是开发库名加 `_test`，不存在就自动创建。已用哨兵数据验证：跑完测试，开发库里的数据仍在。
- 开发库由 `migrate --force` 自动创建（已验证）；`post-create-project-cmd` 去掉了创建 SQLite 文件的那一步。
- `laravel/pao` 检测到 AI 智能体时会给 Pest 追加 `--no-output --no-progress`，导致 `pest --drift` 报参数错误。转换时临时去掉智能体相关的环境变量才能运行。
- 本机 MySQL 里已有一个叫 `laravel` 的库，正好是 `.env.example` 的默认库名。阶段 10 要确认安装器建项目时会把库名换成项目名。

### 阶段 3：Vitest

- 开发依赖只加 `jsdom`、`@testing-library/react`。
- `vite.config.ts` 加 `test` 配置：测试文件 `tests/js/**/*.test.{ts,tsx}`，环境 jsdom，`setupFiles: tests/js/setup.ts`；测试时跳过 `laravel()` 插件；开启 `resolve.tsconfigPaths`。
- `package.json` 加 `"test": "vp test"`。
- 先放一个最小测试证明环境可用（没有测试文件时 Vitest 会报错）。

验收：`npm run test` 通过。

### 阶段 4：浏览器测试

放在组件移植之前：先在官方原版界面上建立回归保护，阶段 8 换组件后用它抓问题（比如 Button 默认 type 导致表单不提交，tsc 和单元测试都抓不到）。

- 安装 Pest 浏览器测试插件和 Playwright（只装 Chromium）。
- 覆盖流程：注册；登录、登出；忘记密码；邮箱验证提示；2FA 开启和登录验证；passkey 管理页；修改资料；修改密码；外观切换；删除账户。每个页面断言没有 JS 报错。
- 按 chisel 功能分文件（注册、邮箱验证、2FA、passkeys、密码确认），并在 `chisel.php` 里登记：建项目时没选某功能，对应的浏览器测试一起删除。
- 浏览器测试单独一个 testsuite，也连 MySQL。

验收：浏览器测试在官方原版界面上全绿。

执行记录（已完成）：

- `pestphp/pest-plugin-browser` 4.3.1 + `playwright` 1.65（Chromium）。22 个浏览器测试，约 13 秒。
- `phpunit.xml` 设了 `defaultTestSuite="Unit,Feature"`：平时 `php artisan test` 不跑浏览器测试；浏览器测试用 `--testsuite=Browser`，跑之前要先 `npm run build`。
- 文件分布：核心 3 个（登录登出、找回和重置密码、设置），功能 5 个（注册、邮箱验证、密码确认、2FA、passkeys）。
- 2FA 测试覆盖两条路径：开启 2FA 时用真实密钥算出验证码；登录时分别用验证码和恢复码通过。passkeys 只测页面区块，因为无头浏览器没有 WebAuthn 认证器，注册不了真的 passkey。
- "先确认密码再进安全设置页"写成 `tests/Pest.php` 里的公共函数 `visitSecurityPage()`，chisel 标记只出现在这个永远存在的文件里，不会落在可能已被 chisel 删掉的功能测试文件中。
- `chisel.php` 已登记：没选某个功能时，对应的浏览器测试文件一起删除；`tests/Pest.php` 交给 password-confirmation 处理。
- **安全网验证**：临时把官方 `Button` 的默认 type 改成 `"button"`（就是你组件的行为），8 个测试失败，覆盖了全部 5 个受影响的提交按钮；恢复后全部通过。
- **chisel 实跑验证**：在仓库副本里分别用"全都不选"和"全部都选"运行 `install:features`，两种情况下 chisel 都删除了自己、标记全部清除，Pint、PHPStan、vp check、tsc、Vitest、Pest、浏览器测试全部通过。
- 测试失败时的截图保存在 `tests/Browser/Screenshots`，已加入 `.gitignore`。阶段 9 让 CI 在失败时把截图作为附件上传。

### 阶段 5：`composer check` 与 Oxlint 规则

Oxlint（`vite.config.ts` 的 `lint`）：

- `plugins: ['typescript', 'unicorn', 'oxc', 'react', 'jsx-a11y']`（设置 plugins 会覆盖默认列表，所以默认的三个要写上）。
- `react/rules-of-hooks: 'error'`（这条在 pedantic 分类，开了插件也不会自动开）、`react/exhaustive-deps: 'error'`。

composer 脚本：

| 命令                     | 内容                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `composer check`         | 清配置缓存 → Pint 检查 → PHPStan → `npm run check`（Oxfmt + Oxlint）→ 生成 Wayfinder 路由 → tsc → Vitest → Pest（不含浏览器测试） |
| `composer check:browser` | 构建前端 → 跑浏览器测试                                                                                                           |
| `composer fix`           | Pint 修复 + `npm run check:fix`                                                                                                   |
| `composer ci:check`      | 等于 `composer check`                                                                                                             |

- 快的静态检查在前，任一步失败就停。
- 官方原有的 `lint`、`lint:check`、`types:check`、`test` 等脚本保持不动，减少和官方的差异。

验收：`composer check` 全绿。新规则如果在官方代码上报错，逐个修复并记录。

执行记录（已完成）：

- 官方代码没有违反 React hooks 规则。无障碍规则报了 22 个问题，都在 9 个官方认证文件里：`tabindex-no-positive` 12 个（登录和注册表单用正数 `tabIndex` 排 Tab 顺序）、`no-autofocus` 8 个、`prefer-tag-over-role` 2 个。
- **和计划的偏差**：没有逐个修复，而是在 `lint.overrides` 里只对这 9 个文件关掉这三条规则。原因：修复要改 9 个官方文件，以后合并官方更新会冲突；去掉 `autoFocus` 会降低登录体验；去掉正数 `tabIndex` 会打乱 Tab 顺序。其他文件照常检查。以后在项目里重写这些页面时，可以把对应文件从豁免列表里删掉。
- 用临时违规文件验证过：hook 写在提前 return 之后、依赖数组漏写、`img` 没有 alt、`div` 绑点击、正数 `tabIndex`，全部能被抓到。
- 官方 `types:check` 补了 `--memory-limit=1G`，这是对官方脚本唯一的改动。`composer check` 复用官方的 `lint:check` 和 `types:check`。
- Wayfinder 生成放在 `npm run check` 之前，因为带类型信息的 lint 也需要生成出来的路由文件。
- 实测：`composer check` 约 16 秒；`composer check:browser` 22 个测试通过；故意放一个格式错误的文件，`composer check` 返回 1，并在 Pint 那一步就停止。
- `docs/` 里的 Markdown 也做格式检查：superpowers 写的 spec 和 plan 格式不对时，用 `composer fix` 修正即可。

### 阶段 6：Laravel Boost

- `composer require laravel/boost --dev`，`php artisan boost:install`：只选 Claude Code，开启 guidelines、skills、MCP。
- 预计装上的 skills：`inertia-react-development`、`tailwindcss-development`、`wayfinder-development`、`pest-testing`、`infer-conventions`。
- `post-update-cmd` 加 `@php artisan boost:update --ansi`。
- 项目规则写在 `.ai/guidelines/project.md`，Boost 合并进 CLAUDE.md：
    - 任务完成前 `composer check` 必须全绿；格式问题用 `composer fix`。
    - 前端优先用 `components/shared/*`，详见组件目录 skill；颜色只用设计 token。
    - 开发走 superpowers 流程；spec 写到 `docs/superpowers/specs/`，plan 写到 `docs/superpowers/plans/`。
    - 测试库是 MySQL，需要本地 MySQL 在运行。
- 核对 Boost 通用规则里和 superpowers 冲突的条款（预计有"用户没要求就不新建文档"一类），在 `project.md` 里写明 spec 和 plan 文档是允许的。
- 提交 `CLAUDE.md`、`boost.json`、`.mcp.json`、`.claude/skills`、`.ai/`。官方 `.gitignore` 忽略了 `/.claude`、`/CLAUDE.md`、`/.mcp.json`、`/boost.json`，要把这几行去掉；另外加一行忽略 `.claude/settings.local.json`（个人设置）。

验收：新会话里 Boost MCP 可用，CLAUDE.md 包含项目规则。

执行记录（已完成）：

- Boost 2.10.4。非交互安装时，AI 工具列表读 `boost.json` 的 `agents`；没有配置时，它会选本机检测到的所有 AI 工具。所以先写好只含 `claude_code` 的 `boost.json`，再运行 `boost:install --guidelines --skills --mcp --no-interaction`。
- Boost 对 Claude Code 的处理：有 `CLAUDE.md` 就写进 `CLAUDE.md`，否则写 `AGENTS.md`。为确保 Claude Code 读得到，建了 `CLAUDE.md`，不再生成 `AGENTS.md`。
- 默认开启了 Laravel Cloud 集成（多一个 `deploying-to-cloud` skill）：已关闭并删除这个 skill。Boost 通用规则里还有一句"推荐用 Laravel Cloud 部署"，用空文件 `.ai/guidelines/deployments/core.blade.php` 覆盖掉。
- 实际安装的 skills：`fortify-development`、`inertia-react-development`、`infer-conventions`、`laravel-best-practices`、`tailwindcss-development`、`testing-best-practices`、`wayfinder-development`（Boost 2.10 已用 `testing-best-practices` 取代 `pest-testing`）。
- 项目规则 `.ai/guidelines/project.md` 排在 CLAUDE.md 最前面，内容包括：完成标准（`composer check`）、superpowers 流程、spec 和 plan 文档不受"不要新建文档"规则限制、行为改动先写测试而纯样式改动不加测试、worktree 要用独立的 `DB_DATABASE`、MySQL 必须在运行。
- Boost 生成的文件（`CLAUDE.md`、`boost.json`、`.mcp.json`、`.claude/skills/**`、`.ai/rules/**`）不做 Oxfmt 格式检查，因为每次 `boost:update` 都会重新生成。
- MCP 实测：`boost:mcp` 能完成初始化，并列出 9 个工具（browser-logs、database-connections、database-query、database-schema、get-absolute-url、last-error、read-log-entries、record-rule、search-docs）。

### 阶段 7：superpowers 与门禁

- `.claude/settings.json`：
    - `enabledPlugins: { "superpowers@claude-plugins-official": true }`
    - `enabledMcpjsonServers: ["laravel-boost"]`
    - Stop hook 指向 `.claude/hooks/check.sh`
- `.gitignore` 和 Vite 的 watch 忽略列表加 `.worktrees/`。
- 门禁脚本（十来行）：
    - 工作区没有改动：放行。
    - 有改动：跑 `composer check`；通过放行；失败就把输出最后几十行交给 Claude，阻止结束。
    - 防死循环：同一轮已经拦过一次仍失败，就放行，把失败信息留给用户。
    - 不跑浏览器测试。

验收：故意制造一个格式错误，hook 能拦下并让 Claude 接着修；没有改动时直接放行。

执行记录（已完成）：

- 门禁脚本比计划多了一条：当前这些改动如果上一次已经检查通过，就跳过，不再重跑。通过标记存在 `.git/claude-check-passed`，不会被提交。这样只要工作区还有没提交的改动，你每问一句话就跑 16 秒检查的情况就不会发生。
- 用模拟的 hook 输入测了 5 个场景，全部符合预期：
    1. 有改动且通过：放行，约 10 秒；
    2. 同样的改动再结束一次：直接跳过，0 秒；
    3. 加一个格式错误：返回 2，拦下，交给 Claude 的内容包含出错文件和具体规则；
    4. 被拦一次后仍失败：放行，并给用户一条提示；
    5. 修好之后：放行。
- 放了故意写错的文件到 `.worktrees/` 里，Oxfmt、Oxlint、Pint 都不会扫描它，git 也看不到它。
- 用 Claude Code 公开的 settings JSON Schema 核对过，`enabledPlugins`、`enabledMcpjsonServers`、`hooks.Stop` 字段都存在，插件 ID 格式正确。
- 插件和 hook 在新打开的 Claude Code 会话里生效，第一次打开项目时需要信任这个目录并同意安装插件。

### 阶段 8：移植组件与设计 token

#### 8.1 先出清单，确认后再动代码

列出每个文件的处理方式（原样搬 / 与官方冲突 / 保留官方），连同全部冲突发给你确认。

#### 8.2 搬运范围

- `components/ui/*`：用你的版本，21 个（14 个改过、6 个与官方相同、1 个新增 popover）。官方独有的 alert、card、collapsible、icon、navigation-menu、placeholder-pattern 保留官方版本。
- `components/shared/*`：31 个。
- 依赖链带进来的：`hooks/use-network-error-toast`、`hooks/use-validation-error-toasts`、`lib/pagination`、`types/resource`；`heading`、`input-error`（与官方同名，见 8.3）。
- `resources/css/app.css`：整份替换（字体、display 字号、圆角、颜色改动、新增颜色、`field-empty` 变体、手型指针、减少动态效果、打印样式）。
- `resources/views/app.blade.php`：深色首屏背景色改为 `oklch(0.16 0.01 265)`，只改这一行。
- 测试：shared 组件测试、三个 toast hook 测试、`lib/pagination` 测试、5 个 CSS 校验测试，约 22 个，以清单为准。不搬通知、`users/*`、页面和布局的测试。

#### 8.3 已知冲突

| 冲突                                                                             | 处理                                                                                            |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 你的 `Button` 默认 `type="button"`                                               | 给官方 5 个表单提交按钮补 `type="submit"`：保存资料、修改密码、确认密码、找回密码、重发验证邮件 |
| 你的 `Heading` 去掉了 `description`，标题从 h2 改为 h1                           | 清单阶段二选一：给你的 Heading 加回可选的 `description`；或改官方调用处                         |
| `types/auth.ts`、`types/ui.ts`、`types/index.ts`、`types/navigation.ts` 有增有减 | 取并集：保留官方已有字段，加上你新增的（Navigation 的 `badge`、导出 resource 类型）             |
| `input-error` 颜色改用 token                                                     | 用你的版本（接口兼容）                                                                          |
| 官方独有的 6 个 ui 组件                                                          | 保留官方版本                                                                                    |
| `ui/sonner` 全局校验错误 toast                                                   | 方案 B，见 8.4                                                                                  |
| `form-field` 注释提到 TextareaField、DatePicker、SearchBox，但仓库里没有         | 组件目录只写实际存在的组件                                                                      |

#### 8.4 已定：校验错误只显示一次（方案 B）

背景：你的 `ui/sonner` 注册了 `useValidationErrorToasts`，任何页面提交失败都会为每个字段错误弹 toast。官方页面本来就在字段下方显示红字（11 个文件、22 个字段），不处理的话会显示两次。

规则：

| 出错的字段                                                                       | 显示方式                                                                  |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 你的带框字段（TextField、PasswordField、SelectField，以及 FormField 包着的字段） | 红框 + toast + 自动跳到第一个出错的字段；框下不写字，错误文字只给读屏软件 |
| 页面上找不到对应输入框的错误                                                     | toast（否则这类错误不会显示在任何地方）                                   |
| 页面上有对应输入框，但不是你的带框字段（官方页面的输入框）                       | 不弹 toast，只显示它自己的下方红字；也不自动跳转，保持官方原样            |

登记的改动（写进 8.5 的改动清单）：

1. `hooks/use-validation-error-toasts.ts`：按上表判断是否弹 toast；对应测试补上三种情况。
2. `components/shared/form-field.tsx` 的 `FieldError`：加一个识别标记，让 hook 认出你的字段。四种带框字段都通过它显示错误，所以只改这一处。

两个 passkey 组件的红字来自 passkeys 库，不是表单校验错误，不触发这个 hook，保持原样。

以后在项目里把官方页面的字段换成带框字段时，那个字段会自动从红字改成 toast，换的过程中也不会重复显示。

#### 8.5 原样复制与比对

- 组件代码一个字不改；必须改的地方逐处登记并写明原因。
- 用脚本把模板里每个搬来的文件和你仓库里的原文件逐字节比对，除登记过的改动外必须完全一致。

#### 8.6 组件目录 skill

- 写在 `.ai/skills/frontend-components/SKILL.md`，由 Boost 安装。
- 每个组件写清用途、典型用法，以及什么情况下才新建组件。
- 写明两条表单规则：新页面的输入用你的带框字段；如果直接用 `ui/input`，必须配 `InputError`，否则它的校验错误不会显示。
- 只在做前端任务时加载。

验收：`composer check` 全绿；`composer check:browser` 全绿；逐字节比对通过；人工在浏览器里过一遍明暗模式和手机宽度。

执行记录（已完成）：

- 先在临时副本里完整试搬，找出计划没预料到的问题，确认清单后才动项目。
- 搬入 81 个文件：ui 21 个、shared 31 个、两个 toast hook、`lib/pagination`、`types/resource`、`heading`、`input-error`、`app.css`、22 个测试。逐字节比对：76 个与你的仓库完全一致，5 个是登记过的改动，没有未登记的差异。
- 你的文件的登记改动：
    1. `shared/form-field.tsx` 的 `FieldError`：多输出一个隐藏标记 `<span data-slot="field-error" hidden />`，有没有错误都在。
    2. `hooks/use-validation-error-toasts.ts`：按方案 B 判断是否弹 toast；只跳到带框字段。
    3. 它的测试：字段改用真正的 `FieldError` 组成的带框字段，新增 3 个测试（官方输入框不弹 toast；两者同时出错只弹带框字段的；`FormField` 里嵌套很深的控件也算带框字段）。故意把"往上找标记"改成只查一层，第 3 个测试会失败。
    4. `shared/public-header.tsx` 及其测试：给 "Get started"（`register` 路由）加注册功能的 chisel 标记，`chisel.php` 也加上这两个文件。不选注册功能时 Wayfinder 不生成 `register`，不处理的话 tsc 和构建会失败。
- 官方文件的登记改动：
    - 5 个提交按钮补 `type="submit"`。
    - `password-input.tsx` 的类型多排除 `size`：你的 Input 有 `size` 样式变体，和 HTML 原生的 `size` 属性冲突。
    - 7 处 Heading 调用：Heading 加一行说明，用 `<div>` 包起来；设置页大标题原来自带的 `mb-8 space-y-0.5` 移到外层 div 上，视觉不变，标题从 h2 变成 h1。
    - `HandleInertiaRequests` 共享 `perPageOptions`，`global.d.ts` 补类型，`types/index.ts` 导出 resource 类型，新增 `tests/Feature/Http/Middleware/HandleInertiaRequestsTest.php`（先失败后通过）。
    - `app.blade.php` 首屏背景色一行。
    - `vite.config.ts`：`jsx-a11y/prefer-tag-over-role` 改为全局关闭（你的 loading-state、status-message 用的 `role="status"` 是标准写法）。
- `types/auth.ts`、`types/ui.ts`、`types/navigation.ts` 保留官方：你新增的 `badge` 字段搬来的组件没用到，没有按"取并集"加。
- 方案 B 的标记为什么要一直在：官方页面用的 `<Form>` 组件是在 Inertia 的 `error` 事件之后才更新错误状态，那次渲染发生在事件之后，时机没有保证。所以判断不能依赖错误已经渲染出来。隐藏元素不占位置、不影响网格间距，读屏软件也读不到。
- 组件目录 skill：`.ai/skills/frontend-components/SKILL.md`，由 Boost 装到 `.claude/skills/`。内容包括每个组件的用途、两条表单规则、toast 的触发方式、分页的前后端约定和设计 token。组件注释里提到的、模板没有的东西（PublicLayout、`signedIn` 共享 prop、ResponsiveTable、通知行）没有写进去。
- 验证：
    - `composer check` 全绿（Vitest 24 个文件、106 个测试；Pest 46 个）；
    - 浏览器测试 22 个全过；
    - 在正式代码的副本上按 chisel 功能全关和全开各跑一遍：两种都是 `composer check` 全绿，浏览器测试分别 13 个和 22 个全过，chisel 标记全部清除；
    - 截图查看了登录、仪表盘、个人资料、安全设置、外观设置在浅色、深色和手机宽度下的样子，以及登录出错（只有官方红字，没有 toast）和保存成功（顶部居中 toast）。

### 阶段 9：CI

`.github/workflows/check.yml`，push 到 main 和 PR 时触发，三个并行 job：

| job     | 内容                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| check   | MySQL 8.4 服务容器；PHP 8.4；Node 读 `.node-version`；带 composer 和 npm 缓存；`composer setup` → `composer check` |
| browser | 同样的环境，加装 Playwright Chromium；`composer check:browser`                                                     |
| audit   | `composer audit`、`npm audit --audit-level=high`                                                                   |

- action 版本用 SHA 固定，沿用官方写法。

验收：在 GitHub 上三个 job 全绿（需要先推到仓库，见阶段 10）。

执行记录（本地部分已完成，GitHub 上的验收等推送）：

- 新建 `.github/workflows/check.yml`，删除官方的 `tests.yml`：它用 PHP 8.3 和 SQLite，现在测试需要 MySQL，已经跑不通。
- 三个 job 并行：`check`（MySQL 8.4 服务、PHP 8.4、Node 读 `.node-version`、composer 和 npm 缓存，`composer setup` 后 `composer check`）、`browser`（同样的环境，加装 Playwright Chromium，`composer check:browser`，失败时上传截图）、`audit`（`composer audit --locked`、`npm audit --audit-level=high`）。同一分支有新的推送时，取消还在跑的旧任务。
- 12 处 action 都用 40 位 SHA 固定：checkout、setup-node、setup-php 沿用官方的；新增 `actions/cache` v6.1.0 和 `actions/upload-artifact` v7.0.2。
- 本地模拟：用 Docker 起 `mysql:8.4`（8.4.13，端口 33084），对全新克隆跑 `composer setup`、`composer check`（Pest 46 个全过）、`composer check:browser`（22 个全过）。两个审计命令本地都通过。
- 官方自带的 `.github/dependabot.yml`（只更新 GitHub Actions 版本）保留未动。

### 阶段 10：模板化与冒烟测试

- `composer.json`：包名 `ryanc342/laravel-superpowers`，写好描述。
- README：怎么创建项目；`composer dev`、`composer check`、`composer check:browser`、`composer fix`；开发流程；本地需要 MySQL；生产 PHP ≥ 8.4.1。另写一节"维护模板"，说明 `LARAVEL_INSTALLER_DEFER_HOOKS=1`（见阶段 1 执行记录）。
- 确认带 lock 文件时，`laravel new --using` 仍然会执行 `install:features`（没有 lock 时它靠 `post-update-cmd` 触发，有 lock 时要靠安装器的 `post-create-project` 钩子）。
- 冒烟测试（用本地仓库模拟 `laravel new` 流程），跑两轮：
    - 全部认证功能：`composer check` 和 `composer check:browser` 全绿。
    - 全部不选：chisel 删完代码后，`composer check` 仍然全绿。
- 确认 `laravel new` 时安装器对数据库的提问，保证默认就是 MySQL。
- 推 GitHub、提交 Packagist：等你决定。

## 5. 不做的事

- 从 agent kit 搬页面、布局、应用外壳、`users/*`、通知功能、资源层、Actions 层、Enums、自定义 ArchTest、plan-gate hook、自定义 skills、AGENTS.md 和 CLAUDE.md 的内容、`scripts/setup.php`、dependabot。
- 错误页。
- 提交前检查。
- 中文本地化、PHPStan 提级、覆盖率门槛和变异测试、Rector、Dependabot、部署和错误监控。
