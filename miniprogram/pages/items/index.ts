import type { EventStatus } from "../../../packages/domain/src/date-status";
import type { ItemDto } from "../../../packages/contracts/src/items";
import { bulkMoveItems, listItems } from "../../services/item-service";
import { listCategories, listLocations, type CategoryView, type LocationView } from "../../services/session-service";
import { getCurrentHouseholdId, sessionState, takePendingItemsKeyword } from "../../state/session";

const STATUS_VALUES: Array<EventStatus | ""> = ["", "expired", "due_today", "near_expiry", "normal", "processed"];

Page({
  data: {
    items: [] as ItemDto[],
    keyword: "",
    statusIndex: 0,
    statusLabels: ["全部状态", "已过期", "今日到期", "即将到期", "正常", "不再提醒"],
    categories: [] as CategoryView[],
    categoryLabels: ["全部分类"],
    categoryIndex: 0,
    locations: [] as LocationView[],
    locationLabels: ["全部位置"],
    locationIndex: 0,
    loading: true,
    refreshing: false,
    error: "",
    isAdmin: false,
    bulkMode: false,
    selectedIds: [] as string[],
    targetCategoryIndex: 0,
    moving: false,
  },
  searchTimer: undefined as undefined | ReturnType<typeof setTimeout>,
  loadSeq: 0,
  onUnload() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  },
  async onShow() {
    const hasData = this.data.items.length > 0;
    this.setData({
      loading: !hasData,
      refreshing: hasData,
      error: "",
    });
    if (!hasData) {
      wx.showLoading({ title: "加载物品中", mask: true });
    }
    try {
      await sessionState.ensureReady();
      const pendingKeyword = takePendingItemsKeyword();
      if (pendingKeyword) this.setData({ keyword: pendingKeyword });
      await Promise.all([this.loadOptions(), this.load()]);
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "连接失败，请重新尝试",
        loading: false,
        refreshing: false,
      });
    } finally {
      wx.hideLoading();
    }
  },
  async retry() {
    this.setData({ loading: true, refreshing: false, error: "" });
    try {
      await sessionState.bootstrap();
      await Promise.all([this.loadOptions(), this.load()]);
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "连接失败，请重新尝试",
        loading: false,
        refreshing: false,
      });
    }
  },
  async loadOptions() {
    const householdId = getCurrentHouseholdId();
    if (!householdId) return;
    try {
      const [categories, locations] = await Promise.all([
        listCategories(householdId),
        listLocations(householdId),
      ]);
      const visibleCategories = categories.filter((item) => !item.hidden);
      const visibleLocations = locations.filter((item) => !item.hidden);
      this.setData({
        categories: visibleCategories,
        categoryLabels: ["全部分类", ...visibleCategories.map((item) => item.name)],
        locations: visibleLocations,
        locationLabels: ["全部位置", ...visibleLocations.map((item) => item.name)],
      });
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "筛选项加载失败",
      });
    }
  },
  async load() {
    const householdId = getCurrentHouseholdId();
    if (!householdId) {
      this.setData({
        error: "家庭空间尚未准备好",
        loading: false,
        refreshing: false,
      });
      return;
    }
    const hasData = this.data.items.length > 0;
    this.setData({
      loading: !hasData,
      refreshing: hasData,
      error: "",
      isAdmin: sessionState.getCurrentHousehold()?.role === "admin",
    });
    wx.showNavigationBarLoading();
    const seq = ++this.loadSeq;
    try {
      const status = STATUS_VALUES[this.data.statusIndex];
      const categoryId =
        this.data.categoryIndex > 0
          ? this.data.categories[this.data.categoryIndex - 1]?.id
          : undefined;
      const locationId =
        this.data.locationIndex > 0
          ? this.data.locations[this.data.locationIndex - 1]?.id
          : undefined;
      const result = await listItems({
        householdId,
        keyword: this.data.keyword || undefined,
        status: status || undefined,
        categoryId,
        locationId,
        deleted: "active",
      });
      if (seq !== this.loadSeq) return;
      this.setData({
        items: result.items,
        loading: false,
        refreshing: false,
        error: "",
      });
    } catch (error) {
      if (seq !== this.loadSeq) return;
      this.setData({
        error: error instanceof Error ? error.message : "加载失败",
        loading: false,
        refreshing: false,
      });
    } finally {
      if (seq === this.loadSeq) {
        wx.hideNavigationBarLoading();
        wx.hideLoading();
      }
    }
  },
  onKeywordInput(event: WechatMiniprogram.Input) {
    this.setData({ keyword: event.detail.value });
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(), 300);
  },
  onStatusChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ statusIndex: Number(event.detail.value) });
    void this.load();
  },
  onCategoryChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ categoryIndex: Number(event.detail.value) });
    void this.load();
  },
  onLocationChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ locationIndex: Number(event.detail.value) });
    void this.load();
  },
  toggleBulkMode() {
    this.setData({ bulkMode: !this.data.bulkMode, selectedIds: [] });
  },
  onSelectionChange(event: WechatMiniprogram.CustomEvent<{ value: string[] }>) {
    this.setData({ selectedIds: event.detail.value });
  },
  onTargetCategoryChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ targetCategoryIndex: Number(event.detail.value) });
  },
  async moveSelected() {
    const householdId = getCurrentHouseholdId();
    const category = this.data.categories[this.data.targetCategoryIndex];
    if (!householdId || !category || this.data.selectedIds.length === 0) {
      wx.showToast({ title: "请选择物品和目标分类", icon: "none" });
      return;
    }
    this.setData({ moving: true });
    try {
      await bulkMoveItems({
        householdId,
        itemIds: this.data.selectedIds,
        targetCategoryId: category.id,
      });
      this.setData({ bulkMode: false, selectedIds: [] });
      await this.load();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "移动失败",
        icon: "none",
      });
    } finally {
      this.setData({ moving: false });
    }
  },
  openForm() {
    wx.navigateTo({ url: "/pages/item-form/index" });
  },
  openRecycleBin() {
    wx.navigateTo({ url: "/pages/recycle-bin/index" });
  },
  openItem(event: WechatMiniprogram.CustomEvent<{ itemId: string }>) {
    wx.navigateTo({
      url: `/pages/item-detail/index?itemId=${event.detail.itemId}`,
    });
  },
  async onItemUpdated() {
    await this.load();
  },
});
