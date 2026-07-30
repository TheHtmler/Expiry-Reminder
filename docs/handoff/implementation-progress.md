# 到期咯实施进度记录

本文档是跨会话实施记录。每次实现或调整功能后都必须更新，确保后续开发者无需依赖
聊天记录即可确认已经完成的行为、验证结果和剩余工作。

## 更新规则

每次功能变更至少记录：

1. 当前任务与状态。
2. 实际实现的行为和关键边界。
3. 主要修改文件。
4. 执行过的测试、类型检查和构建命令及结果。
5. 尚未完成的步骤、人工配置和已知风险。
6. 下一项允许执行的工作。

计划复选框仍以
`docs/superpowers/plans/2026-07-29-expiry-reminder-mvp.md` 为准；本文档用于补充实际
实现细节和交接上下文，不替代设计或实施计划。

## 当前状态

- 当前分支：`main`。
- Task 1「工程骨架与可重复构建」已完成并提交。
- Task 2「日期、状态、数量与提醒领域规则」已完成实现和验证，提交暂缓。
- Task 3「云函数协议、错误码与统一客户端」已完成实现和验证，提交暂缓。
- Task 4「用户会话、家庭、成员与邀请」已完成实现和验证，提交暂缓。
- Task 5「默认分类、自定义分类与存放位置」已完成实现和验证，提交暂缓。
- Task 6「物品、日期事件、数量与软删除后端」已完成实现和验证，提交暂缓。
- Task 7「小程序会话、家庭切换与成员管理界面」已完成代码、自动验证和微信开发者
  工具本地编译，开发环境数据联调仍待数据库初始化，提交暂缓。
- Task 8「提醒优先首页、物品列表、手动录入与详情」已完成代码步骤和自动验证，等待
  数据库初始化后的开发环境全路径走查，提交暂缓。
- 手动录入已改为极简快录（名称+到期日+可选商品图），新建保存后返回上一页；完整
  凭证媒体鉴权仍属 Task 14，提交暂缓。
- Task 9「扫码、商品资料复用与重复记录提示」代码与自动验证完成，等待重新部署
  `api` 云函数与真机扫码验收，提交暂缓。
- Task 10 至 Task 14 尚未开始。
- 主界面已切换为叶绿健康主题（强调色 `#2F8F62`），交互保持简约，提交暂缓。
- 项目所有者已明确要求暂不提交并继续开发；各任务仍须顺序实施、独立验证和记录，
  对应提交步骤保持未勾选，后续提交前必须再次取得明确确认。
- `project.config.json` 存在微信开发者工具自动回写的未提交设置，处理后续任务时必须
  保留并与业务变更区分。

## 实施记录

### 2026-07-29：Task 1 工程骨架与可重复构建

状态：已提交，提交为 `574a0a3 chore: initialize wechat miniprogram project`。

已实现：

- 创建微信原生小程序的首页、物品、提醒和我的四个首期页面。
- 配置正式 AppID、`miniprogramRoot` 和 `cloudfunctionRoot`。
- 建立 TypeScript、Vitest 和 esbuild 工程配置。
- 建立共享领域模块、协议模块和云函数构建脚本。
- 生成小程序可使用的共享模块构建产物。

验证结果：

- `npm test -- tests/integration/project-config.test.ts`：2 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- npm 安全审计：0 个已知漏洞。

### 2026-07-29：Task 2 日期、状态、数量与提醒领域规则

状态：实现与验证完成，尚未提交。

已实现：

- `calculateEventStatus` 根据自然日差值计算 `normal`、`near_expiry`、
  `due_today`、`expired` 和 `processed`。
- `changeQuantity` 拒绝非有限或小于零的结果，数量归零时返回已用完标记。
- `buildReminderSchedule` 使用 UTC 自然日生成临期首日、到期日、过期后第 1、2、3
  天以及之后每 3 天的提醒日期，并对结果去重排序。
- 领域统一入口导出上述三个接口，小程序共享领域构建产物已同步生成。

主要文件：

- `packages/domain/src/date-status.ts`
- `packages/domain/src/quantity.ts`
- `packages/domain/src/reminder-policy.ts`
- `packages/domain/src/index.ts`
- `tests/domain/date-status.test.ts`
- `tests/domain/quantity.test.ts`
- `tests/domain/reminder-policy.test.ts`
- `miniprogram/generated/domain.js`

验证结果：

- 首次运行日期状态测试时按预期因模块不存在失败。
- 首次运行数量和提醒策略测试时按预期因模块不存在失败。
- `npm test -- tests/domain`：3 个测试文件、8 个测试通过。
- `npm test`：4 个测试文件、10 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `git diff --check`：通过。

未完成事项：

- Task 2 的实施计划 Step 7 尚未勾选。
- 等待项目所有者确认后，以 `feat: add expiry domain rules` 提交 Task 2 相关变更。
- 当前任务不需要微信或腾讯云控制台人工配置。

下一步：开始 Task 3「云函数协议、错误码与统一客户端」。

### 2026-07-29：Task 3 云函数协议、错误码与统一客户端

状态：实现与验证完成，按项目所有者要求暂不提交。

已实现：

- 固定首期 `API_ACTIONS` 列表并导出 `ApiAction` 联合类型。
- 定义 `ApiErrorCode`、`ApiRequest`、`ApiResponse` 和 `ApiEnvelope`。
- 服务端提供统一的 `ok` 与 `fail` 返回结构。
- 小程序 `callApi` 统一封装 `wx.cloud.callFunction`、请求幂等标识和业务错误展开。
- 页面与后续服务可以通过稳定业务 action 调用云端，不需要直接访问业务数据库。

主要文件：

- `packages/contracts/src/actions.ts`
- `packages/contracts/src/errors.ts`
- `packages/contracts/src/dto.ts`
- `packages/contracts/src/index.ts`
- `packages/server/src/result.ts`
- `miniprogram/services/cloud-client.ts`
- `tests/contracts/actions.test.ts`
- `tests/server/result.test.ts`

验证结果：

- 首次运行协议测试时按预期因 action 和结果模块不存在失败。
- `npm test -- tests/contracts tests/server/result.test.ts`：2 个测试文件、2 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。

未完成事项：

- Task 2 Step 7 与 Task 3 Step 6 的提交均按项目所有者要求暂缓。
- 当前任务不需要微信或腾讯云控制台人工配置。

下一步：开始 Task 4「用户会话、家庭、成员与邀请」。

### 2026-07-29：Task 4 用户会话、家庭、成员与邀请

状态：实现与验证完成，按项目所有者要求暂不提交。

已实现：

- 微信 OpenID 会话初始化、用户创建和有效家庭列表加载。
- 创建家庭时在事务内同步创建管理员成员，默认时区由输入指定，提醒时间为 09:00。
- 管理员创建 24 小时一次性邀请；原始令牌只返回一次，数据库仅保存 SHA-256 摘要。
- 接受邀请、移除成员、管理员转让、家庭设置和解散家庭服务。
- 所有家庭管理写操作校验有效成员与管理员角色；成员移除后立即失去访问权限。
- 管理员转让和家庭解散使用仓储事务，失败时整体回滚。
- CloudBase 仓储适配、默认拒绝数据库规则、集合与唯一索引配置。
- 统一云函数路由和可部署 `api` 入口；SDK 延迟加载，构建产物可在未安装 SDK 的
  本地验证环境中检查导出。

主要文件：

- `packages/server/src/context.ts`
- `packages/server/src/repositories.ts`
- `packages/server/src/households/service.ts`
- `packages/server/src/households/handlers.ts`
- `packages/server/src/router.ts`
- `packages/server/src/index.ts`
- `cloudfunctions/api/index.js`
- `cloudfunctions/api/package.json`
- `infra/cloudbase/collections.json`
- `infra/cloudbase/indexes.json`
- `infra/cloudbase/database.rules.json`
- `tests/support/memory-repositories.ts`
- `tests/server/households.test.ts`
- `tests/integration/household-flow.test.ts`

验证结果：

- 首次运行家庭测试时按预期因 `HouseholdService` 不存在失败。
- 家庭专项测试：2 个测试文件、5 个测试通过。
- `npm test`：8 个测试文件、17 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- Node 加载 `cloudfunctions/api/index.js` 并确认导出 `main`：通过。
- CloudBase 与云函数 JSON 配置解析：通过。
- `wx-server-sdk@3.0.1` 已从 npm 注册表确认存在。

未完成事项：

- Task 2 Step 7、Task 3 Step 6 和 Task 4 Step 8 的提交均暂缓。
- 尚未向真实 CloudBase 环境导入集合、索引和规则，也未部署云函数。
- 当前没有写入真实环境 ID 或密钥。

下一步：开始 Task 5「默认分类、自定义分类与存放位置」。

### 2026-07-29：Task 5 默认分类、自定义分类与存放位置

状态：实现与验证完成，按项目所有者要求暂不提交。

已实现：

- 固定食品饮料、药品保健、美妆个护、数码产品、家用电器、家庭耗材、证件与服务、
  其他八个默认分类及默认提醒阈值。
- 创建家庭时在同一事务内幂等初始化八个默认分类，任一步失败时家庭、管理员成员和
  分类整体回滚。
- 有效成员可读取分类和位置；只有管理员可新增、编辑、排序或隐藏。
- 分类排序必须完整包含全部可见分类且不能重复；系统分类没有物理删除接口。
- 位置名称去除首尾空格后在同一家庭内唯一，支持排序值和显隐设置。
- 分类与位置 action 已接入统一云函数路由，CloudBase 集合和索引配置已同步。

主要文件：

- `packages/domain/src/default-categories.ts`
- `packages/server/src/categories/service.ts`
- `packages/server/src/categories/handlers.ts`
- `packages/server/src/locations/service.ts`
- `packages/server/src/locations/handlers.ts`
- `packages/server/src/repositories.ts`
- `packages/server/src/router.ts`
- `packages/server/src/index.ts`
- `infra/cloudbase/collections.json`
- `infra/cloudbase/indexes.json`
- `tests/domain/default-categories.test.ts`
- `tests/server/categories.test.ts`
- `tests/server/locations.test.ts`

验证结果：

- 首次运行测试时默认分类、分类服务和位置服务均按预期因模块不存在失败。
- Task 5 专项测试：3 个测试文件、7 个测试通过。
- `npm test`：11 个测试文件、24 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- 云函数构建产物加载及 `main` 导出检查：通过。

未完成事项：

- Task 2 至 Task 5 的提交步骤均按项目所有者要求暂缓。
- 尚未在真实 CloudBase 环境导入新增的分类与位置集合和索引。

下一步：开始 Task 6「物品、日期事件、数量与软删除后端」。

### 2026-07-29：Task 6 物品、日期事件、数量与软删除后端

状态：实现与验证完成，按项目所有者要求暂不提交。

已实现：

- 物品、日期事件、列表和写操作 DTO。
- 创建物品时校验有效成员、分类和位置归属，并在同一事务内写入物品、事件和幂等键。
- 相同 `householdId + requestId` 重试返回同一物品，不重复创建。
- 生产日期晚于到期日期时拒绝保存；真正的到期、保修、维保、续费和自定义事件
  决定物品状态与最近到期排序，历史生产日期不会错误覆盖到期状态。
- 数量更新使用 `id + householdId + version + deletedAt` 乐观锁；并发减最后一件时
  只有一次成功，数量不会小于零。
- 数量归零时在事务内标记已用完并关闭事件；重新增加数量时重新计算日期状态。
- 普通成员可新增、编辑、调整数量和处理物品；软删除、恢复和批量移动分类仅管理员。
- 软删除保留 30 天恢复窗口，正常列表默认按最近事件日期升序、创建时间降序排列。
- 物品 action、CloudBase 集合与三组列表索引已接入生产云函数入口。

主要文件：

- `packages/contracts/src/items.ts`
- `packages/server/src/items/validation.ts`
- `packages/server/src/items/service.ts`
- `packages/server/src/items/handlers.ts`
- `packages/server/src/repositories.ts`
- `packages/server/src/router.ts`
- `infra/cloudbase/collections.json`
- `infra/cloudbase/indexes.json`
- `tests/server/items.test.ts`
- `tests/integration/item-flow.test.ts`

验证结果：

- 首次运行物品测试时按预期因 `ItemService` 不存在失败。
- Task 6 专项测试：2 个测试文件、9 个测试通过。
- `npm test`：13 个测试文件、33 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- 云函数入口加载与 CloudBase JSON 配置解析：通过。

未完成事项：

- Task 2 至 Task 6 的提交步骤均按项目所有者要求暂缓。
- 尚未在真实 CloudBase 环境导入物品集合和索引，也未进行真实并发压测。

下一步：开始 Task 7「小程序会话、家庭切换与成员管理界面」。

### 2026-07-29 至 2026-07-30：Task 7 小程序会话、家庭切换与成员管理界面

状态：代码与自动验证完成，微信开发者工具编译检查受本机安全设置阻塞，尚未完成。

已实现：

- 可注入测试的会话状态容器，以及微信本地存储支持的运行时单例。
- 启动时初始化 CloudBase、恢复上次仍有权限的家庭，无家庭时进入创建或加入流程。
- 切换家庭时校验会话权限、持久化选择并发布 `householdChanged` 事件。
- 创建或加入家庭、家庭列表与切换、成员列表和一次性邀请页面。
- 家庭设置页面支持名称、时区、00:00 至 23:00 提醒时间、管理员转让和解散家庭；
  高风险操作二次确认文案包含家庭名称。
- 分类与位置页面支持管理员新增、显隐和排序，普通成员只读，系统分类无删除操作。
- “我的”页面提供家庭、成员、设置、分类和位置入口。
- 为真实成员页面补充最小 `household.member.list` action；仅返回有效成员 ID、角色、
  加入时间和是否本人，不返回 OpenID 或其他个人资料。
- 页面只通过 `miniprogram/services` 调用云函数，不直接访问业务数据库。

主要文件：

- `miniprogram/state/session.ts`
- `miniprogram/services/session-service.ts`
- `miniprogram/pages/onboarding/index.*`
- `miniprogram/pages/households/index.*`
- `miniprogram/pages/household-members/index.*`
- `miniprogram/pages/household-settings/index.*`
- `miniprogram/pages/category-settings/index.*`
- `miniprogram/pages/location-settings/index.*`
- `miniprogram/components/household-switcher/index.*`
- `miniprogram/app.ts`
- `miniprogram/app.json`
- `miniprogram/pages/profile/index.*`
- `tests/integration/session-state.test.ts`

验证结果：

- 首次运行会话测试时按预期因 `createSessionState` 不存在失败。
- 会话专项测试：1 个测试文件、3 个测试通过。
- `npm test`：16 个测试文件、39 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- 新增页面 `.ts/.json/.wxml/.wxss` 完整性和页面 JSON 解析：通过。
- 微信开发者工具 CLI 已定位为
  `/Applications/wechatwebdevtools.app/Contents/MacOS/cli`；2026-07-30 已确认服务端口
  开启并使用端口 `38526` 成功打开项目，但真实预览上传仍待项目所有者明确授权。
- 启动时出现的“登录失败，请稍后重试”最初定位为 CloudBase 尚未配置：当时本地环境
  变量 `CLOUDBASE_ENV_ID` 为空，`project.private.config.json` 也没有云环境信息，且
  `api` 尚未部署；2026-07-30 已完成环境绑定和 `api` 部署。
- 启动错误现在会区分云环境或云函数未就绪，并提示先创建或选择 CloudBase 环境、部署
  `api` 云函数；错误提取和分类新增 2 个自动测试，并确保普通网络错误不会被误判为配置错误。
- `cloudfunctions/api` 已安装并锁定官方最新版 `wx-server-sdk@4.0.2`。升级后 npm 审计
  从 2 个严重、6 个高危、4 个中危降至 0 个严重、5 个高危、1 个中危；剩余问题来自
  官方 SDK 的 `@cloudbase/node-sdk`、旧版 `axios` 和 lodash 辅助包，非强制审计修复
  无法消除，强制修复会降级到 `wx-server-sdk@2.5.3`，未执行。
- 2026-07-30 已创建免费 CloudBase 开发环境 `cloud1-d6ga4b3yb70ea3b1c`，客户端启动
  通过 `CLOUD_ENV_ID` 显式选择该环境，避免依赖开发者工具的默认环境选择；此 ID 仅
  用于开发，生产发布前必须替换为独立生产环境。
- 微信开发者工具服务端口已开启，CLI 使用现有端口 `38526` 成功打开项目并查询到该
  CloudBase 环境。环境最初没有云函数；首次部署创建 `api` 后因平台仍处于 `Creating`
  状态而未能立即更新代码，待状态变为 `Active` 后重试成功，云端依赖安装完成。
- 部署后再次查询确认 `api` 状态为 `Active`。真实预览编译会向腾讯/微信上传当前代码，
  尚未获得项目所有者对该次外发的明确授权，因此未执行预览上传。

未完成事项：

- 获得项目所有者明确授权后执行微信开发者工具预览上传，确认无页面路径、WXML 和
  TypeScript 编译错误。
- 在 CloudBase 控制台按 `infra/cloudbase` 配置创建集合、索引和默认拒绝规则；现有
  微信开发者工具 CLI 只能管理环境和云函数，不能导入数据库配置。集合创建完成前，
  `api` 虽已部署，但真实登录和页面云端交互仍不可用。
- 继续评估 `wx-server-sdk@4.0.2` 剩余的 5 个高危和 1 个中危传递依赖告警，等待
  官方 SDK 更新或形成明确风险接受记录。
- Task 7 实施计划 Step 5 和 Step 6 保持未勾选。
- Task 2 至 Task 7 的提交步骤均按项目所有者要求暂缓。
- 已连接真实 CloudBase 开发环境，但数据库资源尚未初始化，因此页面云端交互仍需
  完成集合、索引和规则配置后联调。

### 2026-07-30：Task 8 提醒优先首页、物品列表、手动录入与详情

状态：代码步骤与自动验证完成，等待 CloudBase 数据库初始化后的开发环境全路径走查。

已实现：

- 首页不再是单行骨架，显示当前家庭、已过期/今日到期/即将到期汇总和按优先级排序的
  待处理物品；在 `onShow` 和家庭切换时刷新，失败时保留现有数据并提供重试。
- 物品页不再是空容器，支持名称、品牌或条码 300ms 防抖搜索，以及状态、分类和位置
  筛选；管理员可批量选择物品并移动分类，也可进入最近删除。
- 新增状态汇总、物品卡片和稳定尺寸的数量步进器组件；首页和列表可直接调整数量、
  标记处理并处理乐观锁冲突提示。
- 新增单页手动录入和编辑：名称、分类、日期、数量与位置优先展示，生产日期、品牌、
  规格、条码和备注折叠展示；使用稳定 `requestId` 防止重复创建。
- 表单拒绝缺少名称、分类或日期，以及到期日期早于生产日期；编辑时保留非生产/到期
  类型的既有日期事件，避免未来 OCR、保修或维保事件丢失。
- 新增物品详情，展示日期事件、资料和最后更新时间，支持编辑、数量调整、处理和管理
  员软删除；新增 30 天回收站和管理员恢复操作。
- “我的”页面仅为管理员显示最近删除入口；所有页面继续通过 `item-service` 调用统一
  云函数，不直接访问业务数据库。

主要文件：

- `miniprogram/pages/home/index.*`
- `miniprogram/pages/home/view-model.ts`
- `miniprogram/pages/items/index.*`
- `miniprogram/pages/item-form/index.*`
- `miniprogram/pages/item-detail/index.*`
- `miniprogram/pages/recycle-bin/index.*`
- `miniprogram/components/status-summary/index.*`
- `miniprogram/components/item-card/index.*`
- `miniprogram/components/quantity-stepper/index.*`
- `miniprogram/services/item-service.ts`
- `tests/integration/home-view-model.test.ts`
- `tests/integration/item-form.test.ts`

验证结果：

- 两组测试首次运行按预期因视图模型和校验模块不存在而失败。
- Task 8 专项测试：2 个测试文件、3 个测试通过。
- `npm test`：18 个测试文件、42 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- 新页面 `.ts/.json/.wxml/.wxss` 完整性、全部页面和组件 JSON 解析：通过。
- 微信开发者工具本地编译缓存已更新，缓存记录中没有编译错误；未执行会上传代码的
  预览命令。

未完成事项：

- 在 CloudBase 控制台创建集合、索引和数据库规则后，执行“首页 → 手动录入 → 详情 →
  数量减一 → 已用完”开发环境走查。
- Task 8 实施计划 Step 6 和 Step 7 保持未勾选；提交继续按项目所有者要求暂缓。
- 提醒页仍是空容器，其完整提醒中心属于 Task 11，不能在 Task 8 提前模拟提醒数据。

下一步：先初始化 CloudBase 数据库并完成 Task 8 开发环境走查；通过后开始 Task 9
「扫码、商品资料复用与重复记录提示」。

### 2026-07-30：MVP 主要界面 UI 完整化

状态：界面代码和自动检查完成，等待微信开发者工具模拟器视觉走查。

背景：项目所有者明确要求优先把主要界面绘制成完整产品形态。本次只调整既定 MVP
范围内的界面与交互状态，不伪造云端成功响应，也不提前实现 Task 9 至 Task 13 的业务
逻辑。提醒页先提供真实空态和待处理/已处理视图结构，提醒数据与订阅消息仍分别归属
Task 11 和 Task 12。

已实现：

- 重建全局视觉规范：画布、内容表面、状态色、输入框、按钮、列表行、页面标题、空态、
  错误态和安全区间距统一，卡片圆角不超过 8px。
- 首页突出产品名称、当前家庭、到期汇总和优先处理列表；物品页补齐标题、筛选、批量
  操作和完整空态；提醒页新增待处理/已处理分段视图；“我的”按家庭空间和物品设置分组。
- 创建/加入家庭、家庭切换、成员列表、家庭设置、分类、位置、录入、详情和回收站均
  重做信息层级和控件布局，不再使用裸表单或无边界列表。
- 分类编辑改为图标按钮和颜色色板；录入表单按必要信息、数量位置和补充资料分区并使用
  底部固定保存栏；详情页新增状态、数量面板、日期时间线和资料列表。
- 新增界面结构回归测试，保证四个主标签不再退化为空 WXML，并检查提醒双视图和核心
  操作入口。

验证结果：

- `npm test`：19 个测试文件、45 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- 页面和组件 JSON 解析、WXML 非空检查、`git diff --check`：通过。
- 微信开发者工具项目已关闭后重新打开，但 CLI 未生成新的模拟器日志或编译缓存；尝试
  仅截取开发者工具窗口时被 macOS 辅助功能权限阻塞并已终止。未执行会上传代码的预览。
- 项目所有者在微信开发者工具真实编译时发现物品页将 `wx:else` 与 `wx:for` 同时挂在
  自定义组件上会导致条件分支无法配对；现已改为显式 `block wx:if / wx:else` 分支，并
  对全部 WXML 扫描同类写法。等待重新编译确认修复结果。

未完成事项：

- 在微信开发者工具点击“编译”，逐页检查首页、物品、提醒、我的、录入、详情和设置页
  的文本溢出、控件重叠、滚动与安全区。
- CloudBase 数据库仍未初始化，云端数据路径走查继续保持未完成。

### 2026-07-30：首次进入自动创建默认家庭

状态：服务端逻辑与专项验证完成，等待重新部署云函数和开发环境走查，暂不提交。

背景：项目所有者确认首次进入不应停留在空家庭状态，而应直接拥有默认家庭。设计规范
和实施计划已同步调整；创建或加入家庭页面继续用于后续新增家庭和接受邀请。

已实现：

- `SessionService.bootstrap` 检测到用户没有任何有效家庭时，自动创建“我的家”。
- 默认家庭使用 `Asia/Shanghai` 时区和 09:00 提醒时间，当前用户自动成为管理员。
- 家庭、管理员成员和八个默认分类在同一事务内创建；事务内再次检查有效家庭，避免
  重复初始化创建多个默认家庭。
- 已有有效家庭的用户只加载原家庭，不额外创建“我的家”；客户端无家庭引导保留为
  异常数据兜底。

验证结果：

- 新增失败测试并确认旧实现返回空家庭，随后实现默认家庭规则。
- 家庭服务、家庭邀请流程和客户端会话状态专项测试：3 个测试文件、9 个测试通过。
- `npm test`：19 个测试文件、46 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，已刷新共享模块和云函数本地产物。
- `git diff --check`：通过。

未完成事项：

- 重新构建并部署 `api` 云函数后，在微信开发者工具使用无有效家庭账号验证首页显示
  “我的家”。

### 2026-07-30：核心流程修复与主界面重构

状态：代码实现与本地验证完成，按项目所有者要求不执行 UI 自动检测，暂不提交。

背景：项目所有者反馈主要流程无法完成且 UI 未达到可用产品标准。审计确认两个根因：
CloudBase 免费环境只有环境和云函数，数据库集合尚未初始化；同时小程序首次启动存在
会话竞态，首页可能早于 `session.bootstrap` 完成并直接返回，初始化完成后又没有通知
页面重新加载。

流程修复：

- 会话状态合并并发初始化请求，默认家庭就绪后发布家庭变更事件；首页、物品页、我的、
  录入页和详情页主动等待会话就绪，不再依赖 `App.onLaunch` 的异步执行时序。
- 首页、物品页和详情页新增页面内失败状态及重新连接/加载入口；无家庭时显示明确错误，
  不再静默返回空页面。
- 录入页将分类与位置加载状态独立管理，加载失败可重试，分类未准备好时禁止保存；编辑
  物品在选项恢复后重新加载原物品资料。
- 云函数识别集合不存在错误后，幂等创建九个必需集合并重试当前请求；已存在集合不会
  中断初始化。正式环境的唯一索引和默认拒绝规则仍以 `infra/cloudbase` 配置为准。
- 云函数路由不再吞掉未知基础设施错误，入口记录脱敏错误信息后统一返回服务错误；客户
  端识别集合缺失和异常响应并显示可理解的错误文案。

界面重构：

- 使用 Lucide 官方开源图标生成本地 PNG 资源，为四个主标签补齐默认与选中态图标，
  替换“我的”页面中的中文单字图标和首页/物品页的文本加号。
- 首页改为品牌与家庭切换、今日概览、深色状态摘要、优先处理列表和明确空态操作的层级；
  首次没有物品时可直接添加，不再只剩悬浮按钮。
- 物品页重做搜索框、筛选区、空态和新增入口；批量移动在分类为空时不再访问不存在的
  数组项。
- 提醒页补齐统一图标空态和返回物品列表入口；提醒记录业务仍按实施计划归属 Task 11，
  本轮未伪造提醒数据。
- “我的”页面统一家庭标识与设置图标；录入页从多张浮动卡片改为全宽信息区，明确必填、
  选填和固定保存状态。
- 新增 `scripts/render-tab-icon.swift`，可从仓库内 SVG 稳定重新生成透明背景导航 PNG。

验证结果：

- 新增会话竞态与 CloudBase 空环境失败测试，确认旧实现按预期失败后完成修复。
- `npm test`：20 个测试文件、49 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，已刷新共享模块和 `api` 云函数本地产物。
- TabBar JSON 与全部图标资源引用检查：通过。
- WXML 同节点 `wx:else`/`wx:for` 扫描、`git diff --check`：通过。
- 项目所有者明确要求直接写代码，不执行浏览器、模拟器截图或 UI 自动检测；临时安装的
  `miniprogram-automator` 已移除，未留下依赖和审计告警。

未完成事项：

- 将当前本地产物重新部署到 `cloud1-d6ga4b3yb70ea3b1c` 后，真实环境才会获得默认家庭、
  自动集合初始化和本轮流程修复。
- 正式环境仍需按 `infra/cloudbase/indexes.json` 和 `database.rules.json` 配置唯一索引与
  数据库默认拒绝规则。

### 2026-07-30：绿色健康主题与交互统一

状态：UI 样式与图标资源已落地，按项目所有者要求暂不提交；不执行截图或模拟器自动检测。

背景：项目所有者要求完善 UI 与交互，主题色偏绿色健康色，配色舒适、交互简约，
直接采用推荐方案，不另开设计稿或多套方案。

已实现：

- 全局主题从珊瑚橙切换为叶绿健康色：主色 `#2F8F62`，深绿文字/强调 `#246B4A`，
  画布 `#F2F6F3`，中性灰带绿偏色；过期红与今日到期琥珀保留语义区分。
- `app.json` 导航栏、TabBar 选中色与背景同步；重新生成 TabBar 与 UI 图标为绿色描边。
- 首页品牌标、状态摘要、FAB、物品卡、数量步进、家庭切换器、提醒分段、我的页菜单、
  录入/详情/设置页控件统一圆角、边框和按下反馈。
- 分类颜色选项首色改为叶绿；开关与批量选择复选框使用主题绿。
- 实施计划中的 TabBar `selectedColor` 示例同步更新。

主要文件：

- `miniprogram/app.wxss`、`miniprogram/app.json`
- `miniprogram/pages/**/*.wxss`、部分 `*.wxml`
- `miniprogram/components/**/*.wxss`
- `miniprogram/assets/tabbar/*`、`miniprogram/assets/ui/*`
- `docs/superpowers/plans/2026-07-29-expiry-reminder-mvp.md`

验证结果：

- 仓库内珊瑚橙硬编码扫描：已清除。
- 图标资源已用 `scripts/render-tab-icon.swift` 按 `#2F8F62` / `#8A968E` / `#3D6B54` 重渲。
- 本轮为纯视觉与交互样式调整，未改业务逻辑；未额外跑全量测试。

未完成事项：

- 在微信开发者工具重新编译后目视确认四 Tab、录入、详情和设置页观感。
- 云函数部署与数据库初始化仍按上一记录待办执行。

### 2026-07-30：界面对齐与布局统一修复

状态：布局与对齐问题已统一修复，按项目所有者要求暂不提交。

背景：项目所有者反馈界面存在多处未对齐、错乱问题，要求统一修改。

已修复：

- 修正 `.page-heading`：标题与副标题改为纵向堆叠，不再被 `space-between` 甩到左右两侧。
- 全局重置微信 `button` 默认边距/行高，主次按钮与文本按钮统一 flex 垂直居中。
- 输入框与 picker 统一高度 88rpx；picker 文案与箭头左右分离并对齐。
- 首页/物品页 FAB 底 padding 加大，避免遮挡列表；批量模式隐藏 FAB 并抬高列表底边距。
- 物品卡「处理」与数量步进器统一 56rpx 高；列表行左侧 `min-width:0` + 省略号防挤压。
- 分类/位置设置去掉 `size="mini"`，改用统一 `icon-button`；成员移除、回收站恢复按钮对齐。
- 分段控件抽到全局，提醒页与引导页高度一致；详情页资料行与危险操作按钮重置。

主要文件：

- `miniprogram/app.wxss`
- `miniprogram/pages/**/*.{wxml,wxss}`
- `miniprogram/components/**/*.wxss`

验证结果：

- 本轮为布局与样式修复，未改业务逻辑。
- 需在微信开发者工具重新编译后目视确认各页对齐。

### 2026-07-30：按钮形状与排版修复

状态：按钮样式体系已重做，按项目所有者要求暂不提交。

背景：项目所有者反馈各按钮显示排版与形状均有问题。根因是微信原生
`button` 的边框/圆角由 `::after` 控制，且自定义组件隔离导致全局重置失效；
同时 `display:flex` + 非法 `font-weight:650/750` 在部分机型上造成高度和形状异常。

已修复：

- 新增共享 `miniprogram/styles/buttons.wxss`：统一主/次/文本/空态/FAB/分段/
  行内小按钮样式，并正确清除 `button::after` 边框与圆角。
- FAB、分段、数量步进、处理、编辑、移除、恢复、图标选择等改为 `view` +
  `hover-class`，避免原生 button 默认宽高和圆角干扰。
- 仅保留需要 `loading/disabled` 的提交类操作为原生 `button`。
- 物品卡与数量步进器组件内 `@import` 共享按钮样式，解决样式隔离问题。
- 文字垂直居中改用固定 `height` + 匹配 `line-height`。

主要文件：

- `miniprogram/styles/buttons.wxss`
- `miniprogram/app.wxss`
- `miniprogram/pages/**/*.{wxml,wxss}`
- `miniprogram/components/item-card/*`
- `miniprogram/components/quantity-stepper/*`

验证结果：

- 本轮为样式与交互承载结构调整，未改业务逻辑。
- 需在微信开发者工具重新编译后目视确认按钮圆角、高度和文字居中。

### 2026-07-30：修复 buttons.wxss 导入编译失败

状态：已修复，暂不提交。

问题：微信开发者工具预览报 `./styles/buttons.wxss` 与组件内相对 `@import`
路径找不到，导致 WXSS 编译失败。

处理：

- 将按钮样式直接内联进 `miniprogram/app.wxss`，取消 `@import`。
- 物品卡与数量步进器组件改为本地声明所需按钮类，不再跨目录导入。
- 删除 `miniprogram/styles/buttons.wxss`。

### 2026-07-30：极简录入与商品图上传

状态：代码与自动验证完成，暂不提交。

背景：项目所有者反馈录入流程偏复杂，确认采用「极简快录」，并要求支持上传商品图。

已实现：

- 录入首屏仅保留名称、到期日、可选商品图和轻量分类选择；分类默认第一个可见分类。
- 数量、单位、位置、生产日期、品牌、规格、条码、备注收进「更多选项」。
- 新建保存成功后 Toast「已添加」并 `navigateBack`；编辑保存仍进入详情。
- 新增 `media-path` / `media-service`：选图后上传到
  `households/{householdId}/drafts/{requestId}/product/...`，写入 `imageFileId`。
- 图片上传失败提示可重试，不阻断文字保存；详情页展示已有商品图。
- 未实现发票/保修/`media.tempUrl` 完整鉴权（仍属 Task 14）。

主要文件：

- `miniprogram/pages/item-form/index.*`
- `miniprogram/pages/item-detail/index.wxml`、`index.wxss`
- `miniprogram/services/media-service.ts`（路径构建已并入此文件，避免独立模块未注册）
- `tests/integration/media-path.test.ts`

验证结果：

- `npm test -- tests/integration/item-form.test.ts tests/integration/media-path.test.ts`：
  2 个文件、4 个测试通过。
- `npm run typecheck`：通过。

未完成事项：

- 真机/开发者工具验证选图授权、云存储上传与详情图显示。
- CloudBase 存储权限需允许当前环境上传到 `households/` 前缀。

### 2026-07-30：修复添加物品白屏

状态：已修复，暂不提交。

问题：打开录入页后白屏无内容。

处理：

- 去掉 WXML 中 `focus="{{!itemId}}"` 与 `categories[index].name` 等易崩溃表达式。
- 标题、分类/位置文案、保存按钮状态改为 JS 计算字段再绑定。
- 加载失败在页面内显示错误与重试，不再只 Toast。
- 媒体服务去掉可选链，降低旧基础库脚本风险。
- 根因补充：分类 `picker` 绑定了 `value=-1`，微信渲染会白屏；改为
  `categoryPickerIndex >= 0`，日期 picker 使用合法默认值，选项就绪后再挂载 picker。

下一步：继续 Task 9 或按项目所有者指定的下一功能项推进。

### 2026-07-30：首页顶部栏（搜索 / 扫码）

状态：代码完成，暂不提交。

背景：项目所有者希望首页上方有顶部栏，提供搜索、扫码等全局入口。

已实现：

- 首页在品牌与家庭切换下方增加顶部操作栏：搜索框 + 扫码按钮。
- 搜索确认后经 `state/session` 跨 Tab 传递关键词，并 `switchTab` 到物品页执行筛选。
- 扫码调用 `wx.scanCode`，将条码带入录入页预填；自动展开「更多选项」以便核对条码。
- 扫码暂不做商品库匹配（完整能力仍属 Task 9）。
- 新增扫码图标资源：`scan-line.svg` / `scan-line.png`。
- 修复：独立 `state/navigation` 模块在开发者工具中未注册导致报错，已并入已加载的
  `state/session`。

主要文件：

- `miniprogram/pages/home/index.*`
- `miniprogram/pages/items/index.ts`
- `miniprogram/pages/item-form/index.ts`
- `miniprogram/state/session.ts`
- `miniprogram/assets/icons/scan-line.svg`
- `miniprogram/assets/ui/scan-line.png`

验证结果：

- 需在微信开发者工具重新编译后验证：搜索跳转物品页、扫码打开录入并预填条码。
- 真机需授权摄像头后验证扫码。

未完成事项：

- Task 9 扫码完整链路已实现，见下方记录。

### 2026-07-30：Task 9 扫码、商品资料复用与重复记录提示

状态：代码与自动验证完成，暂不提交。

已实现：

- 协议：`catalog.lookup`、`catalog.findMergeCandidate` 与商品/合并 DTO。
- 服务端：`product_catalog` 仓储与集合；匹配顺序为家庭修正 → 公共资料 → 无匹配。
- 保存带条码物品时写入家庭修正资料，供下次扫码复用名称/品牌/规格/图片等。
- 小程序：`scanner`（仅相机、条码/二维码）、`scan-result` 匹配页、录入页预填。
- 保存时若条码+到期日+位置完全相同，弹出“增加数量 / 保存新记录 / 取消”。
- 首页扫码入口接入完整流程：扫码后直接匹配并进入录入页预填。
- 因微信开发者工具对新建 `scan-result` 页面偶发“找不到 wxml”，已暂时不在
  `app.json` 注册该页；页面文件仍保留，匹配逻辑改由首页直达录入页完成。

主要文件：

- `packages/contracts/src/catalog.ts`、`actions.ts`
- `packages/server/src/catalog/*`、`repositories.ts`、`router.ts`、`index.ts`
- `miniprogram/services/scanner.ts`、`catalog-service.ts`
- `miniprogram/pages/scan-result/*`、`item-form/index.ts`、`home/index.ts`
- `tests/server/catalog.test.ts`、`tests/integration/scanner.test.ts`
- `infra/cloudbase/indexes.json`

验证结果：

- `npm test -- tests/server/catalog.test.ts tests/integration/scanner.test.ts tests/server/items.test.ts tests/server/cloud-setup.test.ts tests/contracts/actions.test.ts`：20 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。

未完成事项：

- 需重新部署 `api` 云函数，并确保 CloudBase 存在 `product_catalog` 集合/索引。
- 公共商品库当前无预置数据；首次扫未知条码只保留条码，保存后同家庭再次扫码可复用。
- 真机验收：EAN-13、二维码、未知条码、取消扫码、合并提示三条路径。

下一步：按项目所有者确认后提交，或继续 Task 10 OCR。

### 2026-07-30：商品图显示比例

状态：已调整，暂不提交。

- 录入预览与详情图由 `aspectFill` 固定裁切改为 `aspectFit` 等比完整显示，避免拉伸/裁切变形。

### 2026-07-30：物品更新弹窗（按属性）

状态：已调整，暂不提交。

- 列表数量只读；入口为「编辑」+「处理」。
- 弃用系统 ActionSheet；因开发者工具对新组件路径识别异常，处理弹层并入已有
  `item-card`，详情页内联同一套 UI：
  1. 剩余数量：步进调整后点「保存数量」（归零自动不再提醒）
  2. 提醒：确认后「不再提醒这件物品」

### 2026-07-30：加载态与布局体验

状态：已调整，暂不提交。

- 首页/物品页默认 `loading=true`，首屏显示加载态；有数据刷新时显示顶部刷新条。
- 物品页分类/位置与列表并行请求；导航栏 loading 同步。
- 主按钮/空态/错误重试改为 flex 居中；隐藏滚动条；页面 `min-height` 改为
  `100%` 减轻多余滚动。

### 2026-07-30：列表加载可见性与物品缩略图

状态：已调整，暂不提交。

已实现：

- 首屏无数据时使用 `wx.showLoading` + 页面内旋转加载态 + 顶部「正在加载…」条；
  有数据刷新时顶部显示「正在刷新…」。
- 去掉依赖 `icon type="waiting"`（部分环境不可见），改为 CSS spinner。
- 物品卡片展示 `imageFileId` 缩略图；无图时显示占位「物」。

主要文件：

- `miniprogram/pages/home/index.{wxml,ts}`
- `miniprogram/pages/items/index.{wxml,ts}`
- `miniprogram/components/item-card/index.{wxml,wxss}`
- `miniprogram/app.wxss`

验证结果：本地改动完成；需微信开发者工具重新编译后目视确认加载态与缩略图。

下一步：继续 Task 10，或按所有者确认后提交未提交变更。

### 2026-07-30：每日提醒时间改为 24 小时整点

状态：已调整，暂不提交。

- 原设计限制 08:00–20:00；现改为 00:00–23:00 整点可选。
- 服务端校验同步为 `0–23`；设置页选择器展示 `00:00` 至 `23:00`。

主要文件：

- `packages/server/src/households/service.ts`
- `miniprogram/pages/household-settings/index.{ts,wxml}`
- `tests/server/households.test.ts`
- `docs/superpowers/specs/2026-07-29-expiry-reminder-design.md`

验证：运行家庭设置相关测试与 typecheck/build。
