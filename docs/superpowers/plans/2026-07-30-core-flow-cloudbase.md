# 到期咯核心流程 CloudBase 接通 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 CloudBase 开发环境跑通“首次登录 → 默认家庭 → 手动录入 → 详情 → 数量归零”真实数据链路。

**Architecture:** 保持现有微信原生小程序、统一 `api` 云函数和服务端仓储边界。先部署
已经通过本地验证的最新构建产物，再由服务端幂等初始化开发环境集合，最后补齐索引与
默认拒绝规则。

**Tech Stack:** 微信原生小程序、TypeScript、CloudBase、微信开发者工具 CLI、Vitest、esbuild。

## Global Constraints

- 开发环境固定为 `cloud1-d6ga4b3yb70ea3b1c`。
- 只部署 `api` 云函数，不上传或发布小程序版本。
- 不删除现有集合或数据。
- 不提交 `project.private.config.json`、密钥或访问令牌。
- 云端修改、真实数据写入和 Git 提交分别取得项目所有者确认。
- 失败时记录证据并定位根因，不叠加猜测性修复。

---

### Task 1: 固化部署前基线

**Files:**
- Verify: `cloudfunctions/api/index.js`
- Verify: `cloudfunctions/api/package.json`
- Verify: `packages/server/src/index.ts`

**Interfaces:**
- Consumes: 根目录构建脚本与当前源码。
- Produces: 可部署的 `cloudfunctions/api` 目录与本地 SHA-256。

- [ ] **Step 1: 运行完整本地验证**

Run: `npm test`

Expected: 20 个测试文件、49 项测试全部通过。

Run: `npm run typecheck`

Expected: 退出码为 0。

Run: `npm run build`

Expected: 退出码为 0，并刷新 `cloudfunctions/api/index.js`。

- [ ] **Step 2: 记录本地部署产物哈希**

Run: `shasum -a 256 cloudfunctions/api/index.js`

Expected: 输出一个 SHA-256，作为部署后比对基线。

### Task 2: 更新开发环境函数配置并部署

**Files:**
- Deploy: `cloudfunctions/api/index.js`
- Deploy: `cloudfunctions/api/package.json`
- Deploy: `cloudfunctions/api/package-lock.json`

**Interfaces:**
- Consumes: Task 1 的本地构建产物。
- Produces: 超时 10 秒、状态为 `Active` 的最新 `api` 云函数。

- [ ] **Step 1: 将 `api` 超时时间调整为 10 秒**

在 CloudBase 开发环境 `cloud1-d6ga4b3yb70ea3b1c` 的函数配置中，将 `api` 超时时间
从 3 秒改为 10 秒；保持 Node.js 16.13 运行时不变。

- [ ] **Step 2: 部署最新函数并在云端安装依赖**

Run:

```bash
"/Applications/wechatwebdevtools.app/Contents/MacOS/cli" \
  cloud functions deploy \
  --env "cloud1-d6ga4b3yb70ea3b1c" \
  --names api \
  --remote-npm-install \
  --project "/Users/randyhsu_m4/Documents/workspace/MyProjects/expiry-reminder" \
  --port 16280 \
  --lang zh
```

Expected: CLI 报告部署成功。

- [ ] **Step 3: 等待函数恢复 Active**

Run:

```bash
"/Applications/wechatwebdevtools.app/Contents/MacOS/cli" \
  cloud functions info \
  --env "cloud1-d6ga4b3yb70ea3b1c" \
  --names api \
  --project "/Users/randyhsu_m4/Documents/workspace/MyProjects/expiry-reminder" \
  --port 16280 \
  --lang zh
```

Expected: `status = Active`、`timeout = 10`。

### Task 3: 验证部署内容一致

**Files:**
- Compare: `cloudfunctions/api/index.js`
- Temporary: `/private/tmp/expiry-reminder-cloud-verify`

**Interfaces:**
- Consumes: Task 2 的云端函数。
- Produces: 本地与云端入口一致的哈希证据。

- [ ] **Step 1: 下载云端函数到新的临时目录**

使用 `mktemp -d` 创建独立目录，再执行 `cloud functions download`，禁止覆盖工作区文件。

- [ ] **Step 2: 比较本地与云端入口哈希**

Run: `shasum -a 256 cloudfunctions/api/index.js <临时目录>/index.js`

Expected: 两个 SHA-256 完全一致。

### Task 4: 触发首次初始化并验证真实流程

**Files:**
- Exercise: `miniprogram/app.ts`
- Exercise: `miniprogram/pages/item-form/index.ts`
- Exercise: `miniprogram/pages/item-detail/index.ts`

**Interfaces:**
- Consumes: 最新 `api` 云函数和空或未完整初始化的开发环境。
- Produces: 真实家庭、分类、物品和数量状态数据。

- [ ] **Step 1: 在微信开发者工具执行普通编译**

Expected: 无 WXML、TypeScript 或页面路径编译错误。

- [ ] **Step 2: 验证首次登录**

Expected: 页面进入首页，当前家庭为“我的家”，没有重复默认家庭。

- [ ] **Step 3: 验证手动录入**

录入名称“联调测试物品”、任一默认分类、今天之后的到期日期、数量 1。

Expected: 保存成功并进入详情；首页和物品列表可读取同一记录。

- [ ] **Step 4: 验证数量归零**

在详情页将数量从 1 减至 0。

Expected: 数量为 0、状态为已用完，不出现负数或重复物品。

### Task 5: 补齐安全配置并记录结果

**Files:**
- Source: `infra/cloudbase/indexes.json`
- Source: `infra/cloudbase/database.rules.json`
- Modify: `docs/handoff/implementation-progress.md`

**Interfaces:**
- Consumes: 已通过核心流程验证的开发环境。
- Produces: 唯一索引、默认拒绝规则和可追溯实施记录。

- [ ] **Step 1: 按配置文件创建唯一索引**

Expected: 已有合法数据不冲突；索引状态全部可用。

- [ ] **Step 2: 应用数据库默认拒绝规则**

Expected: 小程序客户端不能直接读写业务集合，云函数调用仍可正常工作。

- [ ] **Step 3: 重新执行核心流程读取与数量更新**

Expected: 默认拒绝规则不影响云函数路径。

- [ ] **Step 4: 更新实施进度**

记录实际部署哈希、函数配置、真实流程结果、失败证据和剩余风险；不得写入用户标识、
密钥或临时访问地址。

- [ ] **Step 5: 运行最终本地验证**

Run: `npm test && npm run typecheck && npm run build && git diff --check`

Expected: 所有命令退出码为 0。

Git 提交不在本计划中自动执行；必须由项目所有者另行明确确认。

