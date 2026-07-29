import type { ItemDetailDto, ItemEventInput } from "../../../packages/contracts/src/items";
import { createItem, getItemDetail, updateItem } from "../../services/item-service";
import { listCategories, listLocations, type CategoryView, type LocationView } from "../../services/session-service";
import { getCurrentHouseholdId, sessionState } from "../../state/session";
import { validateItemDraft } from "./validation";

const createRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

Page({
  data: {
    itemId: "", name: "", categoryId: "", categoryIndex: -1,
    categories: [] as CategoryView[], locationId: "", locationIndex: -1,
    locations: [] as LocationView[], eventDate: "", productionDate: "",
    quantity: "1", unit: "件", brand: "", specification: "", barcode: "", note: "",
    showMore: false, saving: false, requestId: createRequestId(), errors: {} as Record<string, string>,
    loadingOptions: false, optionError: "",
    existingEvents: [] as ItemEventInput[],
  },
  async onLoad(query: Record<string, string | undefined>) {
    this.setData({ itemId: query.itemId ?? "" });
    try {
      await sessionState.ensureReady();
      await this.loadOptions();
      if (query.itemId) await this.loadItem(query.itemId);
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "录入页面加载失败",
        icon: "none",
      });
    }
  },
  async loadOptions() {
    const householdId = getCurrentHouseholdId();
    if (!householdId) {
      this.setData({ optionError: "家庭空间尚未准备好" });
      return;
    }
    this.setData({ loadingOptions: true, optionError: "" });
    try {
      const [categories, locations] = await Promise.all([listCategories(householdId), listLocations(householdId)]);
      const visibleCategories = categories.filter((item) => !item.hidden);
      const visibleLocations = locations.filter((item) => !item.hidden);
      this.setData({ categories: visibleCategories, locations: visibleLocations });
      if (!this.data.categoryId && visibleCategories[0]) this.setData({ categoryId: visibleCategories[0].id, categoryIndex: 0 });
    } catch (error) {
      this.setData({ optionError: error instanceof Error ? error.message : "分类加载失败" });
    } finally {
      this.setData({ loadingOptions: false });
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
      this.setData({ optionError: "家庭空间尚未准备好" });
      return;
    }
    try {
      const item = await getItemDetail(householdId, itemId);
      const expiry = item.events.find((event) => event.type === "expiry") ?? item.events[0];
      const production = item.events.find((event) => event.type === "production");
      this.applyItem(item, expiry?.date ?? "", production?.date ?? "");
    } catch (error) { wx.showToast({ title: error instanceof Error ? error.message : "物品加载失败", icon: "none" }); }
  },
  applyItem(item: ItemDetailDto, eventDate: string, productionDate: string) {
    this.setData({
      name: item.name, categoryId: item.categoryId,
      categoryIndex: this.data.categories.findIndex((entry) => entry.id === item.categoryId),
      locationId: item.locationId ?? "",
      locationIndex: this.data.locations.findIndex((entry) => entry.id === item.locationId),
      eventDate, productionDate, quantity: String(item.quantity), unit: item.unit,
      brand: item.brand ?? "", specification: item.specification ?? "", barcode: item.barcode ?? "", note: item.note ?? "",
      existingEvents: item.events.map(({ type, date, thresholdDays, label }) => ({ type, date, thresholdDays, label })),
    });
  },
  onTextInput(event: WechatMiniprogram.Input) { this.setData({ [String(event.currentTarget.dataset.field)]: event.detail.value }); },
  onCategoryChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(event.detail.value); const category = this.data.categories[index];
    if (category) this.setData({ categoryIndex: index, categoryId: category.id });
  },
  onLocationChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(event.detail.value); const location = this.data.locations[index];
    if (location) this.setData({ locationIndex: index, locationId: location.id });
  },
  onDateChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) { this.setData({ [String(event.currentTarget.dataset.field)]: event.detail.value }); },
  toggleMore() { this.setData({ showMore: !this.data.showMore }); },
  buildEvents(): ItemEventInput[] {
    const events = this.data.existingEvents.filter((event) => event.type !== "production" && event.type !== "expiry");
    if (this.data.productionDate) events.push({ type: "production", date: this.data.productionDate, thresholdDays: 0 });
    if (this.data.eventDate) events.push({ type: "expiry", date: this.data.eventDate, thresholdDays: 7 });
    return events;
  },
  async save() {
    if (this.data.saving) return;
    const householdId = getCurrentHouseholdId();
    if (!householdId) {
      this.setData({ optionError: "家庭空间尚未准备好" });
      return;
    }
    if (this.data.optionError || this.data.categories.length === 0) {
      this.setData({ optionError: this.data.optionError || "分类尚未准备好" });
      return;
    }
    const events = this.buildEvents();
    const validation = validateItemDraft({ name: this.data.name, categoryId: this.data.categoryId, events });
    if (!validation.valid) { this.setData({ errors: validation.errors }); return; }
    const quantity = Number(this.data.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) { this.setData({ errors: { quantity: "请输入有效数量" } }); return; }
    this.setData({ saving: true, errors: {} });
    try {
      const common = {
        name: this.data.name.trim(), categoryId: this.data.categoryId, quantity, unit: this.data.unit.trim() || "件",
        locationId: this.data.locationId || undefined, brand: this.data.brand.trim() || undefined,
        specification: this.data.specification.trim() || undefined, barcode: this.data.barcode.trim() || undefined,
        note: this.data.note.trim() || undefined, entryMethod: "manual" as const, events,
      };
      const item = this.data.itemId
        ? await updateItem({ householdId, itemId: this.data.itemId, ...common })
        : await createItem({ householdId, requestId: this.data.requestId, ...common });
      await wx.redirectTo({ url: `/pages/item-detail/index?itemId=${item.id}` });
    } catch (error) { wx.showToast({ title: error instanceof Error ? error.message : "保存失败", icon: "none" }); }
    finally { this.setData({ saving: false }); }
  },
});
