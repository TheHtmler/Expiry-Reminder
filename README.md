# 到期咯（Expiry Reminder）

面向家庭成员的物品到期与维保提醒微信小程序。

用户可以通过扫码、包装日期 OCR 或手动录入，记录食品、药品、数码产品、家电及
其他家庭物品的关键日期；系统根据家庭规则计算临期、今日到期和已过期状态，并通过
小程序提醒中心与微信订阅消息提醒家庭成员。

## 项目状态

当前处于**设计与实施规划完成、业务代码尚未开始**的阶段。

- 产品与技术设计：已确认并提交
- 首期实施计划：已完成，共 14 个任务
- 微信小程序账号：已创建
- 小程序名称：到期咯
- AppID：`wxb8bd2ab35c41a7cd`
- 默认分支：`main`
- 下一步：从实施计划的 Task 1 开始初始化工程骨架

## 核心功能

- 一个用户可以创建或加入多个家庭
- 管理员与普通成员两级权限
- 家庭成员共享物品、数量、状态和提醒
- 条形码、二维码扫码录入
- 包装日期 OCR 识别与人工确认
- 手动录入与相同商品资料复用
- 默认分类、自定义分类、排序和显隐
- 正常、临期、今日到期、已过期和已处理状态
- 食品过期、保修到期和周期维保等统一日期事件
- 轻量数量增减与软删除恢复
- 小程序提醒中心与微信订阅消息

## 技术方向

- 微信原生小程序
- TypeScript
- 腾讯云开发 CloudBase
- 文档型数据库、云函数与云存储
- 腾讯云 OCR
- Vitest、esbuild

客户端页面不直接写数据库。所有业务写操作通过云函数完成，并由服务端校验
`householdId`、成员状态和角色权限。

## 文档导航

- [产品与技术设计](docs/superpowers/specs/2026-07-29-expiry-reminder-design.md)
- [首期实施计划](docs/superpowers/plans/2026-07-29-expiry-reminder-mvp.md)
- [AI Coding 实施交接指南](docs/handoff/ai-implementation-guide.md)
- [安全说明](SECURITY.md)
- [仓库级 AI 协作规范](AGENTS.md)

开始编码前必须完整阅读设计、实施计划和 `AGENTS.md`。

## 本地准备

当前仓库尚未安装依赖。实施 Task 1 时将创建 `package.json`、TypeScript 配置、
测试配置、小程序目录和云函数构建脚本。

开发前需要准备：

1. Node.js 与 npm。
2. 微信开发者工具。
3. 可访问 AppID `wxb8bd2ab35c41a7cd` 的开发者微信号。
4. CloudBase 开发环境。
5. OCR 与微信订阅消息的测试配置。

环境变量名称见 [.env.example](.env.example)。真实密钥不得写入仓库、聊天记录或
小程序客户端。

## 实施方式

严格按照实施计划的 Task 1 至 Task 14 顺序推进。每个任务都必须完成：

1. 写失败测试。
2. 运行测试并确认失败原因符合预期。
3. 完成最小正确实现。
4. 运行任务测试、类型检查与构建。
5. 完成代码评审。
6. 获得项目所有者确认后提交。

不要在首期加入电商、收费会员、完整库存流水、动态自定义字段或 App 客户端。

## Git 约定

- `main` 保持可验证状态。
- 功能分支使用清晰的英文名称。
- 提交信息使用 Conventional Commits，例如：
  - `feat: add household membership backend`
  - `test: cover expiry date boundaries`
  - `docs: update cloudbase setup`
- 未经项目所有者确认，不直接向 `main` 推送业务实现。
