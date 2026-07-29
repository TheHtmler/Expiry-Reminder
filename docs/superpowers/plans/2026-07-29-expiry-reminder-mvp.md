# 到期咯首期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一款可在微信真机运行的家庭物品到期提醒小程序，支持多家庭共享、扫码与 OCR 录入、临期状态、轻量数量管理、提醒中心和微信订阅消息。

**Architecture:** 微信原生小程序使用 TypeScript 编写，通过统一云函数 API 访问 CloudBase；页面不直接写数据库。纯领域规则放在 `packages/domain`，跨端请求与响应类型放在 `packages/contracts`，由构建脚本分别产出小程序可用模块和云函数依赖，确保未来 App 可复用核心业务规则。

**Tech Stack:** 微信原生小程序、TypeScript、Node.js、CloudBase 云函数/文档数据库/云存储、Vitest、esbuild、腾讯云 OCR、微信订阅消息。

## Global Constraints

- 微信小程序 AppID 固定为 `wxb8bd2ab35c41a7cd`。
- 产品名称固定为“到期咯”，工程名称固定为 `expiry-reminder`。
- 首期只交付微信小程序，不实现 iOS 或 Android App。
- 核心优先级固定为：提醒可靠性 > 录入速度 > 家庭共享。
- 家庭角色仅包含 `admin` 与 `member`。
- 用户没有任何有效家庭时，会话初始化必须自动创建“我的家”，当前用户为管理员。
- 一个用户可以加入多个家庭，所有业务数据按 `householdId` 隔离。
- 家庭内所有有效成员接收提醒。
- 每次录入创建独立物品记录，不自动合并相同商品。
- OCR 结果必须经过用户确认后才能保存。
- 自定义分类只支持名称、图标、颜色、排序和显隐，不支持自定义字段。
- 小程序提醒中心是提醒事实来源；微信订阅消息只是外部触达渠道。
- 所有服务端写操作必须校验家庭成员身份，客户端不能持有 AppSecret、OCR 密钥或云密钥。
- 所有代码注释、用户文案和项目文档使用中文；代码标识符与文件名使用英文。
- 每个任务严格执行“失败测试 → 最小实现 → 测试通过 → 独立评审 → 经确认后提交”。

---

## 文件结构

```text
expiry-reminder/
├── cloudfunctions/
│   ├── api/
│   │   ├── index.js
│   │   └── package.json
│   ├── notification-dispatch/
│   │   ├── index.js
│   │   └── package.json
│   ├── ocr-extract/
│   │   ├── index.js
│   │   └── package.json
│   └── reminder-scheduler/
│       ├── index.js
│       └── package.json
├── docs/superpowers/
│   ├── plans/2026-07-29-expiry-reminder-mvp.md
│   └── specs/2026-07-29-expiry-reminder-design.md
├── infra/cloudbase/
│   ├── collections.json
│   ├── database.rules.json
│   └── indexes.json
├── miniprogram/
│   ├── app.json
│   ├── app.ts
│   ├── app.wxss
│   ├── components/
│   ├── generated/
│   ├── pages/
│   ├── services/
│   ├── state/
│   └── styles/
├── packages/
│   ├── contracts/src/
│   ├── domain/src/
│   └── server/src/
├── scripts/
│   ├── build-cloudfunctions.mjs
│   └── build-shared.mjs
├── tests/
│   ├── contracts/
│   ├── domain/
│   ├── integration/
│   └── server/
├── package.json
├── project.config.json
├── tsconfig.json
└── vitest.config.ts
```

职责边界：

- `packages/domain`：无微信、CloudBase 或网络依赖的日期、数量、提醒规则。
- `packages/contracts`：云函数 action、输入输出 DTO、错误码。
- `packages/server`：权限、仓储接口、业务用例和 CloudBase 适配器。
- `miniprogram/pages`：页面展示与用户交互，不直接访问数据库。
- `miniprogram/services`：统一调用云函数、扫码、拍照和订阅消息。
- `cloudfunctions/*`：由 `packages/server` 构建出的部署入口。
- `infra/cloudbase`：集合、索引和数据库安全规则的可审查配置。

---

### Task 1: 工程骨架与可重复构建

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Modify: `project.config.json`
- Create: `miniprogram/app.ts`
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.wxss`
- Create: `miniprogram/sitemap.json`
- Create: `miniprogram/pages/home/index.ts`
- Create: `miniprogram/pages/home/index.json`
- Create: `miniprogram/pages/home/index.wxml`
- Create: `miniprogram/pages/home/index.wxss`
- Create: `miniprogram/pages/items/index.ts`
- Create: `miniprogram/pages/items/index.json`
- Create: `miniprogram/pages/items/index.wxml`
- Create: `miniprogram/pages/items/index.wxss`
- Create: `miniprogram/pages/reminders/index.ts`
- Create: `miniprogram/pages/reminders/index.json`
- Create: `miniprogram/pages/reminders/index.wxml`
- Create: `miniprogram/pages/reminders/index.wxss`
- Create: `miniprogram/pages/profile/index.ts`
- Create: `miniprogram/pages/profile/index.json`
- Create: `miniprogram/pages/profile/index.wxml`
- Create: `miniprogram/pages/profile/index.wxss`
- Create: `packages/domain/src/index.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `scripts/build-shared.mjs`
- Create: `scripts/build-cloudfunctions.mjs`
- Test: `tests/integration/project-config.test.ts`

**Interfaces:**
- Consumes: 微信小程序 AppID `wxb8bd2ab35c41a7cd`。
- Produces: `npm run build`、`npm test`、`npm run typecheck` 三个稳定命令；后续任务均以此工程结构为基础。

- [x] **Step 1: 写工程配置失败测试**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("微信小程序工程配置", () => {
  it("使用正式 AppID 与 miniprogram 根目录", () => {
    const config = JSON.parse(readFileSync("project.config.json", "utf8"));
    expect(config.appid).toBe("wxb8bd2ab35c41a7cd");
    expect(config.miniprogramRoot).toBe("miniprogram/");
    expect(config.cloudfunctionRoot).toBe("cloudfunctions/");
  });

  it("注册四个首期页面", () => {
    const app = JSON.parse(readFileSync("miniprogram/app.json", "utf8"));
    expect(app.pages).toEqual([
      "pages/home/index",
      "pages/items/index",
      "pages/reminders/index",
      "pages/profile/index",
    ]);
  });
});
```

- [x] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/integration/project-config.test.ts`

Expected: FAIL，原因是 `package.json` 或 `project.config.json` 不存在。

- [x] **Step 3: 创建最小工程配置**

`package.json` 使用以下脚本和开发依赖：

```json
{
  "name": "expiry-reminder",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "build": "npm run build:shared && npm run build:cloudfunctions",
    "build:shared": "node scripts/build-shared.mjs",
    "build:cloudfunctions": "node scripts/build-cloudfunctions.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/wechat-miniprogram": "^3.4.8",
    "esbuild": "^0.25.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

`project.config.json`：

```json
{
  "appid": "wxb8bd2ab35c41a7cd",
  "projectname": "expiry-reminder",
  "compileType": "miniprogram",
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "es6": true,
    "minified": true,
    "postcss": true,
    "useCompilerPlugins": ["typescript"]
  }
}
```

保留微信开发者工具已经写入的其他设置，只修改或补充上述字段；不得覆盖
`project.private.config.json`。根目录 `.gitignore` 必须包含：

```gitignore
project.private.config.json
```

`tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "types": ["node", "wechat-miniprogram"],
    "skipLibCheck": true
  },
  "include": ["miniprogram/**/*.ts", "packages/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

`vitest.config.ts`：

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: { reporter: ["text", "json-summary"] },
  },
});
```

`miniprogram/app.json`：

```json
{
  "pages": [
    "pages/home/index",
    "pages/items/index",
    "pages/reminders/index",
    "pages/profile/index"
  ],
  "window": {
    "navigationBarTitleText": "到期咯",
    "navigationBarBackgroundColor": "#F7F8F5",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#F7F8F5"
  },
  "tabBar": {
    "color": "#687068",
    "selectedColor": "#D85F42",
    "list": [
      {"pagePath": "pages/home/index", "text": "首页"},
      {"pagePath": "pages/items/index", "text": "物品"},
      {"pagePath": "pages/reminders/index", "text": "提醒"},
      {"pagePath": "pages/profile/index", "text": "我的"}
    ]
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

`miniprogram/sitemap.json`：

```json
{
  "desc": "到期咯页面索引规则",
  "rules": [{"action": "allow", "page": "*"}]
}
```

首页最小实现：

```ts
Page({
  data: { title: "今天没有需要处理的物品" },
});
```

```xml
<view class="page">
  <text>{{title}}</text>
</view>
```

- [x] **Step 4: 创建构建脚本和其余三个空页面**

每个空页面必须包含 `.ts`、`.json`、`.wxml`、`.wxss` 四个文件，`.ts` 内容统一为：

```ts
Page({ data: {} });
```

`scripts/build-shared.mjs`：

```js
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("miniprogram/generated", { recursive: true });
await build({
  entryPoints: {
    domain: "packages/domain/src/index.ts",
    contracts: "packages/contracts/src/index.ts",
  },
  outdir: "miniprogram/generated",
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2020",
});
```

`scripts/build-cloudfunctions.mjs`：

```js
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

const entry = "packages/server/src/index.ts";
if (existsSync(entry)) {
  await mkdir("cloudfunctions/api", { recursive: true });
  await build({
    entryPoints: [entry],
    outfile: "cloudfunctions/api/index.js",
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    external: ["wx-server-sdk"],
  });
}
```

`packages/domain/src/index.ts` 与 `packages/contracts/src/index.ts` 初始内容均为：

```ts
export {};
```

- [x] **Step 5: 安装依赖并运行构建**

Run: `npm install`

Run: `npm run build && npm run typecheck`

Expected: 两条命令均退出码为 0。

- [x] **Step 6: 运行测试**

Run: `npm test -- tests/integration/project-config.test.ts`

Expected: 2 tests PASS。

- [x] **Step 7: 提交**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vitest.config.ts project.config.json miniprogram packages/domain/src/index.ts packages/contracts/src/index.ts scripts tests/integration/project-config.test.ts
git commit -m "chore: initialize wechat miniprogram project"
```

---

### Task 2: 日期、状态、数量与提醒领域规则

**Files:**
- Create: `packages/domain/src/date-status.ts`
- Create: `packages/domain/src/quantity.ts`
- Create: `packages/domain/src/reminder-policy.ts`
- Create: `packages/domain/src/index.ts`
- Test: `tests/domain/date-status.test.ts`
- Test: `tests/domain/quantity.test.ts`
- Test: `tests/domain/reminder-policy.test.ts`

**Interfaces:**
- Consumes: ISO 日期字符串 `YYYY-MM-DD`、IANA 时区名称、分类默认阈值。
- Produces:
  - `calculateEventStatus(input: EventStatusInput): EventStatus`
  - `changeQuantity(current: number, delta: number): QuantityResult`
  - `buildReminderSchedule(input: ReminderScheduleInput): string[]`

- [x] **Step 1: 写日期状态失败测试**

```ts
import { describe, expect, it } from "vitest";
import { calculateEventStatus } from "../../packages/domain/src/date-status";

describe("calculateEventStatus", () => {
  it.each([
    ["2026-08-10", 7, "normal"],
    ["2026-08-05", 7, "near_expiry"],
    ["2026-07-29", 7, "due_today"],
    ["2026-07-28", 7, "expired"],
  ] as const)("将 %s 计算为 %s", (eventDate, thresholdDays, expected) => {
    expect(calculateEventStatus({
      today: "2026-07-29",
      eventDate,
      thresholdDays,
      processed: false,
    })).toBe(expected);
  });

  it("已处理事件始终返回 processed", () => {
    expect(calculateEventStatus({
      today: "2026-07-29",
      eventDate: "2026-07-01",
      thresholdDays: 7,
      processed: true,
    })).toBe("processed");
  });
});
```

- [x] **Step 2: 运行日期测试并确认失败**

Run: `npm test -- tests/domain/date-status.test.ts`

Expected: FAIL，提示无法解析 `date-status` 模块。

- [x] **Step 3: 实现日期状态**

```ts
export type EventStatus =
  | "normal"
  | "near_expiry"
  | "due_today"
  | "expired"
  | "processed";

export interface EventStatusInput {
  today: string;
  eventDate: string;
  thresholdDays: number;
  processed: boolean;
}

const DAY_MS = 86_400_000;

function parseDate(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function calculateEventStatus(input: EventStatusInput): EventStatus {
  if (input.processed) return "processed";
  const days = Math.round((parseDate(input.eventDate) - parseDate(input.today)) / DAY_MS);
  if (days < 0) return "expired";
  if (days === 0) return "due_today";
  if (days <= input.thresholdDays) return "near_expiry";
  return "normal";
}
```

- [x] **Step 4: 写数量与提醒策略失败测试**

```ts
import { describe, expect, it } from "vitest";
import { changeQuantity } from "../../packages/domain/src/quantity";
import { buildReminderSchedule } from "../../packages/domain/src/reminder-policy";

describe("changeQuantity", () => {
  it("数量归零后返回已用完", () => {
    expect(changeQuantity(1, -1)).toEqual({ quantity: 0, exhausted: true });
  });

  it("拒绝负数数量", () => {
    expect(() => changeQuantity(0, -1)).toThrow("数量不能小于零");
  });
});

describe("buildReminderSchedule", () => {
  it("过期前三天每天提醒，之后每三天提醒", () => {
    expect(buildReminderSchedule({
      eventDate: "2026-07-29",
      thresholdDays: 2,
      repeatUntil: "2026-08-07",
    })).toEqual([
      "2026-07-27",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-04",
      "2026-08-07",
    ]);
  });
});
```

- [x] **Step 5: 实现数量与提醒策略**

`quantity.ts`：

```ts
export interface QuantityResult {
  quantity: number;
  exhausted: boolean;
}

export function changeQuantity(current: number, delta: number): QuantityResult {
  const quantity = current + delta;
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("数量不能小于零");
  }
  return { quantity, exhausted: quantity === 0 };
}
```

`reminder-policy.ts` 必须以 UTC 自然日递增，输出去重后的 ISO 日期；生成临期首日、到期日、过期后第 1/2/3 天，此后每 3 天直至 `repeatUntil`。

```ts
export interface ReminderScheduleInput {
  eventDate: string;
  thresholdDays: number;
  repeatUntil: string;
}

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const toIso = (value: Date) => value.toISOString().slice(0, 10);
const addDays = (value: Date, days: number) =>
  new Date(value.getTime() + days * 86_400_000);

export function buildReminderSchedule(input: ReminderScheduleInput): string[] {
  const event = toDate(input.eventDate);
  const end = toDate(input.repeatUntil);
  const dates = new Set<string>([
    toIso(addDays(event, -input.thresholdDays)),
    toIso(event),
  ]);
  for (let day = 1; day <= 3; day += 1) {
    const date = addDays(event, day);
    if (date <= end) dates.add(toIso(date));
  }
  for (let day = 6; addDays(event, day) <= end; day += 3) {
    dates.add(toIso(addDays(event, day)));
  }
  return [...dates].sort();
}
```

- [x] **Step 6: 运行领域测试与类型检查**

Run: `npm test -- tests/domain`

Expected: 所有领域测试 PASS。

Run: `npm run typecheck`

Expected: 退出码为 0。

- [ ] **Step 7: 提交**

```bash
git add packages/domain tests/domain
git commit -m "feat: add expiry domain rules"
```

---

### Task 3: 云函数协议、错误码与统一客户端

**Files:**
- Create: `packages/contracts/src/actions.ts`
- Create: `packages/contracts/src/dto.ts`
- Create: `packages/contracts/src/errors.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `miniprogram/services/cloud-client.ts`
- Create: `packages/server/src/result.ts`
- Test: `tests/contracts/actions.test.ts`
- Test: `tests/server/result.test.ts`

**Interfaces:**
- Consumes: Task 2 的领域类型。
- Produces:
  - `ApiAction`
  - `ApiRequest<A>`
  - `ApiResponse<T>`
  - `callApi<A extends ApiAction>(action, payload)`
  - `ok(data)` 与 `fail(code, message)`

- [x] **Step 1: 写协议失败测试**

```ts
import { describe, expect, it } from "vitest";
import { API_ACTIONS } from "../../packages/contracts/src/actions";
import { fail, ok } from "../../packages/server/src/result";

describe("云函数协议", () => {
  it("action 名称稳定", () => {
    expect(API_ACTIONS).toContain("household.create");
    expect(API_ACTIONS).toContain("item.create");
    expect(API_ACTIONS).toContain("reminder.list");
  });

  it("返回统一成功与失败结构", () => {
    expect(ok({ id: "1" })).toEqual({ ok: true, data: { id: "1" } });
    expect(fail("FORBIDDEN", "无权访问该家庭")).toEqual({
      ok: false,
      error: { code: "FORBIDDEN", message: "无权访问该家庭" },
    });
  });
});
```

- [x] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/contracts tests/server/result.test.ts`

Expected: FAIL，提示模块不存在。

- [x] **Step 3: 定义 action 与响应结构**

`actions.ts`：

```ts
export const API_ACTIONS = [
  "session.bootstrap",
  "household.create",
  "household.list",
  "household.invite.create",
  "household.invite.accept",
  "household.member.remove",
  "household.admin.transfer",
  "household.settings.update",
  "household.dissolve",
  "category.list",
  "category.save",
  "category.reorder",
  "location.list",
  "location.save",
  "item.create",
  "item.update",
  "item.list",
  "item.detail",
  "item.quantity.change",
  "item.process",
  "item.delete",
  "item.restore",
  "item.bulkMoveCategory",
  "reminder.list",
  "reminder.markRead",
  "media.tempUrl",
  "account.export",
  "account.delete",
] as const;

export type ApiAction = (typeof API_ACTIONS)[number];
```

`errors.ts`：

```ts
export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "OCR_LOW_CONFIDENCE"
  | "INTERNAL_ERROR";
```

`dto.ts`：

```ts
import type { ApiAction } from "./actions";
import type { ApiErrorCode } from "./errors";

export interface ApiRequest<A extends ApiAction, P = unknown> {
  action: A;
  payload: P;
  requestId: string;
}

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string } };

export type ApiEnvelope = ApiRequest<ApiAction, Record<string, unknown>>;
```

`result.ts`：

```ts
import type { ApiErrorCode } from "../../contracts/src/errors";

export const ok = <T>(data: T) => ({ ok: true as const, data });
export const fail = (code: ApiErrorCode, message: string) => ({
  ok: false as const,
  error: { code, message },
});
```

- [x] **Step 4: 实现小程序云函数客户端**

```ts
import type { ApiAction } from "../../packages/contracts/src/actions";

export async function callApi<TPayload, TResult>(
  action: ApiAction,
  payload: TPayload,
): Promise<TResult> {
  const response = await wx.cloud.callFunction({
    name: "api",
    data: {
      action,
      payload,
      requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
  });
  const result = response.result as
    | { ok: true; data: TResult }
    | { ok: false; error: { code: string; message: string } };
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
```

- [x] **Step 5: 运行测试与类型检查**

Run: `npm test -- tests/contracts tests/server/result.test.ts`

Expected: 所有测试 PASS。

Run: `npm run typecheck`

Expected: 退出码为 0。

- [ ] **Step 6: 提交**

```bash
git add packages/contracts packages/server/src/result.ts miniprogram/services/cloud-client.ts tests/contracts tests/server/result.test.ts
git commit -m "feat: define cloud api contracts"
```

---

### Task 4: 用户会话、家庭、成员与邀请

**Files:**
- Create: `packages/server/src/context.ts`
- Create: `packages/server/src/repositories.ts`
- Create: `packages/server/src/households/service.ts`
- Create: `packages/server/src/households/handlers.ts`
- Create: `packages/server/src/router.ts`
- Create: `packages/server/src/index.ts`
- Create: `cloudfunctions/api/index.js`
- Create: `cloudfunctions/api/package.json`
- Create: `infra/cloudbase/collections.json`
- Create: `infra/cloudbase/indexes.json`
- Create: `infra/cloudbase/database.rules.json`
- Create: `tests/support/memory-repositories.ts`
- Test: `tests/server/households.test.ts`
- Test: `tests/integration/household-flow.test.ts`

**Interfaces:**
- Consumes: `ApiAction`、`ok/fail`。
- Produces:
  - `bootstrapSession(openId): Promise<SessionDto>`
  - `createHousehold(actor, input): Promise<HouseholdDto>`
  - `createInvite(actor, householdId): Promise<InviteDto>`
  - `acceptInvite(actor, token): Promise<MembershipDto>`
  - `transferAdmin(actor, input): Promise<void>`
  - `updateHouseholdSettings(actor, input): Promise<HouseholdDto>`
  - `dissolveHousehold(actor, input): Promise<void>`
  - `assertMember(actor, householdId, roles?)`

`SessionService.bootstrap` 在用户没有任何有效家庭时，必须在同一事务内创建名为
“我的家”的家庭、管理员成员和默认分类；重复初始化不得重复创建。客户端无家庭引导
仅作为异常数据的兜底，不再是正常首次进入路径。

- [x] **Step 1: 写家庭权限失败测试**

```ts
import { describe, expect, it } from "vitest";
import { createMemoryRepositories } from "../support/memory-repositories";
import { HouseholdService } from "../../packages/server/src/households/service";

describe("HouseholdService", () => {
  it("创建者自动成为管理员", async () => {
    const repos = createMemoryRepositories();
    const service = new HouseholdService(repos);
    const household = await service.createHousehold(
      { userId: "u1", openId: "o1" },
      { name: "我们家", timezone: "Asia/Shanghai" },
    );
    expect(await repos.members.find(household.id, "u1")).toMatchObject({
      role: "admin",
      status: "active",
    });
  });

  it("普通成员不能移除成员", async () => {
    const repos = createMemoryRepositories();
    const service = new HouseholdService(repos);
    await expect(service.removeMember(
      { userId: "member", openId: "om" },
      { householdId: "h1", userId: "u2" },
    )).rejects.toThrow("仅管理员可移除成员");
  });

  it("管理员转让后角色原子互换", async () => {
    await service.transferAdmin(
      { userId: "u1", openId: "o1" },
      { householdId: "h1", targetUserId: "u2" },
    );
    expect(await repos.members.find("h1", "u1")).toMatchObject({ role: "member" });
    expect(await repos.members.find("h1", "u2")).toMatchObject({ role: "admin" });
  });
});
```

- [x] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/server/households.test.ts`

Expected: FAIL，提示 `HouseholdService` 不存在。

- [x] **Step 3: 定义仓储与服务接口**

`repositories.ts` 必须暴露：

```ts
export interface MemberRecord {
  householdId: string;
  userId: string;
  role: "admin" | "member";
  status: "active" | "removed";
}

export interface Repositories {
  users: UserRepository;
  households: HouseholdRepository;
  members: MemberRepository;
  invites: InviteRepository;
  idempotency: IdempotencyRepository;
}
```

`HouseholdService.createHousehold` 必须在同一业务用例内创建家庭与管理员成员；邀请令牌使用加密随机值的 SHA-256 摘要落库，原始令牌只返回一次，24 小时后失效。

- [x] **Step 4: 实现服务端路由**

```ts
export interface Services {
  session: SessionService;
  households: HouseholdService;
}

export function createRouter(services: Services) {
  return async function route(context: RequestContext, request: ApiEnvelope) {
    switch (request.action) {
      case "session.bootstrap":
        return ok(await services.session.bootstrap(context));
      case "household.create":
        return ok(await services.households.createHousehold(context.actor, request.payload));
      case "household.list":
        return ok(await services.households.listHouseholds(context.actor));
      case "household.invite.create":
        return ok(await services.households.createInvite(context.actor, request.payload));
      case "household.invite.accept":
        return ok(await services.households.acceptInvite(context.actor, request.payload));
      case "household.member.remove":
        return ok(await services.households.removeMember(context.actor, request.payload));
      case "household.admin.transfer":
        return ok(await services.households.transferAdmin(context.actor, request.payload));
      case "household.settings.update":
        return ok(await services.households.updateSettings(context.actor, request.payload));
      case "household.dissolve":
        return ok(await services.households.dissolveHousehold(context.actor, request.payload));
      default:
        return fail("NOT_FOUND", "未知操作");
    }
  };
}
```

- [x] **Step 5: 配置集合、唯一索引和默认拒绝规则**

`indexes.json` 至少包含：

```json
[
  {
    "collection": "household_members",
    "name": "uniq_household_user",
    "unique": true,
    "fields": [
      {"field": "householdId", "order": "asc"},
      {"field": "userId", "order": "asc"}
    ]
  },
  {
    "collection": "household_invites",
    "name": "uniq_token_hash",
    "unique": true,
    "fields": [{"field": "tokenHash", "order": "asc"}]
  }
]
```

数据库规则固定为客户端不可直接写业务集合：

```json
{
  "read": false,
  "write": false
}
```

家庭设置只接受有效 IANA 时区和 `8 <= reminderHour <= 20`。解散家庭写入
`dissolvedAt`，同时将全部成员状态更新为 `removed`。转让管理员必须在一个事务
中将目标成员设为 `admin`、原管理员设为 `member`，任一步失败均回滚。

- [x] **Step 6: 运行家庭服务测试**

Run: `npm test -- tests/server/households.test.ts tests/integration/household-flow.test.ts`

Expected: 创建、邀请、加入、移除和越权场景全部 PASS。

- [x] **Step 7: 构建云函数并验证入口**

Run: `npm run build:cloudfunctions`

Expected: `cloudfunctions/api/index.js` 可被 Node 加载，且导出 `main`。

- [ ] **Step 8: 提交**

```bash
git add packages/server cloudfunctions/api infra/cloudbase tests/server tests/integration/household-flow.test.ts
git commit -m "feat: add household membership backend"
```

---

### Task 5: 默认分类、自定义分类与存放位置

**Files:**
- Create: `packages/domain/src/default-categories.ts`
- Create: `packages/server/src/categories/service.ts`
- Create: `packages/server/src/categories/handlers.ts`
- Create: `packages/server/src/locations/service.ts`
- Create: `packages/server/src/locations/handlers.ts`
- Modify: `packages/server/src/households/service.ts`
- Modify: `packages/server/src/router.ts`
- Modify: `infra/cloudbase/indexes.json`
- Test: `tests/domain/default-categories.test.ts`
- Test: `tests/server/categories.test.ts`
- Test: `tests/server/locations.test.ts`

**Interfaces:**
- Consumes: `assertMember` 与家庭仓储。
- Produces:
  - `DEFAULT_CATEGORIES`
  - `listCategories(actor, householdId)`
  - `saveCategory(actor, input)`
  - `reorderCategories(actor, input)`
  - `saveLocation(actor, input)`
  - `ensureDefaultCategories(householdId): Promise<void>`

- [x] **Step 1: 写默认分类失败测试**

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "../../packages/domain/src/default-categories";

describe("DEFAULT_CATEGORIES", () => {
  it("提供八个固定默认分类", () => {
    expect(DEFAULT_CATEGORIES.map((item) => item.key)).toEqual([
      "food",
      "medicine",
      "beauty",
      "digital",
      "appliance",
      "household_supply",
      "document_service",
      "other",
    ]);
  });
});
```

- [x] **Step 2: 写分类权限与排序失败测试**

```ts
it("普通成员不能修改分类", async () => {
  await expect(service.saveCategory(memberActor, {
    householdId: "h1",
    name: "宠物用品",
    icon: "paw",
    color: "#9B7B5A",
  })).rejects.toThrow("仅管理员可管理分类");
});

it("排序必须包含家庭全部可见分类且不得重复", async () => {
  await expect(service.reorderCategories(adminActor, {
    householdId: "h1",
    categoryIds: ["c1", "c1"],
  })).rejects.toThrow("分类排序数据无效");
});
```

- [x] **Step 3: 运行测试并确认失败**

Run: `npm test -- tests/domain/default-categories.test.ts tests/server/categories.test.ts tests/server/locations.test.ts`

Expected: FAIL，提示对应模块不存在。

- [x] **Step 4: 实现默认分类和管理员写入规则**

`DEFAULT_CATEGORIES` 每项固定包含：

```ts
{
  key: "food",
  name: "食品饮料",
  icon: "food",
  color: "#E98A5F",
  defaultThresholdDays: 7,
}
```

其余分类必须使用设计文档中的中文名称；分类删除行为改为 `hidden: true`，系统分类拒绝物理删除。

`ensureDefaultCategories` 以 `householdId + systemKey` 作为唯一键，重复执行不会
新增记录。Task 4 的 `createHousehold` 在创建管理员成员后调用该函数；已有测试
家庭通过一次初始化调用补齐默认分类。

- [x] **Step 5: 实现位置服务**

位置记录包含 `id`、`householdId`、`name`、`sortOrder`、`hidden`。管理员可新增、排序、隐藏；普通成员只读。名称去除首尾空格后在同一家庭内不允许重复。

- [x] **Step 6: 运行测试**

Run: `npm test -- tests/domain/default-categories.test.ts tests/server/categories.test.ts tests/server/locations.test.ts`

Expected: 所有测试 PASS。

- [ ] **Step 7: 提交**

```bash
git add packages/domain packages/server/src/categories packages/server/src/locations packages/server/src/router.ts infra/cloudbase/indexes.json tests
git commit -m "feat: add household categories and locations"
```

---

### Task 6: 物品、日期事件、数量与软删除后端

**Files:**
- Create: `packages/contracts/src/items.ts`
- Create: `packages/server/src/items/validation.ts`
- Create: `packages/server/src/items/service.ts`
- Create: `packages/server/src/items/handlers.ts`
- Modify: `packages/server/src/repositories.ts`
- Modify: `packages/server/src/router.ts`
- Modify: `infra/cloudbase/indexes.json`
- Test: `tests/server/items.test.ts`
- Test: `tests/integration/item-flow.test.ts`

**Interfaces:**
- Consumes: `calculateEventStatus`、`changeQuantity`、`assertMember`。
- Produces:
  - `createItem(actor, CreateItemInput): Promise<ItemDetailDto>`
  - `updateItem(actor, UpdateItemInput): Promise<ItemDetailDto>`
  - `changeQuantity(actor, ChangeQuantityInput): Promise<ItemDetailDto>`
  - `processItem(actor, ProcessItemInput): Promise<ItemDetailDto>`
  - `deleteItem(actor, DeleteItemInput): Promise<void>`
  - `restoreItem(actor, RestoreItemInput): Promise<ItemDetailDto>`
  - `bulkMoveCategory(actor, BulkMoveCategoryInput): Promise<number>`
  - `listItems(actor, ItemListQuery): Promise<ItemListDto>`

- [x] **Step 1: 写物品校验失败测试**

```ts
it("到期日早于生产日期时拒绝保存", async () => {
  await expect(service.createItem(memberActor, {
    requestId: "req-1",
    householdId: "h1",
    name: "纯牛奶",
    categoryId: "food",
    quantity: 6,
    unit: "盒",
    events: [
      { type: "production", date: "2026-08-02", thresholdDays: 0 },
      { type: "expiry", date: "2026-08-01", thresholdDays: 7 },
    ],
  })).rejects.toThrow("到期日期不能早于生产日期");
});

it("相同 requestId 不重复创建物品", async () => {
  const first = await service.createItem(memberActor, validInput);
  const second = await service.createItem(memberActor, validInput);
  expect(second.id).toBe(first.id);
  expect(await repos.items.count()).toBe(1);
});
```

- [x] **Step 2: 写数量并发失败测试**

```ts
it("并发减数量不会降到零以下", async () => {
  await repos.items.insert({ id: "i1", householdId: "h1", quantity: 1, version: 1 });
  const results = await Promise.allSettled([
    service.changeQuantity(memberActor, { householdId: "h1", itemId: "i1", delta: -1, expectedVersion: 1 }),
    service.changeQuantity(memberActor, { householdId: "h1", itemId: "i1", delta: -1, expectedVersion: 1 }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect((await repos.items.findById("i1"))?.quantity).toBe(0);
});

it("只能在恢复窗口内恢复软删除物品", async () => {
  await repos.items.insert({
    id: "i2",
    householdId: "h1",
    deletedAt: "2026-07-29T00:00:00.000Z",
    recoverableUntil: "2026-08-28T00:00:00.000Z",
  });
  await expect(service.restoreItem(adminActor, {
    householdId: "h1",
    itemId: "i2",
  })).resolves.toMatchObject({ id: "i2", deletedAt: null });
});

it("只有管理员可批量移动分类", async () => {
  await expect(service.bulkMoveCategory(memberActor, {
    householdId: "h1",
    itemIds: ["i1", "i2"],
    targetCategoryId: "c2",
  })).rejects.toThrow("仅管理员可批量移动物品");
});
```

- [x] **Step 3: 运行测试并确认失败**

Run: `npm test -- tests/server/items.test.ts tests/integration/item-flow.test.ts`

Expected: FAIL，提示 `ItemService` 不存在。

- [x] **Step 4: 实现物品写入与事件状态**

`CreateItemInput` 固定包含 `requestId`、`householdId`、`name`、`categoryId`、`quantity`、`unit`、可选条码/品牌/规格/位置/备注/图片，以及至少一个 `events` 项。服务端保存前完成：

```ts
const statuses = input.events.map((event) => ({
  ...event,
  status: calculateEventStatus({
    today: clock.today(household.timezone),
    eventDate: event.date,
    thresholdDays: event.thresholdDays,
    processed: false,
  }),
}));
```

物品与事件写入必须由同一服务用例协调；任一步骤失败时不返回成功响应。

- [x] **Step 5: 实现数量乐观锁、处理与软删除**

数量更新条件必须同时匹配 `id`、`householdId`、`version` 和 `deletedAt: null`。成功后 `version + 1`；未匹配时返回 `CONFLICT`。数量归零时写入 `processedStatus: "used_up"`。

软删除写入：

```ts
{
  deletedAt: clock.now(),
  deletedBy: actor.userId,
  recoverableUntil: clock.addDays(clock.now(), 30),
}
```

`restoreItem` 必须校验当前时间不晚于 `recoverableUntil`，并将 `deletedAt`、
`deletedBy`、`recoverableUntil` 清空。`bulkMoveCategory` 必须校验目标分类属于
同一家庭，且所有 `itemIds` 均属于该家庭；任意一条不匹配时整批拒绝。

- [x] **Step 6: 添加列表索引与默认排序**

创建 `(householdId, deletedAt, nearestEventDate)`、`(householdId, categoryId, nearestEventDate)`、`(householdId, barcode)` 索引。列表默认按 `nearestEventDate asc, createdAt desc`。

- [x] **Step 7: 运行测试**

Run: `npm test -- tests/server/items.test.ts tests/integration/item-flow.test.ts`

Expected: 校验、幂等、并发、处理、软删除和排序测试全部 PASS。

- [ ] **Step 8: 提交**

```bash
git add packages/contracts/src/items.ts packages/server/src/items packages/server/src/repositories.ts packages/server/src/router.ts infra/cloudbase/indexes.json tests
git commit -m "feat: add item lifecycle backend"
```

---

### Task 7: 小程序会话、家庭切换与成员管理界面

**Files:**
- Create: `miniprogram/state/session.ts`
- Create: `miniprogram/services/session-service.ts`
- Create: `miniprogram/pages/onboarding/index.*`
- Create: `miniprogram/pages/households/index.*`
- Create: `miniprogram/pages/household-members/index.*`
- Create: `miniprogram/pages/household-settings/index.*`
- Create: `miniprogram/pages/category-settings/index.*`
- Create: `miniprogram/pages/location-settings/index.*`
- Create: `miniprogram/components/household-switcher/index.*`
- Modify: `miniprogram/app.ts`
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/pages/profile/index.*`
- Test: `tests/integration/session-state.test.ts`

**Interfaces:**
- Consumes: `session.bootstrap`、`household.create/list/invite.*`。
- Produces:
  - `sessionState.bootstrap()`
  - `sessionState.switchHousehold(householdId)`
  - `getCurrentHouseholdId(): string | null`

- [x] **Step 1: 写会话状态失败测试**

```ts
import { describe, expect, it } from "vitest";
import { createSessionState } from "../../miniprogram/state/session";

describe("sessionState", () => {
  it("优先恢复仍有权限的上次家庭", async () => {
    const storage = { get: () => "h2", set: () => undefined };
    const api = async () => ({ user: { id: "u1" }, households: [{ id: "h1" }, { id: "h2" }] });
    const state = createSessionState({ storage, api });
    await state.bootstrap();
    expect(state.currentHouseholdId).toBe("h2");
  });

  it("没有家庭时进入创建或加入流程", async () => {
    const state = createSessionState({
      storage: { get: () => null, set: () => undefined },
      api: async () => ({ user: { id: "u1" }, households: [] }),
    });
    await state.bootstrap();
    expect(state.needsOnboarding).toBe(true);
  });
});
```

- [x] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/integration/session-state.test.ts`

Expected: FAIL，提示 `createSessionState` 不存在。

- [x] **Step 3: 实现会话状态与应用启动**

```ts
App({
  async onLaunch() {
    wx.cloud.init({ traceUser: true });
    await sessionState.bootstrap();
    if (sessionState.needsOnboarding) {
      await wx.redirectTo({ url: "/pages/onboarding/index" });
    }
  },
});
```

`switchHousehold` 必须验证目标家庭存在于会话列表，成功后写入本地键 `currentHouseholdId` 并发布 `householdChanged` 事件。

- [x] **Step 4: 创建家庭切换与成员界面**

家庭切换器 WXML：

```xml
<view class="household-switcher" bindtap="openHouseholdPicker">
  <text class="icon">🏠</text>
  <text class="name">{{currentHousehold.name}}</text>
  <text class="arrow">⌄</text>
</view>
```

成员页根据当前用户角色隐藏或显示“邀请成员”“移除成员”；服务端仍必须执行真实权限校验。
家庭设置页仅向管理员展示，包含家庭名称、时区、每日提醒时间、转让管理员和
解散家庭。转让与解散使用二次确认弹窗，确认文案必须包含当前家庭名称。
分类设置页支持新建、重命名、图标、颜色、拖拽排序和显隐；系统分类不显示删除
按钮。位置设置页支持新建、重命名、排序和隐藏。普通成员进入这两个页面时只读。

- [x] **Step 5: 运行测试与微信开发者工具编译**

Run: `npm test -- tests/integration/session-state.test.ts`

Expected: 所有测试 PASS。

Run: `npm run typecheck && npm run build`

Expected: 退出码为 0；微信开发者工具无页面路径错误。

- [ ] **Step 6: 提交**

```bash
git add miniprogram tests/integration/session-state.test.ts
git commit -m "feat: add household session experience"
```

---

### Task 8: 提醒优先首页、物品列表、手动录入与详情

**Files:**
- Create: `miniprogram/components/status-summary/index.*`
- Create: `miniprogram/components/item-card/index.*`
- Create: `miniprogram/components/quantity-stepper/index.*`
- Create: `miniprogram/pages/item-form/index.*`
- Create: `miniprogram/pages/item-detail/index.*`
- Create: `miniprogram/pages/recycle-bin/index.*`
- Create: `miniprogram/services/item-service.ts`
- Modify: `miniprogram/pages/home/index.*`
- Modify: `miniprogram/pages/items/index.*`
- Modify: `miniprogram/app.json`
- Test: `tests/integration/item-form.test.ts`
- Test: `tests/integration/home-view-model.test.ts`

**Interfaces:**
- Consumes: `item.create/update/list/detail/quantity.change/process/delete/restore/bulkMoveCategory`。
- Produces:
  - `validateItemDraft(draft): ValidationResult`
  - `buildHomeViewModel(items, today): HomeViewModel`
  - 首页、物品、详情和手动录入完整路径。

- [x] **Step 1: 写首页分组与表单校验失败测试**

```ts
it("首页按过期、今日到期、临期顺序分组", () => {
  const model = buildHomeViewModel([
    { id: "near", status: "near_expiry", nearestEventDate: "2026-07-31" },
    { id: "expired", status: "expired", nearestEventDate: "2026-07-28" },
    { id: "today", status: "due_today", nearestEventDate: "2026-07-29" },
  ], "2026-07-29");
  expect(model.priorityItems.map((item) => item.id)).toEqual(["expired", "today", "near"]);
});

it("名称、分类或日期缺失时拒绝提交", () => {
  expect(validateItemDraft({ name: "", categoryId: "", events: [] })).toEqual({
    valid: false,
    errors: {
      name: "请输入物品名称",
      categoryId: "请选择分类",
      events: "请至少填写一个日期",
    },
  });
});
```

- [x] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/integration/item-form.test.ts tests/integration/home-view-model.test.ts`

Expected: FAIL，提示视图模型函数不存在。

- [x] **Step 3: 实现提醒优先首页**

首页必须呈现：

```xml
<status-summary
  expired="{{summary.expired}}"
  due-today="{{summary.dueToday}}"
  near-expiry="{{summary.nearExpiry}}"
/>
<view class="section-title">优先处理</view>
<item-card
  wx:for="{{priorityItems}}"
  wx:key="id"
  item="{{item}}"
  bind:quantitychange="onQuantityChange"
  bind:process="onProcess"
/>
<button class="scan-fab" bindtap="onScan">扫码录入</button>
```

刷新逻辑在页面 `onShow` 和 `householdChanged` 时执行；请求失败时保留上次成功数据并显示重试入口。

- [x] **Step 4: 实现物品列表、筛选和详情**

筛选参数固定为 `categoryId`、`locationId`、`status`、`keyword`；输入搜索词 300ms 防抖。详情页展示基础资料、日期事件、最后修改人和时间，并提供编辑、处理和软删除入口。

软删除记录通过“我的 → 最近删除”进入回收站。回收站只展示 30 天恢复窗口内的
记录，管理员可以恢复；过期记录不显示恢复按钮。物品页进入批量模式后，仅管理员
可以选择多条记录并移动到目标分类。
`ItemListQuery` 使用 `deleted: "active" | "recoverable"` 区分正常列表和回收站，
服务端禁止普通成员查询 `recoverable`。

- [x] **Step 5: 实现单页手动录入**

表单首屏只展开名称、分类、日期、数量和位置；品牌、规格、条码、图片和备注放入“更多信息”。保存按钮通过 `requestId` 防重复提交，保存成功后返回详情页。

- [ ] **Step 6: 运行测试、类型检查与真机页面走查**

Run: `npm test -- tests/integration/item-form.test.ts tests/integration/home-view-model.test.ts`

Expected: 所有测试 PASS。

Run: `npm run typecheck && npm run build`

Expected: 退出码为 0。

Manual: 在微信开发者工具中完成“首页 → 手动录入 → 详情 → 数量减一 → 已用完”的开发环境路径。

- [ ] **Step 7: 提交**

```bash
git add miniprogram tests/integration/item-form.test.ts tests/integration/home-view-model.test.ts
git commit -m "feat: add item management interface"
```

---

### Task 9: 扫码、商品资料复用与重复记录提示

**Files:**
- Create: `packages/contracts/src/catalog.ts`
- Create: `packages/server/src/catalog/service.ts`
- Create: `packages/server/src/catalog/handlers.ts`
- Create: `miniprogram/services/scanner.ts`
- Create: `miniprogram/pages/scan-result/index.*`
- Modify: `packages/server/src/router.ts`
- Modify: `miniprogram/pages/item-form/index.*`
- Modify: `infra/cloudbase/indexes.json`
- Test: `tests/server/catalog.test.ts`
- Test: `tests/integration/scanner.test.ts`

**Interfaces:**
- Consumes: `wx.scanCode`、当前 `householdId`、商品目录仓储。
- Produces:
  - `scanProductCode(): Promise<ScannedCode | null>`
  - `lookupProduct(actor, householdId, code): Promise<ProductMatchDto | null>`
  - `findMergeCandidate(actor, input): Promise<MergeCandidateDto | null>`

- [ ] **Step 1: 写扫码适配器失败测试**

```ts
it("只接受条形码和二维码结果", async () => {
  const scanner = createScanner({
    scanCode: async () => ({ result: "6901234567890", scanType: "EAN_13" }),
  });
  await expect(scanner.scanProductCode()).resolves.toEqual({
    value: "6901234567890",
    type: "barcode",
  });
});

it("用户取消扫码不显示系统错误", async () => {
  const scanner = createScanner({
    scanCode: async () => Promise.reject({ errMsg: "scanCode:fail cancel" }),
  });
  await expect(scanner.scanProductCode()).resolves.toBeNull();
});
```

- [ ] **Step 2: 写商品资料优先级失败测试**

```ts
it("家庭修正资料优先于公共商品资料", async () => {
  repos.catalog.seedPublic({ barcode: "6901", name: "牛奶" });
  repos.catalog.seedHousehold({ householdId: "h1", barcode: "6901", name: "儿童牛奶" });
  await expect(service.lookup(memberActor, "h1", "6901")).resolves.toMatchObject({
    name: "儿童牛奶",
    source: "household",
  });
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `npm test -- tests/server/catalog.test.ts tests/integration/scanner.test.ts`

Expected: FAIL，提示扫码或目录模块不存在。

- [ ] **Step 4: 实现扫码与商品匹配**

扫码调用固定为：

```ts
wx.scanCode({
  onlyFromCamera: true,
  scanType: ["barCode", "qrCode"],
});
```

匹配顺序固定为：家庭修正资料 → 公共商品资料 → 无匹配。无匹配时保留扫码值并打开手动录入，不阻断用户。

- [ ] **Step 5: 实现合并提示但不自动合并**

仅当 `householdId + barcode + expiryDate + locationId` 完全相同时返回候选记录。弹窗文案固定为：

```text
家里已有相同条码、到期日和位置的记录。要增加现有数量，还是保存为新记录？
```

按钮固定为“增加数量”“保存新记录”“取消”。

- [ ] **Step 6: 运行测试与真机扫码**

Run: `npm test -- tests/server/catalog.test.ts tests/integration/scanner.test.ts`

Expected: 所有测试 PASS。

Manual: 真机测试 EAN-13 条码、二维码、未知条码和取消扫码四条路径。

- [ ] **Step 7: 提交**

```bash
git add packages/contracts/src/catalog.ts packages/server/src/catalog miniprogram/services/scanner.ts miniprogram/pages/scan-result miniprogram/pages/item-form infra/cloudbase/indexes.json tests
git commit -m "feat: add barcode product entry"
```

---

### Task 10: 包装日期 OCR、候选解析与人工确认

**Files:**
- Create: `packages/domain/src/date-parser.ts`
- Create: `packages/contracts/src/ocr.ts`
- Create: `packages/server/src/ocr/service.ts`
- Create: `cloudfunctions/ocr-extract/index.js`
- Create: `cloudfunctions/ocr-extract/package.json`
- Create: `miniprogram/services/ocr-service.ts`
- Create: `miniprogram/pages/ocr-confirm/index.*`
- Modify: `miniprogram/pages/item-form/index.*`
- Test: `tests/domain/date-parser.test.ts`
- Test: `tests/server/ocr.test.ts`
- Test: `tests/fixtures/ocr/date-labels.json`

**Interfaces:**
- Consumes: 腾讯云通用印刷体 OCR 返回的文本行与置信度。
- Produces:
  - `parseDateCandidates(lines, referenceDate): DateCandidate[]`
  - `deriveExpiryDate(productionDate, shelfLife): string`
  - `extractPackageDates(actor, input): OcrResultDto`
  - OCR 确认页返回 `ConfirmedDateFields`。

- [ ] **Step 1: 写日期解析失败测试**

```ts
it.each([
  ["生产日期 2026/07/20", "production", "2026-07-20"],
  ["保质期至 2026-08-03", "expiry", "2026-08-03"],
  ["保质期 30 天", "shelf_life_days", 30],
])("解析 %s", (text, type, value) => {
  expect(parseDateCandidates([{ text, confidence: 0.98 }], "2026-07-29"))
    .toContainEqual(expect.objectContaining({ type, value }));
});

it("低置信度文本不自动选中", () => {
  const [candidate] = parseDateCandidates(
    [{ text: "2026-08-03", confidence: 0.61 }],
    "2026-07-29",
  );
  expect(candidate.selected).toBe(false);
});

it("生产日期和保质期天数可推算到期日", () => {
  expect(deriveExpiryDate("2026-07-20", { value: 30, unit: "day" }))
    .toBe("2026-08-19");
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/domain/date-parser.test.ts tests/server/ocr.test.ts`

Expected: FAIL，提示 OCR 模块不存在。

- [ ] **Step 3: 实现候选解析**

`DateCandidate` 固定字段：

```ts
export interface DateCandidate {
  id: string;
  type: "production" | "expiry" | "shelf_life_days" | "unknown";
  value: string | number;
  sourceText: string;
  confidence: number;
  selected: boolean;
}
```

解析器支持 `YYYY-MM-DD`、`YYYY/MM/DD`、`YYYY年M月D日` 和“保质期 N 天/月”；只有置信度 `>= 0.85` 且标签明确的候选允许默认选中。
`deriveExpiryDate` 仅在生产日期和保质期单位均明确时推算日期；“月”使用日历月
递增，并在目标月份缺少对应日期时取该月最后一天。

- [ ] **Step 4: 实现 OCR 云函数**

云函数只接受已上传到家庭临时目录的 `fileId`。处理顺序：

1. 校验调用者是家庭成员。
2. 获取短期下载地址。
3. 调用腾讯云 OCR。
4. 删除日志中的原始图片地址和密钥。
5. 返回文本行、候选日期和整体置信度。

OCR 密钥只从云函数环境变量 `TENCENTCLOUD_SECRET_ID`、`TENCENTCLOUD_SECRET_KEY` 读取；缺少变量时返回 `INTERNAL_ERROR`，不得回显变量值。

- [ ] **Step 5: 实现人工确认页**

确认页逐项展示候选原文、类型下拉框和日期输入框。用户必须点击“确认日期”才将结果写回物品表单；关闭页面或识别失败不改变表单原数据。

- [ ] **Step 6: 运行测试与 OCR 样本走查**

Run: `npm test -- tests/domain/date-parser.test.ts tests/server/ocr.test.ts`

Expected: 日期格式、低置信度、多个日期和保质期推算测试全部 PASS。

Manual: 使用食品、药品、数码包装各 5 张脱敏样本验证；所有自动填写项在保存前均可修改。

- [ ] **Step 7: 提交**

```bash
git add packages/domain/src/date-parser.ts packages/contracts/src/ocr.ts packages/server/src/ocr cloudfunctions/ocr-extract miniprogram/services/ocr-service.ts miniprogram/pages/ocr-confirm miniprogram/pages/item-form tests
git commit -m "feat: add package date ocr confirmation"
```

---

### Task 11: 提醒计划、提醒中心与处理同步

**Files:**
- Create: `packages/server/src/reminders/service.ts`
- Create: `packages/server/src/reminders/handlers.ts`
- Create: `packages/server/src/reminders/scheduler.ts`
- Create: `cloudfunctions/reminder-scheduler/index.js`
- Create: `cloudfunctions/reminder-scheduler/package.json`
- Create: `miniprogram/services/reminder-service.ts`
- Modify: `packages/server/src/router.ts`
- Modify: `miniprogram/pages/reminders/index.*`
- Modify: `miniprogram/pages/home/index.*`
- Modify: `infra/cloudbase/indexes.json`
- Test: `tests/server/reminders.test.ts`
- Test: `tests/integration/reminder-scheduler.test.ts`

**Interfaces:**
- Consumes: `buildReminderSchedule`、家庭时区、物品事件。
- Produces:
  - `generateDueReminders(runAt): Promise<GenerationSummary>`
  - `listReminders(actor, query): Promise<ReminderListDto>`
  - `closeItemReminders(itemId, processedBy): Promise<number>`

- [ ] **Step 1: 写调度幂等失败测试**

```ts
it("同一家庭、事件、日期只生成一条提醒", async () => {
  await scheduler.generateDueReminders("2026-07-29T01:00:00.000Z");
  await scheduler.generateDueReminders("2026-07-29T01:05:00.000Z");
  expect(await repos.reminders.countByUniqueKey(
    "h1:event-1:2026-07-29",
  )).toBe(1);
});

it("成员处理物品后关闭家庭内全部待处理提醒", async () => {
  await service.closeItemReminders(memberActor, {
    householdId: "h1",
    itemId: "i1",
  });
  expect(await repos.reminders.listOpenByItem("i1")).toEqual([]);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/server/reminders.test.ts tests/integration/reminder-scheduler.test.ts`

Expected: FAIL，提示提醒服务不存在。

- [ ] **Step 3: 实现提醒生成器**

提醒唯一键固定为：

```ts
`${householdId}:${itemEventId}:${localDate}`
```

调度器每小时运行一次，只为当前本地小时等于家庭 `reminderHour` 的家庭生成提醒。默认 `reminderHour = 9`；21:00 至次日 08:00 不派发非紧急外部消息，但提醒中心记录照常生成。

- [ ] **Step 4: 实现提醒中心**

提醒页分为“待处理”和“已处理”。列表项显示物品名、状态文案、事件日期、家庭和最近处理信息。点击物品进入详情；“标记已读”只影响阅读状态，不关闭业务提醒。

- [ ] **Step 5: 实现处理同步**

`item.process` 成功后必须调用 `closeItemReminders`，写入 `closedAt`、`closedBy` 和 `closeReason`。首页与提醒页在重新显示时刷新，确保其他成员处理后状态消失。

- [ ] **Step 6: 运行测试**

Run: `npm test -- tests/server/reminders.test.ts tests/integration/reminder-scheduler.test.ts`

Expected: 时区、临期、到期、过期频率、幂等和关闭测试全部 PASS。

- [ ] **Step 7: 提交**

```bash
git add packages/server/src/reminders cloudfunctions/reminder-scheduler miniprogram/services/reminder-service.ts miniprogram/pages/reminders miniprogram/pages/home infra/cloudbase/indexes.json tests
git commit -m "feat: add household reminder center"
```

---

### Task 12: 微信订阅消息授权与聚合派发

**Files:**
- Create: `packages/contracts/src/subscriptions.ts`
- Create: `packages/server/src/notifications/service.ts`
- Create: `packages/server/src/notifications/template.ts`
- Create: `cloudfunctions/notification-dispatch/index.js`
- Create: `cloudfunctions/notification-dispatch/package.json`
- Create: `miniprogram/services/subscription-service.ts`
- Create: `miniprogram/components/subscription-status/index.*`
- Modify: `miniprogram/pages/reminders/index.*`
- Modify: `miniprogram/pages/profile/index.*`
- Test: `tests/server/notifications.test.ts`
- Test: `tests/integration/subscription-service.test.ts`

**Interfaces:**
- Consumes: 微信订阅模板 ID 环境配置、未派发提醒、家庭有效成员。
- Produces:
  - `requestReminderSubscription(): Promise<SubscriptionChoice>`
  - `dispatchPendingNotifications(runAt): Promise<DispatchSummary>`
  - `NotificationDeliveryRecord`

- [ ] **Step 1: 写授权结果归一化失败测试**

```ts
it("将微信授权结果归一化", async () => {
  const service = createSubscriptionService({
    templateId: "tmpl-reminder",
    requestSubscribeMessage: async () => ({
      "tmpl-reminder": "accept",
      errMsg: "requestSubscribeMessage:ok",
    }),
  });
  await expect(service.request()).resolves.toEqual({
    templateId: "tmpl-reminder",
    status: "accepted",
  });
});

it("用户拒绝授权时不抛出业务错误", async () => {
  const service = createSubscriptionService({
    templateId: "tmpl-reminder",
    requestSubscribeMessage: async () => ({
      "tmpl-reminder": "reject",
      errMsg: "requestSubscribeMessage:ok",
    }),
  });
  await expect(service.request()).resolves.toMatchObject({ status: "rejected" });
});
```

- [ ] **Step 2: 写派发失败隔离测试**

```ts
it("一位成员发送失败不影响其他成员", async () => {
  sender.send
    .mockRejectedValueOnce(new Error("quota exhausted"))
    .mockResolvedValueOnce({ messageId: "m2" });
  const summary = await service.dispatchHousehold("h1", reminders);
  expect(summary).toEqual({ sent: 1, failed: 1, skipped: 0 });
  expect(await repos.deliveries.count()).toBe(2);
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `npm test -- tests/server/notifications.test.ts tests/integration/subscription-service.test.ts`

Expected: FAIL，提示订阅服务不存在。

- [ ] **Step 4: 实现订阅授权服务**

只在用户点击“开启微信提醒”或完成新增物品后主动选择开启时调用：

```ts
wx.requestSubscribeMessage({
  tmplIds: [REMINDER_TEMPLATE_ID],
});
```

禁止在页面加载时自动弹出。拒绝、永久拒绝和接口失败均返回可展示状态，不阻止提醒中心使用。

- [ ] **Step 5: 实现家庭聚合消息**

每个家庭每个提醒窗口向每位有效成员最多发送一条聚合消息。模板数据只包含：

- 家庭名称
- 待处理件数
- 最早到期日期
- 简短提示
- 小程序提醒页路径

每次发送写入 `notification_deliveries`，状态为 `sent`、`failed` 或 `skipped`，并记录微信错误码但不记录 access token。

- [ ] **Step 6: 运行测试与真机授权**

Run: `npm test -- tests/server/notifications.test.ts tests/integration/subscription-service.test.ts`

Expected: 授权归一化、成员隔离、聚合、去重和失败记录测试全部 PASS。

Manual: 使用体验版测试接受、拒绝、关闭授权和额度不足四种状态；提醒中心均保持可用。

- [ ] **Step 7: 提交**

```bash
git add packages/contracts/src/subscriptions.ts packages/server/src/notifications cloudfunctions/notification-dispatch miniprogram/services/subscription-service.ts miniprogram/components/subscription-status miniprogram/pages tests
git commit -m "feat: add wechat reminder delivery"
```

---

### Task 13: 私有媒体、账户权利、操作日志与数据访问加固

**Files:**
- Create: `packages/server/src/media/service.ts`
- Create: `packages/server/src/audit/service.ts`
- Create: `packages/server/src/account/service.ts`
- Create: `packages/server/src/security/redaction.ts`
- Create: `miniprogram/services/media-service.ts`
- Create: `miniprogram/pages/privacy-center/index.*`
- Modify: `miniprogram/pages/item-form/index.*`
- Modify: `miniprogram/pages/item-detail/index.*`
- Modify: `packages/server/src/router.ts`
- Modify: `packages/server/src/items/service.ts`
- Modify: `packages/server/src/households/service.ts`
- Modify: `infra/cloudbase/database.rules.json`
- Test: `tests/server/media.test.ts`
- Test: `tests/server/audit.test.ts`
- Test: `tests/server/account.test.ts`
- Test: `tests/server/security.test.ts`

**Interfaces:**
- Consumes: 家庭成员权限、CloudBase 存储、关键写操作。
- Produces:
  - `createUploadPath(actor, input): string`
  - `getAuthorizedTempUrl(actor, input): Promise<string>`
  - `recordAuditEvent(event): Promise<void>`
  - `exportAccountData(actor): Promise<AccountExportDto>`
  - `deleteAccount(actor): Promise<void>`
  - `redactForLog(value): unknown`

- [ ] **Step 1: 写媒体越权失败测试**

```ts
it("非家庭成员不能取得凭证图片临时地址", async () => {
  await expect(mediaService.getAuthorizedTempUrl(outsideActor, {
    householdId: "h1",
    fileId: "cloud://env/households/h1/items/i1/invoice.jpg",
  })).rejects.toThrow("无权访问该家庭");
});

it("文件路径必须属于目标家庭", async () => {
  await expect(mediaService.getAuthorizedTempUrl(memberActor, {
    householdId: "h1",
    fileId: "cloud://env/households/h2/items/i2/invoice.jpg",
  })).rejects.toThrow("文件不属于当前家庭");
});
```

- [ ] **Step 2: 写日志脱敏失败测试**

```ts
it("日志移除密钥和临时地址", () => {
  expect(redactForLog({
    secretKey: "secret",
    tempFileURL: "https://example.test/private",
    itemId: "i1",
  })).toEqual({
    secretKey: "[REDACTED]",
    tempFileURL: "[REDACTED]",
    itemId: "i1",
  });
});

it("唯一管理员删除账号前必须转让或解散家庭", async () => {
  await expect(accountService.deleteAccount(adminActor))
    .rejects.toThrow("请先转让或解散你管理的家庭");
});

it("导出数据不包含其他成员个人资料", async () => {
  const result = await accountService.exportAccountData(memberActor);
  expect(result).toHaveProperty("profile");
  expect(result).toHaveProperty("memberships");
  expect(JSON.stringify(result)).not.toContain("other-user-openid");
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `npm test -- tests/server/media.test.ts tests/server/audit.test.ts tests/server/account.test.ts tests/server/security.test.ts`

Expected: FAIL，提示媒体或安全模块不存在。

- [ ] **Step 4: 实现家庭隔离媒体路径**

上传路径固定为：

```ts
`households/${householdId}/items/${itemId}/${mediaType}/${fileName}`
```

允许的 `mediaType` 仅为 `product`、`invoice`、`warranty`、`ocr-temp`。临时地址返回前同时校验成员关系和路径前缀。
物品表单允许分别选择商品图片、发票和保修凭证；上传失败时保留表单草稿并显示
“重新上传”。详情页每次打开凭证前调用 `media.tempUrl`，不得缓存长期访问地址。

- [ ] **Step 5: 实现关键操作审计**

以下动作必须记录 `actorUserId`、`householdId`、`targetType`、`targetId`、`action`、`createdAt`：

- 移除成员
- 修改角色
- 创建、编辑、处理、删除或恢复物品
- 批量移动分类
- 修改提醒规则
- 获取发票或保修凭证临时地址

审计摘要不得包含凭证图片内容、微信 access token 或任何云密钥。

- [ ] **Step 6: 实现数据导出与账号注销**

“隐私与账号”页面提供导出和注销入口。导出内容只包含当前用户资料、成员关系、
本人创建或最后修改的物品记录，以及本人操作日志；不得包含其他成员的 openid、
手机号或个人资料。

注销前检查用户是否为任何有效家庭的唯一管理员；若是，拒绝并引导转让或解散。
通过检查后，将用户状态更新为 `deleted`、移除平台标识、停用全部成员关系，并把
保留审计记录中的 `actorUserId` 替换为不可逆匿名标识。

- [ ] **Step 7: 运行安全与账户测试**

Run: `npm test -- tests/server/media.test.ts tests/server/audit.test.ts tests/server/account.test.ts tests/server/security.test.ts`

Expected: 越权、路径穿越、日志脱敏、审计、导出与注销测试全部 PASS。

- [ ] **Step 8: 提交**

```bash
git add packages/server/src/media packages/server/src/audit packages/server/src/account packages/server/src/security miniprogram/services/media-service.ts miniprogram/pages/privacy-center miniprogram/pages/item-form miniprogram/pages/item-detail infra/cloudbase/database.rules.json tests
git commit -m "feat: secure media and add account controls"
```

---

### Task 14: 全链路验收、隐私合规与发布准备

**Files:**
- Create: `tests/e2e/core-journeys.md`
- Create: `tests/fixtures/items/boundary-dates.json`
- Create: `docs/release/privacy-checklist.md`
- Create: `docs/release/cloudbase-setup.md`
- Create: `docs/release/wechat-release-checklist.md`
- Create: `.env.example`
- Create: `README.md`
- Modify: `package.json`
- Test: `tests/integration/date-boundaries.test.ts`
- Test: `tests/integration/access-control.test.ts`

**Interfaces:**
- Consumes: Tasks 1–13 的全部交付物。
- Produces: 可重复的 CI 验证命令、真机验收清单、云环境配置说明和微信提审清单。

- [ ] **Step 1: 写日期边界与越权回归测试**

```ts
it.each([
  ["2024-02-28", "2024-02-29", "near_expiry"],
  ["2024-02-29", "2024-02-29", "due_today"],
  ["2026-12-31", "2027-01-01", "near_expiry"],
])("在 %s 计算 %s", (today, eventDate, expected) => {
  expect(calculateEventStatus({
    today,
    eventDate,
    thresholdDays: 1,
    processed: false,
  })).toBe(expected);
});

it("修改 householdId 不能读取其他家庭", async () => {
  await expect(api.call(outsideActor, {
    action: "item.list",
    payload: { householdId: "h1" },
  })).resolves.toEqual({
    ok: false,
    error: { code: "FORBIDDEN", message: "无权访问该家庭" },
  });
});
```

- [ ] **Step 2: 添加统一验证命令**

`package.json` 增加：

```json
{
  "scripts": {
    "verify": "npm run typecheck && npm test && npm run build"
  }
}
```

Run: `npm run verify`

Expected: 类型检查、全部测试和构建均退出码为 0。

- [ ] **Step 3: 编写核心旅程真机清单**

`tests/e2e/core-journeys.md` 必须逐条记录操作和预期：

1. 用户 A 创建家庭，用户 B 通过 24 小时邀请加入。
2. 用户 A 扫码、OCR、确认日期并保存牛奶。
3. 用户 B 在物品列表看到相同记录并减少数量。
4. 用户 A 首页同步显示新数量。
5. 定时任务生成临期提醒，两人提醒中心均可见。
6. 用户 B 标记已用完，两人待处理提醒同步关闭。
7. 用户 B 尝试移除成员，服务端返回无权限。
8. 用户退出订阅消息后，提醒中心继续工作。

- [ ] **Step 4: 编写云环境配置文档**

`cloudbase-setup.md` 明确开发和生产环境必须分离，并列出：

- 集合与索引导入顺序
- 云函数环境变量名称
- OCR 费用告警
- 定时触发器表达式
- 数据库默认拒绝规则
- 云存储目录策略
- 备份与恢复演练步骤

文档只能写变量名，禁止写真实密钥。

- [ ] **Step 5: 完成隐私与提审清单**

隐私清单逐项确认：

- 相机仅在扫码或 OCR 时申请。
- 相册仅在用户选择图片时申请。
- 微信订阅消息仅由用户主动触发。
- 隐私政策说明家庭共享、图片、提醒和日志用途。
- 账号注销和数据导出入口可访问。
- 小程序类目与“家庭物品记录和提醒工具”一致。
- AppID `wxb8bd2ab35c41a7cd` 已单独完成备案。

- [ ] **Step 6: 完整验证**

Run: `npm run verify`

Expected: 全部通过。

Manual: 在 iOS 与 Android 微信真机分别执行 `tests/e2e/core-journeys.md`，记录设备、微信版本、执行时间和结果；所有步骤必须通过才允许提审。

- [ ] **Step 7: 提交**

```bash
git add package.json README.md .env.example tests docs/release
git commit -m "docs: add release verification and privacy checks"
```

---

## 实施顺序与评审门

1. Tasks 1–3 建立工程、领域规则和稳定协议。
2. Tasks 4–6 完成可独立测试的家庭与物品后端。
3. Tasks 7–8 完成无需扫码也能使用的核心小程序。
4. Tasks 9–10 增加扫码与 OCR 提效能力。
5. Tasks 11–12 完成提醒中心和微信外部触达。
6. Task 13 完成媒体权限与审计加固。
7. Task 14 完成全链路验收和提审准备。

每个任务完成后必须先运行该任务指定测试和 `npm run typecheck`，再进行独立评审。评审未通过不得进入下一任务；Git 提交必须获得用户明确确认。
