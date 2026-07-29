import { describe, expect, it } from "vitest";
import { buildHomeViewModel } from "../../miniprogram/pages/home/view-model";
import type { ItemDto } from "../../packages/contracts/src/items";

const item = (id: string, status: ItemDto["status"], nearestEventDate: string) => ({
  id,
  status,
  nearestEventDate,
}) as ItemDto;

describe("首页视图模型", () => {
  it("按过期、今日到期、临期顺序分组", () => {
    const model = buildHomeViewModel([
      item("near", "near_expiry", "2026-07-31"),
      item("expired", "expired", "2026-07-28"),
      item("today", "due_today", "2026-07-29"),
      item("normal", "normal", "2026-08-30"),
    ]);

    expect(model.priorityItems.map((entry) => entry.id)).toEqual([
      "expired",
      "today",
      "near",
    ]);
    expect(model.summary).toEqual({ expired: 1, dueToday: 1, nearExpiry: 1 });
  });
});
