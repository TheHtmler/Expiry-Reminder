import {
  listCategories,
  reorderCategories,
  saveCategory,
  type CategoryView,
} from "../../services/session-service";
import { getCurrentHouseholdId, sessionState } from "../../state/session";

Page({
  data: {
    categories: [] as CategoryView[],
    isAdmin: false,
    name: "",
    icon: "other",
    color: "#747B74",
  },
  async onShow() { await this.load(); },
  async load() {
    const householdId = getCurrentHouseholdId();
    if (!householdId) return;
    try {
      this.setData({
        categories: await listCategories(householdId),
        isAdmin: sessionState.getCurrentHousehold()?.role === "admin",
      });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
    }
  },
  onNameInput(event: WechatMiniprogram.Input) { this.setData({ name: event.detail.value }); },
  onIconInput(event: WechatMiniprogram.Input) { this.setData({ icon: event.detail.value }); },
  onColorInput(event: WechatMiniprogram.Input) { this.setData({ color: event.detail.value }); },
  setIcon(event: WechatMiniprogram.BaseEvent) { this.setData({ icon: String(event.currentTarget.dataset.icon) }); },
  setColor(event: WechatMiniprogram.BaseEvent) { this.setData({ color: String(event.currentTarget.dataset.color) }); },
  async onCreate() {
    const householdId = getCurrentHouseholdId();
    if (!householdId || !this.data.name.trim()) return;
    try {
      await saveCategory({
        householdId,
        name: this.data.name,
        icon: this.data.icon,
        color: this.data.color,
      });
      this.setData({ name: "", icon: "other", color: "#747B74" });
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : "保存失败", icon: "none" });
    }
  },
  async onToggle(event: WechatMiniprogram.SwitchChange) {
    const householdId = getCurrentHouseholdId();
    const category = this.data.categories[Number(event.currentTarget.dataset.index)];
    if (!householdId || !category) return;
    await saveCategory({
      householdId,
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      hidden: !event.detail.value,
    });
    await this.load();
  },
  async onMove(event: WechatMiniprogram.BaseEvent) {
    const householdId = getCurrentHouseholdId();
    const id = String(event.currentTarget.dataset.id);
    const offset = Number(event.currentTarget.dataset.offset);
    const visible = this.data.categories.filter((category) => !category.hidden);
    const index = visible.findIndex((category) => category.id === id);
    const target = index + offset;
    if (!householdId || index < 0 || target < 0 || target >= visible.length) return;
    [visible[index], visible[target]] = [visible[target]!, visible[index]!];
    await reorderCategories(householdId, visible.map((category) => category.id));
    await this.load();
  },
});
