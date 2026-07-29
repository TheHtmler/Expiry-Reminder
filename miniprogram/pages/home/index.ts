import type { ItemDto } from "../../../packages/contracts/src/items";
import { changeItemQuantity, listItems, processItem } from "../../services/item-service";
import { getCurrentHouseholdId, sessionState } from "../../state/session";
import { buildHomeViewModel } from "./view-model";

Page({
  data: {
    currentHousehold: null as unknown,
    summary: { expired: 0, dueToday: 0, nearExpiry: 0 },
    priorityItems: [] as ItemDto[],
    loading: false,
    error: "",
  },
  unsubscribe: undefined as undefined | (() => void),
  hasShown: false,
  onLoad() {
    this.unsubscribe = sessionState.onHouseholdChanged(() => {
      if (this.hasShown) void this.load();
    });
  },
  onUnload() { this.unsubscribe?.(); },
  async onShow() {
    try {
      await sessionState.ensureReady();
      this.hasShown = true;
      await this.load();
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "连接失败，请重新尝试",
        loading: false,
      });
    }
  },
  async retry() {
    try {
      this.setData({ loading: true, error: "" });
      await sessionState.bootstrap();
      this.hasShown = true;
      await this.load();
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "连接失败，请重新尝试",
        loading: false,
      });
    }
  },
  async load() {
    const householdId = getCurrentHouseholdId();
    this.setData({ currentHousehold: sessionState.getCurrentHousehold() });
    if (!householdId) {
      this.setData({ error: "家庭空间尚未准备好", loading: false });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      const result = await listItems({ householdId, deleted: "active" });
      this.setData(buildHomeViewModel(result.items));
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : "加载失败" });
    } finally {
      this.setData({ loading: false });
    }
  },
  openForm() { wx.navigateTo({ url: "/pages/item-form/index" }); },
  openItems() { wx.switchTab({ url: "/pages/items/index" }); },
  openItem(event: WechatMiniprogram.CustomEvent<{ itemId: string }>) {
    wx.navigateTo({ url: `/pages/item-detail/index?itemId=${event.detail.itemId}` });
  },
  async onQuantityChange(event: WechatMiniprogram.CustomEvent<{ itemId: string; delta: number }>) {
    const householdId = getCurrentHouseholdId();
    const item = this.data.priorityItems.find((entry) => entry.id === event.detail.itemId);
    if (!householdId || !item) return;
    try {
      await changeItemQuantity({ householdId, itemId: item.id, delta: event.detail.delta, expectedVersion: item.version });
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : "数量更新失败", icon: "none" });
    }
  },
  async onProcess(event: WechatMiniprogram.CustomEvent<{ itemId: string }>) {
    const householdId = getCurrentHouseholdId();
    if (!householdId) return;
    try {
      await processItem({ householdId, itemId: event.detail.itemId, result: "completed" });
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : "处理失败", icon: "none" });
    }
  },
});
