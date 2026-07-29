import { beforeEach, describe, expect, it } from "vitest";
import { ItemService } from "../../packages/server/src/items/service";
import { createMemoryRepositories } from "../support/memory-repositories";

const memberActor = { userId: "member", openId: "om" };
const adminActor = { userId: "admin", openId: "oa" };

describe("ItemService", () => {
  const now = new Date("2026-07-29T00:00:00.000Z");
  let repos: ReturnType<typeof createMemoryRepositories>;
  let service: ItemService;

  beforeEach(async () => {
    repos = createMemoryRepositories();
    service = new ItemService(repos, { now: () => now });
    await repos.households.insert({
      id: "h1",
      name: "测试家庭",
      timezone: "Asia/Shanghai",
      reminderHour: 9,
      createdBy: "admin",
      createdAt: now.toISOString(),
      dissolvedAt: null,
    });
    for (const [userId, role] of [
      ["admin", "admin"],
      ["member", "member"],
    ] as const) {
      await repos.members.insert({
        householdId: "h1",
        userId,
        role,
        status: "active",
        joinedAt: now.toISOString(),
      });
    }
    await repos.categories.insert({
      id: "food",
      householdId: "h1",
      source: "system",
      systemKey: "food",
      name: "食品饮料",
      icon: "food",
      color: "#E98A5F",
      defaultThresholdDays: 7,
      sortOrder: 0,
      hidden: false,
      status: "active",
    });
    await repos.categories.insert({
      id: "c2",
      householdId: "h1",
      source: "custom",
      name: "备用分类",
      icon: "other",
      color: "#747B74",
      defaultThresholdDays: 7,
      sortOrder: 1,
      hidden: false,
      status: "active",
    });
  });

  const validInput = {
    requestId: "req-1",
    householdId: "h1",
    name: "纯牛奶",
    categoryId: "food",
    quantity: 1,
    unit: "盒",
    events: [{ type: "expiry" as const, date: "2026-08-01", thresholdDays: 7 }],
  };

  it("到期日早于生产日期时拒绝保存", async () => {
    await expect(
      service.createItem(memberActor, {
        ...validInput,
        events: [
          { type: "production", date: "2026-08-02", thresholdDays: 0 },
          { type: "expiry", date: "2026-08-01", thresholdDays: 7 },
        ],
      }),
    ).rejects.toThrow("到期日期不能早于生产日期");
  });

  it("相同 requestId 不重复创建物品", async () => {
    const first = await service.createItem(memberActor, validInput);
    const second = await service.createItem(memberActor, validInput);
    expect(second.id).toBe(first.id);
    await expect(repos.items.count()).resolves.toBe(1);
  });

  it("并发减数量不会降到零以下", async () => {
    const item = await service.createItem(memberActor, validInput);
    const results = await Promise.allSettled([
      service.changeQuantity(memberActor, {
        householdId: "h1",
        itemId: item.id,
        delta: -1,
        expectedVersion: 1,
      }),
      service.changeQuantity(memberActor, {
        householdId: "h1",
        itemId: item.id,
        delta: -1,
        expectedVersion: 1,
      }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await expect(repos.items.findById(item.id)).resolves.toMatchObject({
      quantity: 0,
      processedStatus: "used_up",
    });
  });

  it("已用完物品增加数量后重新打开日期状态", async () => {
    const item = await service.createItem(memberActor, validInput);
    await service.changeQuantity(memberActor, {
      householdId: "h1",
      itemId: item.id,
      delta: -1,
      expectedVersion: 1,
    });
    await expect(
      service.changeQuantity(memberActor, {
        householdId: "h1",
        itemId: item.id,
        delta: 1,
        expectedVersion: 2,
      }),
    ).resolves.toMatchObject({
      quantity: 1,
      processedStatus: null,
      status: "near_expiry",
    });
  });

  it("只能在恢复窗口内恢复软删除物品", async () => {
    const item = await service.createItem(memberActor, validInput);
    await service.deleteItem(adminActor, { householdId: "h1", itemId: item.id });
    await expect(
      service.restoreItem(adminActor, { householdId: "h1", itemId: item.id }),
    ).resolves.toMatchObject({ id: item.id, deletedAt: null });
  });

  it("只有管理员可批量移动分类", async () => {
    await expect(
      service.bulkMoveCategory(memberActor, {
        householdId: "h1",
        itemIds: ["i1", "i2"],
        targetCategoryId: "c2",
      }),
    ).rejects.toThrow("仅管理员可批量移动物品");
  });

  it("普通成员不能删除物品", async () => {
    const item = await service.createItem(memberActor, validInput);
    await expect(
      service.deleteItem(memberActor, { householdId: "h1", itemId: item.id }),
    ).rejects.toThrow("仅管理员可删除物品");
  });

  it("历史生产日期不覆盖最近到期状态", async () => {
    await expect(
      service.createItem(memberActor, {
        ...validInput,
        requestId: "with-production",
        events: [
          { type: "production", date: "2026-07-01", thresholdDays: 0 },
          { type: "expiry", date: "2026-08-01", thresholdDays: 7 },
        ],
      }),
    ).resolves.toMatchObject({
      nearestEventDate: "2026-08-01",
      status: "near_expiry",
    });
  });
});
