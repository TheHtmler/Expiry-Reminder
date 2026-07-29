import { describe, expect, it } from "vitest";
import { ItemService } from "../../packages/server/src/items/service";
import { createMemoryRepositories } from "../support/memory-repositories";

describe("物品生命周期", () => {
  it("按最早事件排序并在软删除后移出正常列表", async () => {
    const repos = createMemoryRepositories();
    const now = new Date("2026-07-29T00:00:00.000Z");
    const actor = { userId: "u1", openId: "o1" };
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
    const service = new ItemService(repos, { now: () => now });
    const later = await service.createItem(actor, {
      requestId: "later",
      householdId: "h1",
      name: "后到期",
      categoryId: "food",
      quantity: 1,
      unit: "件",
      events: [{ type: "expiry", date: "2026-08-10", thresholdDays: 7 }],
    });
    const earlier = await service.createItem(actor, {
      requestId: "earlier",
      householdId: "h1",
      name: "先到期",
      categoryId: "food",
      quantity: 1,
      unit: "件",
      events: [{ type: "expiry", date: "2026-08-01", thresholdDays: 7 }],
    });

    const active = await service.listItems(actor, {
      householdId: "h1",
      deleted: "active",
    });
    expect(active.items.map((item) => item.id)).toEqual([earlier.id, later.id]);

    await service.deleteItem(actor, { householdId: "h1", itemId: earlier.id });
    const afterDelete = await service.listItems(actor, {
      householdId: "h1",
      deleted: "active",
    });
    expect(afterDelete.items.map((item) => item.id)).toEqual([later.id]);
  });
});
