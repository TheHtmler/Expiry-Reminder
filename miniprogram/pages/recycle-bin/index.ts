import type { ItemDto } from "../../../packages/contracts/src/items";
import { listItems, restoreItem } from "../../services/item-service";
import { getCurrentHouseholdId } from "../../state/session";

Page({
  data: { items: [] as ItemDto[], loading: false },
  async onShow() { await this.load(); },
  async load() {
    const householdId = getCurrentHouseholdId(); if (!householdId) return;
    this.setData({ loading: true });
    try { this.setData({ items: (await listItems({ householdId, deleted: "recoverable" })).items }); }
    catch (error) { wx.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" }); }
    finally { this.setData({ loading: false }); }
  },
  async restore(event: WechatMiniprogram.BaseEvent) {
    const householdId = getCurrentHouseholdId(); const itemId = String(event.currentTarget.dataset.id); if (!householdId) return;
    try { await restoreItem(householdId, itemId); await this.load(); }
    catch (error) { wx.showToast({ title: error instanceof Error ? error.message : "恢复失败", icon: "none" }); }
  },
});
