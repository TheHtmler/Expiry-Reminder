# 到期咯：AI Coding 协作规范

本文件适用于在仓库中工作的所有 AI Coding 工具和工程师。

## 开始前必须阅读

按顺序完整阅读：

1. `README.md`
2. `docs/superpowers/specs/2026-07-29-expiry-reminder-design.md`
3. `docs/superpowers/plans/2026-07-29-expiry-reminder-mvp.md`
4. `docs/handoff/ai-implementation-guide.md`
5. `docs/handoff/implementation-progress.md`

不得跳过设计确认或自行扩大首期范围。

## 固定项目约束

- 产品名称：到期咯
- 工程名称：`expiry-reminder`
- 微信小程序 AppID：`wxb8bd2ab35c41a7cd`
- 首期平台：微信原生小程序
- 主要语言：TypeScript
- 后端：腾讯云开发 CloudBase
- 核心优先级：提醒可靠性 > 录入速度 > 家庭共享
- 用户可加入多个家庭
- 家庭角色只有 `admin` 和 `member`
- 家庭内所有有效成员接收提醒
- 每次录入创建独立物品记录
- OCR 结果必须由用户确认

## 语言与命名

- 与项目所有者沟通时使用中文。
- 用户文案、代码注释和项目文档使用中文。
- 文件名、目录名、代码标识符和数据库字段使用英文。
- 避免拼音变量名和含义不清的缩写。

## 架构边界

- `packages/domain` 只能包含无微信、CloudBase 和网络依赖的纯领域规则。
- `packages/contracts` 保存 action、DTO 和错误码。
- `packages/server` 保存权限、业务用例、仓储接口与 CloudBase 适配器。
- `miniprogram/pages` 负责展示与交互，不直接操作业务数据库。
- `miniprogram/services` 统一封装云函数、扫码、拍照和订阅消息调用。
- `cloudfunctions` 只保存可部署入口和必要依赖。
- 所有服务端写操作必须校验当前用户是否为目标家庭的有效成员。

不要为了方便在小程序客户端直接写 `items`、`households`、
`household_members`、`reminders` 或凭证文件权限。

## 开发流程

- 严格按照实施计划 Task 1 至 Task 14 顺序工作。
- 一次只实施一个任务，不并行修改相互依赖的核心接口。
- 先写失败测试，再写实现。
- 每个任务结束时运行该任务指定测试、`npm run typecheck` 和适用的构建命令。
- 测试失败时先定位原因，不删除或弱化测试来换取通过。
- 不提交 TODO、占位实现、模拟成功响应或跳过验证的代码。
- 修改跨任务接口时同步更新协议、调用方、测试和实施文档。
- 每次实现或调整功能后，更新 `docs/handoff/implementation-progress.md`，记录实际行为、
  修改文件、验证结果、未完成事项和下一步，不依赖聊天记录保存项目状态。

## 数据与安全

- 不得提交 AppSecret、OCR 密钥、CloudBase 密钥、上传私钥或 access token。
- 不得修改或提交 `project.private.config.json`。
- `project.config.json` 是可提交的共享微信项目配置。
- 真实环境值放入本地环境或云函数环境变量。
- 日志必须脱敏，不记录临时凭证地址、完整密钥或其他家庭成员的个人资料。
- 发票、保修凭证和 OCR 临时图片必须按 `householdId` 隔离。
- 删除使用 30 天可恢复软删除，禁止直接物理删除业务记录。

## Git 规范

- 开始任务前检查 `git status`，保留并识别项目所有者的未提交修改。
- 不使用 `git reset --hard`、`git checkout --` 或其他破坏性命令。
- 提交只包含当前任务相关文件。
- 提交信息使用英文 Conventional Commits。
- `git commit`、`git push` 和向 `main` 合并前取得项目所有者明确确认。

## 完成定义

一个任务只有同时满足以下条件才算完成：

- 计划内全部步骤执行完毕。
- 指定测试通过。
- 类型检查通过。
- 构建通过。
- 无敏感信息进入 Git。
- 实际变更与设计一致。
- 文档和任务勾选状态同步更新。
- 实施进度记录已同步本次功能、验证结果和剩余事项。
