import { describe, expect, it, vi } from "vitest";
import { createSessionState } from "../../miniprogram/state/session";

describe("sessionState", () => {
  it("优先恢复仍有权限的上次家庭", async () => {
    const storage = { get: () => "h2", set: () => undefined };
    const api = async () => ({
      user: { id: "u1" },
      households: [{ id: "h1", name: "一号家庭" }, { id: "h2", name: "二号家庭" }],
    });
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

  it("切换家庭后持久化并发布事件", async () => {
    const set = vi.fn();
    const listener = vi.fn();
    const state = createSessionState({
      storage: { get: () => null, set },
      api: async () => ({
        user: { id: "u1" },
        households: [{ id: "h1", name: "一号家庭" }],
      }),
    });
    await state.bootstrap();
    state.onHouseholdChanged(listener);
    state.switchHousehold("h1");
    expect(set).toHaveBeenLastCalledWith("h1");
    expect(listener).toHaveBeenCalledWith("h1");
    expect(() => state.switchHousehold("missing")).toThrow("家庭不存在或已无权访问");
  });

  it("合并并发初始化并在家庭就绪后通知页面", async () => {
    const listener = vi.fn();
    const api = vi.fn(async () => ({
      user: { id: "u1" },
      households: [{ id: "h1", name: "我的家" }],
    }));
    const state = createSessionState({
      storage: { get: () => null, set: () => undefined },
      api,
    });
    state.onHouseholdChanged(listener);

    await Promise.all([state.bootstrap(), state.bootstrap()]);

    expect(api).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("h1");
  });
});
