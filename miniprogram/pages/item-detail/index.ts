import type { ItemDetailDto } from "../../../packages/contracts/src/items";
import { changeItemQuantity, deleteItem, getItemDetail, processItem } from "../../services/item-service";
import { getCurrentHouseholdId, sessionState } from "../../state/session";

Page({
  data: { itemId: "", item: null as ItemDetailDto | null, isAdmin: false, loading: false, error: "" },
  onLoad(query: Record<string, string | undefined>) { this.setData({ itemId: query.itemId ?? "" }); },
  async onShow() {
    try {
      await sessionState.ensureReady();
      await this.load();
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : "详情加载失败" });
    }
  },
  async load() {
    const householdId = getCurrentHouseholdId();
    if (!householdId || !this.data.itemId) {
      this.setData({ error: "物品信息不完整", loading: false });
      return;
    }
    this.setData({ loading: true, error: "", isAdmin: sessionState.getCurrentHousehold()?.role === "admin" });
    try { this.setData({ item: await getItemDetail(householdId, this.data.itemId) }); }
    catch (error) { this.setData({ error: error instanceof Error ? error.message : "详情加载失败" }); }
    finally { this.setData({ loading: false }); }
  },
  retry() { void this.load(); },
  edit() { wx.navigateTo({ url: `/pages/item-form/index?itemId=${this.data.itemId}` }); },
  async onQuantityChange(event: WechatMiniprogram.CustomEvent<{ delta: number }>) {
    const householdId = getCurrentHouseholdId(); const item = this.data.item; if (!householdId || !item) return;
    try { this.setData({ item: await changeItemQuantity({ householdId, itemId: item.id, delta: event.detail.delta, expectedVersion: item.version }) }); }
    catch (error) { wx.showToast({ title: error instanceof Error ? error.message : "数量更新失败", icon: "none" }); }
  },
  async process() {
    const householdId = getCurrentHouseholdId(); if (!householdId) return;
    try { this.setData({ item: await processItem({ householdId, itemId: this.data.itemId, result: "completed" }) }); }
    catch (error) { wx.showToast({ title: error instanceof Error ? error.message : "处理失败", icon: "none" }); }
  },
  async remove() {
    const householdId = getCurrentHouseholdId(); const item = this.data.item; if (!householdId || !item) return;
    const confirmation = await wx.showModal({ title: "删除物品", content: `“${item.name}”将在最近删除中保留 30 天。`, confirmText: "删除", confirmColor: "#B53C2D" });
    if (!confirmation.confirm) return;
    try { await deleteItem(householdId, item.id); await wx.navigateBack(); }
    catch (error) { wx.showToast({ title: error instanceof Error ? error.message : "删除失败", icon: "none" }); }
  },
});
