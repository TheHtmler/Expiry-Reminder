import { beforeEach, describe, expect, it } from "vitest";
import {
  HouseholdService,
  SessionService,
} from "../../packages/server/src/households/service";
import { createMemoryRepositories } from "../support/memory-repositories";

const adminActor = { userId: "u1", openId: "o1" };
const memberActor = { userId: "member", openId: "om" };

describe("HouseholdService", () => {
  const now = new Date("2026-07-29T00:00:00.000Z");
  let repos: ReturnType<typeof createMemoryRepositories>;
  let service: HouseholdService;

  beforeEach(async () => {
    repos = createMemoryRepositories();
    service = new HouseholdService(repos, {
      now: () => now,
      createId: (() => {
        let id = 0;
        return (prefix) => `${prefix}-${++id}`;
      })(),
    });
    await repos.households.insert({
      id: "h1",
      name: "测试家庭",
      timezone: "Asia/Shanghai",
      reminderHour: 9,
      createdBy: "u1",
      createdAt: now.toISOString(),
      dissolvedAt: null,
    });
    await repos.members.insert({
      householdId: "h1",
      userId: "u1",
      role: "admin",
      status: "active",
      joinedAt: now.toISOString(),
    });
    await repos.members.insert({
      householdId: "h1",
      userId: "member",
      role: "member",
      status: "active",
      joinedAt: now.toISOString(),
    });
    await repos.members.insert({
      householdId: "h1",
      userId: "u2",
      role: "member",
      status: "active",
      joinedAt: now.toISOString(),
    });
  });

  it("创建者自动成为管理员", async () => {
    const household = await service.createHousehold(adminActor, {
      name: "我们家",
      timezone: "Asia/Shanghai",
    });

    await expect(repos.members.find(household.id, "u1")).resolves.toMatchObject({
      role: "admin",
      status: "active",
    });
  });

  it("普通成员不能移除成员", async () => {
    await expect(
      service.removeMember(memberActor, {
        householdId: "h1",
        userId: "u2",
      }),
    ).rejects.toThrow("仅管理员可移除成员");
  });

  it("管理员转让后角色原子互换", async () => {
    await service.transferAdmin(adminActor, {
      householdId: "h1",
      targetUserId: "u2",
    });

    await expect(repos.members.find("h1", "u1")).resolves.toMatchObject({
      role: "member",
    });
    await expect(repos.members.find("h1", "u2")).resolves.toMatchObject({
      role: "admin",
    });
  });

  it("拒绝无效时区和提醒时间", async () => {
    await expect(
      service.updateSettings(adminActor, {
        householdId: "h1",
        timezone: "Invalid/Timezone",
        reminderHour: 21,
      }),
    ).rejects.toThrow("家庭设置无效");
  });
});

describe("SessionService", () => {
  it("没有有效家庭时自动创建我的家且重复初始化不重复创建", async () => {
    const repos = createMemoryRepositories();
    const now = new Date("2026-07-29T00:00:00.000Z");
    let id = 0;
    const service = new SessionService(repos, {
      now: () => now,
      createId: (prefix) => `${prefix}-${++id}`,
    });

    const first = await service.bootstrap("new-user-openid");
    const second = await service.bootstrap("new-user-openid");

    expect(first.households).toHaveLength(1);
    const defaultHousehold = first.households[0];
    if (!defaultHousehold) throw new Error("默认家庭未创建");
    expect(defaultHousehold).toMatchObject({
      name: "我的家",
      timezone: "Asia/Shanghai",
      reminderHour: 9,
      role: "admin",
    });
    expect(second.households).toEqual(first.households);
    await expect(
      repos.members.find(defaultHousehold.id, first.user.id),
    ).resolves.toMatchObject({ role: "admin", status: "active" });
    await expect(
      repos.categories.listByHousehold(defaultHousehold.id),
    ).resolves.toHaveLength(8);
  });
});
