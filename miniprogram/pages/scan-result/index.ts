import { lookupProduct } from "../../services/catalog-service";
import { scanProductCode } from "../../services/scanner";
import {
  getCurrentHouseholdId,
  sessionState,
  setPendingScanPrefill,
} from "../../state/session";

function sourceLabel(source: "household" | "public" | "none") {
  if (source === "household") return "家庭常用资料";
  if (source === "public") return "公共商品资料";
  return "未匹配到商品资料";
}

Page({
  data: {
    loading: true,
    error: "",
    barcode: "",
    name: "",
    brand: "",
    specification: "",
    imageFileId: "",
    categorySystemKey: "",
    defaultThresholdDays: 0,
    source: "none" as "household" | "public" | "none",
    sourceLabel: "",
    hint: "",
  },
  async onLoad(query: Record<string, string | undefined>) {
    const code = query.code ? decodeURIComponent(query.code) : "";
    if (code) {
      await this.resolveCode(code);
      return;
    }
    await this.rescan();
  },
  async retry() {
    if (this.data.barcode) {
      await this.resolveCode(this.data.barcode);
      return;
    }
    await this.rescan();
  },
  async rescan() {
    this.setData({ loading: true, error: "" });
    try {
      const scanned = await scanProductCode();
      if (!scanned) {
        await wx.navigateBack({
          fail: () => {
            void wx.switchTab({ url: "/pages/home/index" });
          },
        });
        return;
      }
      await this.resolveCode(scanned.value);
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "扫码失败，请重试",
      });
    }
  },
  async resolveCode(code: string) {
    this.setData({ loading: true, error: "", barcode: code });
    try {
      await sessionState.ensureReady();
      const householdId = getCurrentHouseholdId();
      if (!householdId) {
        this.setData({ loading: false, error: "家庭空间尚未准备好" });
        return;
      }
      const match = await lookupProduct({ householdId, code });
      const source = match?.source ?? "none";
      this.setData({
        loading: false,
        barcode: code,
        name: match?.name ?? "",
        brand: match?.brand ?? "",
        specification: match?.specification ?? "",
        imageFileId: match?.imageFileId ?? "",
        categorySystemKey: match?.categorySystemKey ?? "",
        defaultThresholdDays: match?.defaultThresholdDays ?? 0,
        source,
        sourceLabel: sourceLabel(source),
        hint: match
          ? "已预填名称等信息，请补充到期日后再保存。"
          : "未找到匹配商品，将保留条码并进入手动录入。",
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "商品匹配失败",
      });
    }
  },
  continueEntry() {
    setPendingScanPrefill({
      barcode: this.data.barcode,
      name: this.data.name || undefined,
      brand: this.data.brand || undefined,
      specification: this.data.specification || undefined,
      imageFileId: this.data.imageFileId || undefined,
      categorySystemKey: this.data.categorySystemKey || undefined,
      defaultThresholdDays: this.data.defaultThresholdDays || undefined,
      source: this.data.source,
      entryMethod: "scan",
    });
    wx.navigateTo({ url: "/pages/item-form/index?from=scan" });
  },
});
