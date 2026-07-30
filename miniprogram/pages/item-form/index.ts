import type { ItemDetailDto, ItemEventInput } from "../../../packages/contracts/src/items";
import { findMergeCandidate } from "../../services/catalog-service";
import {
  changeItemQuantity,
  createItem,
  getItemDetail,
  updateItem,
} from "../../services/item-service";
import { chooseProductImage, uploadProductImage } from "../../services/media-service";
import { listCategories, listLocations, type CategoryView, type LocationView } from "../../services/session-service";
import {
  getCurrentHouseholdId,
  sessionState,
  takePendingScanPrefill,
} from "../../state/session";
import { validateItemDraft } from "./validation";

const MERGE_PROMPT =
  "家里已有相同条码、到期日和位置的记录。要增加现有数量，还是保存为新记录？";

const createRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function todayDateString() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function buildViewLabels(data: {
  itemId: string;
  eventDate: string;
  productionDate: string;
  categories: CategoryView[];
  categoryIndex: number;
  locations: LocationView[];
  locationIndex: number;
  showMore: boolean;
  saving: boolean;
  loadingOptions: boolean;
  optionError: string;
  uploadingImage: boolean;
  imageLocalPath: string;
  imageFileId: string;
}) {
  const category = data.categoryIndex >= 0 ? data.categories[data.categoryIndex] : undefined;
  const location = data.locationIndex >= 0 ? data.locations[data.locationIndex] : undefined;
  const imageDisplay = data.imageLocalPath || data.imageFileId;
  const today = todayDateString();
  return {
    pageTitle: data.itemId ? "编辑物品" : "添加物品",
    eventDateLabel: data.eventDate || "请选择日期",
    eventDatePickerValue: data.eventDate || today,
    productionDateLabel: data.productionDate || "未填写",
    productionDatePickerValue: data.productionDate || today,
    categoryNames: data.categories.length > 0
      ? data.categories.map((item) => item.name)
      : ["加载中"],
    // 微信 picker 的 value 不能为 -1，否则整页可能白屏
    categoryPickerIndex: data.categoryIndex >= 0 ? data.categoryIndex : 0,
    categoryLabel: category ? category.name : (data.categories.length > 0 ? "请选择分类" : "加载中"),
    locationNames: data.locations.length > 0
      ? data.locations.map((item) => item.name)
      : ["未选择"],
    locationPickerIndex: data.locationIndex >= 0 ? data.locationIndex : 0,
    locationLabel: location ? location.name : "未选择",
    optionsReady: !data.loadingOptions,
    moreButtonLabel: data.showMore ? "收起更多选项" : "更多选项",
    hasImage: Boolean(imageDisplay),
    imageDisplay,
    saveDisabled: data.saving || data.loadingOptions || Boolean(data.optionError) || data.uploadingImage,
    saveLabel: data.loadingOptions
      ? "正在准备"
      : data.uploadingImage
        ? "图片上传中"
        : data.saving
          ? "正在保存"
          : "保存",
  };
}

Page({
  data: {
    itemId: "",
    name: "",
    categoryId: "",
    categoryIndex: -1,
    categories: [] as CategoryView[],
    locationId: "",
    locationIndex: -1,
    locations: [] as LocationView[],
    eventDate: "",
    productionDate: "",
    quantity: "1",
    unit: "件",
    brand: "",
    specification: "",
    barcode: "",
    note: "",
    imageLocalPath: "",
    imageFileId: "",
    imageDisplay: "",
    hasImage: false,
    uploadingImage: false,
    showMore: false,
    saving: false,
    entryMethod: "manual" as "manual" | "scan" | "ocr",
    defaultThresholdDays: 7,
    pendingCategorySystemKey: "",
    requestId: createRequestId(),
    errors: {} as Record<string, string>,
    loadingOptions: false,
    optionError: "",
    existingEvents: [] as ItemEventInput[],
    pageTitle: "添加物品",
    eventDateLabel: "请选择日期",
    eventDatePickerValue: todayDateString(),
    productionDateLabel: "未填写",
    productionDatePickerValue: todayDateString(),
    categoryNames: ["加载中"] as string[],
    categoryPickerIndex: 0,
    categoryLabel: "加载中",
    locationNames: ["未选择"] as string[],
    locationPickerIndex: 0,
    locationLabel: "未选择",
    optionsReady: false,
    moreButtonLabel: "更多选项",
    saveDisabled: false,
    saveLabel: "保存",
  },
  syncLabels(partial?: Record<string, unknown>) {
    const next = { ...this.data, ...partial };
    this.setData({
      ...partial,
      ...buildViewLabels({
        itemId: String(next.itemId ?? ""),
        eventDate: String(next.eventDate ?? ""),
        productionDate: String(next.productionDate ?? ""),
        categories: (next.categories ?? []) as CategoryView[],
        categoryIndex: Number(next.categoryIndex ?? -1),
        locations: (next.locations ?? []) as LocationView[],
        locationIndex: Number(next.locationIndex ?? -1),
        showMore: Boolean(next.showMore),
        saving: Boolean(next.saving),
        loadingOptions: Boolean(next.loadingOptions),
        optionError: String(next.optionError ?? ""),
        uploadingImage: Boolean(next.uploadingImage),
        imageLocalPath: String(next.imageLocalPath ?? ""),
        imageFileId: String(next.imageFileId ?? ""),
      }),
    });
  },
  async onLoad(query: Record<string, string | undefined>) {
    const barcode = query.barcode ? decodeURIComponent(query.barcode) : "";
    const scanPrefill = takePendingScanPrefill();
    const initial: Record<string, unknown> = {
      itemId: query.itemId ?? "",
      barcode: scanPrefill?.barcode || barcode,
      showMore: Boolean(scanPrefill?.barcode || barcode || scanPrefill?.brand || scanPrefill?.specification),
    };
    if (scanPrefill) {
      initial.name = scanPrefill.name ?? "";
      initial.brand = scanPrefill.brand ?? "";
      initial.specification = scanPrefill.specification ?? "";
      initial.imageFileId = scanPrefill.imageFileId ?? "";
      initial.entryMethod = "scan";
      initial.defaultThresholdDays = scanPrefill.defaultThresholdDays || 7;
      if (scanPrefill.categorySystemKey) {
        initial.pendingCategorySystemKey = scanPrefill.categorySystemKey;
      }
    }
    this.syncLabels(initial);
    try {
      await sessionState.ensureReady();
      await this.loadOptions();
      if (query.itemId) await this.loadItem(query.itemId);
    } catch (error) {
      this.syncLabels({
        optionError: error instanceof Error ? error.message : "录入页面加载失败",
      });
    }
  },
  async loadOptions() {
    const householdId = getCurrentHouseholdId();
    if (!householdId) {
      this.syncLabels({ optionError: "家庭空间尚未准备好", loadingOptions: false });
      return;
    }
    this.syncLabels({ loadingOptions: true, optionError: "" });
    try {
      const [categories, locations] = await Promise.all([
        listCategories(householdId),
        listLocations(householdId),
      ]);
      const visibleCategories = categories.filter((item) => !item.hidden);
      const visibleLocations = locations.filter((item) => !item.hidden);
      const pendingKey = this.data.pendingCategorySystemKey;
      const matchedIndex = pendingKey
        ? visibleCategories.findIndex((entry) => entry.systemKey === pendingKey)
        : -1;
      const partial: Record<string, unknown> = {
        categories: visibleCategories,
        locations: visibleLocations,
        loadingOptions: false,
        optionError: "",
        pendingCategorySystemKey: "",
      };
      const matchedCategory = matchedIndex >= 0 ? visibleCategories[matchedIndex] : undefined;
      if (matchedCategory) {
        partial.categoryId = matchedCategory.id;
        partial.categoryIndex = matchedIndex;
      } else if (!this.data.categoryId && visibleCategories[0]) {
        partial.categoryId = visibleCategories[0].id;
        partial.categoryIndex = 0;
      } else if (this.data.categoryId) {
        partial.categoryIndex = visibleCategories.findIndex((entry) => entry.id === this.data.categoryId);
      }
      this.syncLabels(partial);
    } catch (error) {
      this.syncLabels({
        loadingOptions: false,
        optionError: error instanceof Error ? error.message : "分类加载失败",
      });
    }
  },
  async retryOptions() {
    await this.loadOptions();
    if (!this.data.optionError && this.data.itemId) {
      await this.loadItem(this.data.itemId);
    }
  },
  async loadItem(itemId: string) {
    const householdId = getCurrentHouseholdId();
    if (!householdId) {
      this.syncLabels({ optionError: "家庭空间尚未准备好" });
      return;
    }
    try {
      const item = await getItemDetail(householdId, itemId);
      const expiry = item.events.find((event) => event.type === "expiry") ?? item.events[0];
      const production = item.events.find((event) => event.type === "production");
      this.applyItem(item, expiry ? expiry.date : "", production ? production.date : "");
    } catch (error) {
      this.syncLabels({
        optionError: error instanceof Error ? error.message : "物品加载失败",
      });
    }
  },
  applyItem(item: ItemDetailDto, eventDate: string, productionDate: string) {
    this.syncLabels({
      name: item.name,
      categoryId: item.categoryId,
      categoryIndex: this.data.categories.findIndex((entry) => entry.id === item.categoryId),
      locationId: item.locationId ?? "",
      locationIndex: this.data.locations.findIndex((entry) => entry.id === item.locationId),
      eventDate,
      productionDate,
      quantity: String(item.quantity),
      unit: item.unit,
      brand: item.brand ?? "",
      specification: item.specification ?? "",
      barcode: item.barcode ?? "",
      note: item.note ?? "",
      imageFileId: item.imageFileId ?? "",
      imageLocalPath: "",
      existingEvents: item.events.map(({ type, date, thresholdDays, label }) => ({
        type,
        date,
        thresholdDays,
        label,
      })),
      showMore: Boolean(
        item.locationId
        || item.brand
        || item.specification
        || item.barcode
        || item.note
        || productionDate
        || item.quantity !== 1
        || item.unit !== "件",
      ),
    });
  },
  onTextInput(event: WechatMiniprogram.Input) {
    this.setData({ [String(event.currentTarget.dataset.field)]: event.detail.value });
  },
  onCategoryChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(event.detail.value);
    const category = this.data.categories[index];
    if (!category) return;
    this.syncLabels({ categoryIndex: index, categoryId: category.id });
  },
  onLocationChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(event.detail.value);
    const location = this.data.locations[index];
    if (!location) return;
    this.syncLabels({ locationIndex: index, locationId: location.id });
  },
  onDateChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const field = String(event.currentTarget.dataset.field);
    this.syncLabels({ [field]: event.detail.value });
  },
  toggleMore() {
    this.syncLabels({ showMore: !this.data.showMore });
  },
  async onChooseImage() {
    if (this.data.uploadingImage || this.data.saving) return;
    const householdId = getCurrentHouseholdId();
    if (!householdId) {
      wx.showToast({ title: "家庭空间尚未准备好", icon: "none" });
      return;
    }
    try {
      const localPath = await chooseProductImage();
      this.syncLabels({ imageLocalPath: localPath, uploadingImage: true });
      const imageFileId = await uploadProductImage({
        householdId,
        requestId: this.data.requestId,
        localPath,
      });
      this.syncLabels({ imageFileId, uploadingImage: false });
    } catch (error) {
      this.syncLabels({ uploadingImage: false });
      const message = error instanceof Error ? error.message : "图片上传失败";
      if (message.indexOf("cancel") >= 0 || message.indexOf("取消") >= 0) return;
      wx.showToast({ title: "图片上传失败，可稍后重试", icon: "none" });
    }
  },
  onClearImage() {
    this.syncLabels({ imageLocalPath: "", imageFileId: "" });
  },
  buildEvents(): ItemEventInput[] {
    const events = this.data.existingEvents.filter(
      (event) => event.type !== "production" && event.type !== "expiry",
    );
    if (this.data.productionDate) {
      events.push({ type: "production", date: this.data.productionDate, thresholdDays: 0 });
    }
    if (this.data.eventDate) {
      events.push({
        type: "expiry",
        date: this.data.eventDate,
        thresholdDays: this.data.defaultThresholdDays || 7,
      });
    }
    return events;
  },
  async chooseMergeAction(): Promise<"increase" | "create" | "cancel"> {
    try {
      const result = await wx.showActionSheet({
        alertText: MERGE_PROMPT,
        itemList: ["增加数量", "保存新记录"],
      });
      if (result.tapIndex === 0) return "increase";
      if (result.tapIndex === 1) return "create";
      return "cancel";
    } catch {
      return "cancel";
    }
  },
  async save() {
    if (this.data.saveDisabled) return;
    const householdId = getCurrentHouseholdId();
    if (!householdId) {
      this.syncLabels({ optionError: "家庭空间尚未准备好" });
      return;
    }
    if (this.data.optionError || this.data.categories.length === 0) {
      this.syncLabels({ optionError: this.data.optionError || "分类尚未准备好" });
      return;
    }
    const events = this.buildEvents();
    const validation = validateItemDraft({
      name: this.data.name,
      categoryId: this.data.categoryId,
      events,
    });
    if (!validation.valid) {
      this.setData({ errors: validation.errors });
      return;
    }
    const quantity = Number(this.data.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      this.syncLabels({ showMore: true });
      this.setData({ errors: { quantity: "请输入有效数量" } });
      return;
    }
    this.syncLabels({ saving: true });
    this.setData({ errors: {} });
    try {
      const barcode = this.data.barcode.trim() || undefined;
      const common = {
        name: this.data.name.trim(),
        categoryId: this.data.categoryId,
        quantity,
        unit: this.data.unit.trim() || "件",
        locationId: this.data.locationId || undefined,
        brand: this.data.brand.trim() || undefined,
        specification: this.data.specification.trim() || undefined,
        barcode,
        note: this.data.note.trim() || undefined,
        imageFileId: this.data.imageFileId || undefined,
        entryMethod: this.data.entryMethod,
        events,
      };
      if (this.data.itemId) {
        const item = await updateItem({
          householdId,
          itemId: this.data.itemId,
          ...common,
        });
        await wx.redirectTo({ url: `/pages/item-detail/index?itemId=${item.id}` });
        return;
      }
      if (barcode && this.data.eventDate) {
        const candidate = await findMergeCandidate({
          householdId,
          barcode,
          expiryDate: this.data.eventDate,
          locationId: this.data.locationId || undefined,
        });
        if (candidate) {
          const action = await this.chooseMergeAction();
          if (action === "cancel") return;
          if (action === "increase") {
            await changeItemQuantity({
              householdId,
              itemId: candidate.itemId,
              delta: quantity,
              expectedVersion: candidate.version,
            });
            wx.showToast({ title: "已增加数量", icon: "success", duration: 1500 });
            setTimeout(() => {
              void wx.redirectTo({
                url: `/pages/item-detail/index?itemId=${candidate.itemId}`,
              });
            }, 300);
            return;
          }
        }
      }
      await createItem({
        householdId,
        requestId: this.data.requestId,
        ...common,
      });
      wx.showToast({ title: "已添加", icon: "success", duration: 1500 });
      setTimeout(() => {
        void wx.navigateBack({
          fail: () => {
            void wx.switchTab({ url: "/pages/home/index" });
          },
        });
      }, 300);
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "保存失败",
        icon: "none",
      });
    } finally {
      this.syncLabels({ saving: false });
    }
  },
});
