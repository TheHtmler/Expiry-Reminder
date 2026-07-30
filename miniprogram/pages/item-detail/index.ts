import type { ItemDetailDto } from "../../../packages/contracts/src/items";
import {
  changeItemQuantity,
  deleteItem,
  getItemDetail,
  processItem,
} from "../../services/item-service";
import { getCurrentHouseholdId, sessionState } from "../../state/session";

Page({
  data: {
    itemId: "",
    item: null as ItemDetailDto | null,
    isAdmin: false,
    loading: false,
    error: "",
    updateVisible: false,
    draftQuantity: 0,
    saving: false,
    confirmMute: false,
  },
  onLoad(query: Record<string, string | undefined>) {
    this.setData({ itemId: query.itemId ?? "" });
  },
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
    this.setData({
      loading: true,
      error: "",
      isAdmin: sessionState.getCurrentHousehold()?.role === "admin",
    });
    try {
      this.setData({ item: await getItemDetail(householdId, this.data.itemId) });
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "详情加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  retry() { void this.load(); },
  edit() { wx.navigateTo({ url: `/pages/item-form/index?itemId=${this.data.itemId}` }); },
  preventMove() {},
  openUpdate() {
    const item = this.data.item;
    if (!item || item.status === "processed") return;
    this.setData({
      updateVisible: true,
      draftQuantity: item.quantity,
      saving: false,
      confirmMute: false,
    });
  },
  closeUpdate() {
    this.setData({ updateVisible: false, confirmMute: false });
  },
  onQuantityStep(event: WechatMiniprogram.CustomEvent<{ delta: number }>) {
    const next = this.data.draftQuantity + event.detail.delta;
    if (next < 0) return;
    this.setData({ draftQuantity: next });
  },
  async saveQuantity() {
    const item = this.data.item;
    const householdId = getCurrentHouseholdId();
    if (!item || !householdId || this.data.saving) return;
    const delta = this.data.draftQuantity - item.quantity;
    if (delta === 0) return;
    this.setData({ saving: true });
    try {
      const updated = await changeItemQuantity({
        householdId,
        itemId: item.id,
        delta,
        expectedVersion: item.version,
      });
      this.setData({ item: updated, draftQuantity: updated.quantity });
      wx.showToast({
        title: updated.quantity === 0 ? "已用完，不再提醒" : "数量已保存",
        icon: "success",
      });
      if (updated.status === "processed" || updated.quantity === 0) {
        this.closeUpdate();
      }
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "数量保存失败",
        icon: "none",
      });
    } finally {
      this.setData({ saving: false });
    }
  },
  askMute() { this.setData({ confirmMute: true }); },
  cancelMute() { this.setData({ confirmMute: false }); },
  async confirmMuteReminders() {
    const item = this.data.item;
    const householdId = getCurrentHouseholdId();
    if (!item || !householdId || this.data.saving) return;
    this.setData({ saving: true });
    try {
      const updated = await processItem({
        householdId,
        itemId: item.id,
        result: "completed",
      });
      this.setData({ item: updated });
      wx.showToast({ title: "已关闭这件提醒", icon: "success" });
      this.closeUpdate();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "操作失败",
        icon: "none",
      });
    } finally {
      this.setData({ saving: false });
    }
  },
  async remove() {
    const householdId = getCurrentHouseholdId();
    const item = this.data.item;
    if (!householdId || !item) return;
    const confirmation = await wx.showModal({
      title: "删除物品",
      content: `“${item.name}”将在最近删除中保留 30 天。`,
      confirmText: "删除",
      confirmColor: "#B53C2D",
    });
    if (!confirmation.confirm) return;
    try {
      await deleteItem(householdId, item.id);
      await wx.navigateBack();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "删除失败",
        icon: "none",
      });
    }
  },
});
