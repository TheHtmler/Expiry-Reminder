import { describe, expect, it } from "vitest";
import { API_ACTIONS } from "../../packages/contracts/src/actions";

describe("云函数 action 协议", () => {
  it("action 名称稳定", () => {
    expect(API_ACTIONS).toContain("household.create");
    expect(API_ACTIONS).toContain("item.create");
    expect(API_ACTIONS).toContain("reminder.list");
  });
});
