import {
  listLocations,
  saveLocation,
  type LocationView,
} from "../../services/session-service";
import { getCurrentHouseholdId, sessionState } from "../../state/session";

Page({
  data: { locations: [] as LocationView[], isAdmin: false, name: "" },
  async onShow() { await this.load(); },
  async load() {
    const householdId = getCurrentHouseholdId();
    if (!householdId) return;
    try {
      this.setData({
        locations: await listLocations(householdId),
        isAdmin: sessionState.getCurrentHousehold()?.role === "admin",
      });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
    }
  },
  onNameInput(event: WechatMiniprogram.Input) { this.setData({ name: event.detail.value }); },
  async onCreate() {
    const householdId = getCurrentHouseholdId();
    if (!householdId || !this.data.name.trim()) return;
    try {
      await saveLocation({ householdId, name: this.data.name });
      this.setData({ name: "" });
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : "保存失败", icon: "none" });
    }
  },
  async onToggle(event: WechatMiniprogram.SwitchChange) {
    const householdId = getCurrentHouseholdId();
    const location = this.data.locations[Number(event.currentTarget.dataset.index)];
    if (!householdId || !location) return;
    await saveLocation({
      householdId,
      id: location.id,
      name: location.name,
      sortOrder: location.sortOrder,
      hidden: !event.detail.value,
    });
    await this.load();
  },
  async onMove(event: WechatMiniprogram.BaseEvent) {
    const householdId = getCurrentHouseholdId();
    const index = Number(event.currentTarget.dataset.index);
    const offset = Number(event.currentTarget.dataset.offset);
    const target = index + offset;
    const locations = [...this.data.locations];
    if (!householdId || target < 0 || target >= locations.length) return;
    [locations[index], locations[target]] = [locations[target]!, locations[index]!];
    await Promise.all(
      locations.map((location, sortOrder) =>
        saveLocation({
          householdId,
          id: location.id,
          name: location.name,
          hidden: location.hidden,
          sortOrder,
        }),
      ),
    );
    await this.load();
  },
});
