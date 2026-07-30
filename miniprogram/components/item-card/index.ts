import {
  changeItemQuantity,
  processItem,
  type HandleableItem,
} from "../../services/item-service";
import { getCurrentHouseholdId } from "../../state/session";

Component({
  properties: { item: { type: Object, value: {} } },
  data: {
    nameInitial: "物",
    updateVisible: false,
    draftQuantity: 0,
    saving: false,
    confirmMute: false,
  },
  observers: {
    item(item: HandleableItem) {
      const name = item?.name?.trim() || "";
      const patch: Record<string, unknown> = {
        nameInitial: name ? name.charAt(0) : "物",
      };
      if (this.data.updateVisible && item && typeof item.quantity === "number") {
        patch.draftQuantity = item.quantity;
      }
      this.setData(patch);
    },
  },
  methods: {
    open() {
      this.triggerEvent("open", { itemId: (this.data.item as HandleableItem).id });
    },
    edit() {
      const item = this.data.item as HandleableItem;
      if (!item?.id) return;
      wx.navigateTo({ url: `/pages/item-form/index?itemId=${item.id}` });
    },
    preventMove() {},
    openUpdate() {
      const item = this.data.item as HandleableItem;
      this.setData({
        updateVisible: true,
        draftQuantity: item.quantity || 0,
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
      const item = this.data.item as HandleableItem;
      const householdId = getCurrentHouseholdId();
      if (!item?.id || !householdId || this.data.saving) return;
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
        wx.showToast({
          title: updated.quantity === 0 ? "已用完，不再提醒" : "数量已保存",
          icon: "success",
        });
        this.triggerEvent("updated", { item: updated });
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
    askMute() {
      this.setData({ confirmMute: true });
    },
    cancelMute() {
      this.setData({ confirmMute: false });
    },
    async confirmMuteReminders() {
      const item = this.data.item as HandleableItem;
      const householdId = getCurrentHouseholdId();
      if (!item?.id || !householdId || this.data.saving) return;
      this.setData({ saving: true });
      try {
        const updated = await processItem({
          householdId,
          itemId: item.id,
          result: "completed",
        });
        wx.showToast({ title: "已关闭这件提醒", icon: "success" });
        this.triggerEvent("updated", { item: updated });
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
  },
});
