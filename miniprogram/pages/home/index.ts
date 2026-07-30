import type { ItemDto } from "../../../packages/contracts/src/items";
import { lookupProduct } from "../../services/catalog-service";
import { listItems } from "../../services/item-service";
import { scanProductCode } from "../../services/scanner";
import {
  getCurrentHouseholdId,
  sessionState,
  setPendingItemsKeyword,
  setPendingScanPrefill,
} from "../../state/session";
import { buildHomeViewModel } from "./view-model";

Page({
  data: {
    currentHousehold: null as unknown,
    summary: { expired: 0, dueToday: 0, nearExpiry: 0 },
    priorityItems: [] as ItemDto[],
    searchKeyword: "",
    loading: true,
    refreshing: false,
    error: "",
  },
  unsubscribe: undefined as undefined | (() => void),
  hasShown: false,
  loadSeq: 0,
  onLoad() {
    this.unsubscribe = sessionState.onHouseholdChanged(() => {
      if (this.hasShown) void this.load({ force: true });
    });
  },
  onUnload() { this.unsubscribe?.(); },
  async onShow() {
    const hasData = this.data.priorityItems.length > 0;
    this.setData({
      loading: !hasData,
      refreshing: hasData,
      error: "",
    });
    if (!hasData) {
      wx.showLoading({ title: "加载中", mask: true });
    }
    try {
      await sessionState.ensureReady();
      this.hasShown = true;
      await this.load();
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
      this.hasShown = true;
      await this.load({ force: true });
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "连接失败，请重新尝试",
        loading: false,
        refreshing: false,
      });
    }
  },
  async load(options?: { force?: boolean }) {
    const householdId = getCurrentHouseholdId();
    this.setData({ currentHousehold: sessionState.getCurrentHousehold() });
    if (!householdId) {
      this.setData({
        error: "家庭空间尚未准备好",
        loading: false,
        refreshing: false,
      });
      return;
    }
    const hasData = this.data.priorityItems.length > 0;
    this.setData({
      loading: !hasData,
      refreshing: hasData,
      error: "",
    });
    wx.showNavigationBarLoading();
    const seq = ++this.loadSeq;
    try {
      const result = await listItems({ householdId, deleted: "active" });
      if (seq !== this.loadSeq && !options?.force) return;
      this.setData({
        ...buildHomeViewModel(result.items),
        loading: false,
        refreshing: false,
        error: "",
      });
    } catch (error) {
      if (seq !== this.loadSeq && !options?.force) return;
      this.setData({
        error: error instanceof Error ? error.message : "加载失败",
        loading: false,
        refreshing: false,
      });
    } finally {
      if (seq === this.loadSeq || options?.force) {
        wx.hideNavigationBarLoading();
        wx.hideLoading();
      }
    }
  },
  openForm() { wx.navigateTo({ url: "/pages/item-form/index" }); },
  openItems() { wx.switchTab({ url: "/pages/items/index" }); },
  onSearchInput(event: WechatMiniprogram.Input) {
    this.setData({ searchKeyword: event.detail.value });
  },
  onSearchConfirm(event: WechatMiniprogram.Input) {
    const keyword = (event.detail.value || this.data.searchKeyword).trim();
    setPendingItemsKeyword(keyword);
    wx.switchTab({ url: "/pages/items/index" });
  },
  async onScan() {
    try {
      const scanned = await scanProductCode();
      if (!scanned) return;
      wx.showLoading({ title: "匹配商品中", mask: true });
      await sessionState.ensureReady();
      const householdId = getCurrentHouseholdId();
      if (!householdId) {
        wx.hideLoading();
        wx.showToast({ title: "家庭空间尚未准备好", icon: "none" });
        return;
      }
      let match = null as Awaited<ReturnType<typeof lookupProduct>>;
      try {
        match = await lookupProduct({ householdId, code: scanned.value });
      } catch {
        match = null;
      }
      setPendingScanPrefill({
        barcode: scanned.value,
        name: match?.name,
        brand: match?.brand,
        specification: match?.specification,
        imageFileId: match?.imageFileId,
        categorySystemKey: match?.categorySystemKey,
        defaultThresholdDays: match?.defaultThresholdDays,
        source: match?.source ?? "none",
        entryMethod: "scan",
      });
      wx.hideLoading();
      wx.showToast({
        title: match ? "已匹配商品资料" : "未匹配，请手动填写",
        icon: "none",
        duration: 1500,
      });
      wx.navigateTo({ url: "/pages/item-form/index?from=scan" });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error instanceof Error ? error.message : "扫码失败，请重试",
        icon: "none",
      });
    }
  },
  openItem(event: WechatMiniprogram.CustomEvent<{ itemId: string }>) {
    wx.navigateTo({ url: `/pages/item-detail/index?itemId=${event.detail.itemId}` });
  },
  async onItemUpdated() {
    await this.load({ force: true });
  },
});
