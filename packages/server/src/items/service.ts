import { randomUUID } from "node:crypto";
import { calculateEventStatus, changeQuantity } from "../../../domain/src";
import { CatalogService } from "../catalog/service";
import type {
  BulkMoveCategoryInput,
  ChangeQuantityInput,
  CreateItemInput,
  DeleteItemInput,
  ItemDetailDto,
  ItemEventDto,
  ItemEventInput,
  ItemListDto,
  ItemListQuery,
  ItemTargetInput,
  ProcessItemInput,
  RestoreItemInput,
  UpdateItemInput,
} from "../../../contracts/src/items";
import type { Actor } from "../context";
import { ServiceError } from "../context";
import type {
  HouseholdRecord,
  ItemEventRecord,
  ItemRecord,
  Repositories,
} from "../repositories";
import { validateCreateItem, validateEvents } from "./validation";

export interface ItemServiceOptions {
  now?: () => Date;
  createId?: (prefix: string) => string;
}

const STATUS_PRIORITY: Record<ItemRecord["status"], number> = {
  expired: 0,
  due_today: 1,
  near_expiry: 2,
  normal: 3,
  processed: 4,
};

function localDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export class ItemService {
  private readonly now: () => Date;
  private readonly createId: (prefix: string) => string;

  constructor(
    private readonly repos: Repositories,
    options: ItemServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  async createItem(
    actor: Actor,
    input: CreateItemInput,
  ): Promise<ItemDetailDto> {
    validateCreateItem(input);
    await this.assertMember(actor, input.householdId);
    const existing = await this.repos.idempotency.find(
      this.idempotencyKey(input.householdId, input.requestId),
    );
    if (existing && typeof existing.value === "string") {
      return this.getDetailUnchecked(existing.value, input.householdId);
    }
    const household = await this.requireHousehold(input.householdId);
    await this.requireCategory(input.householdId, input.categoryId);
    if (input.locationId) {
      await this.requireLocation(input.householdId, input.locationId);
    }
    const timestamp = this.now().toISOString();
    const itemId = this.createId("item");
    const events = this.buildEvents(
      input.householdId,
      itemId,
      input.events,
      household,
    );
    if (input.quantity === 0) {
      for (const event of events) event.status = "processed";
    }
    const item = this.buildItem(actor, input, itemId, events, timestamp);
    await this.repos.transaction(async (repos) => {
      const key = this.idempotencyKey(input.householdId, input.requestId);
      const duplicate = await repos.idempotency.find(key);
      if (duplicate) return;
      await repos.items.insert(item);
      await repos.itemEvents.insertMany(events);
      await repos.idempotency.insert({ key, value: item.id });
    });
    const stored = await this.repos.idempotency.find(
      this.idempotencyKey(input.householdId, input.requestId),
    );
    if (!stored || typeof stored.value !== "string") {
      throw new ServiceError("INTERNAL_ERROR", "物品保存失败");
    }
    const detail = await this.getDetailUnchecked(stored.value, input.householdId);
    await this.rememberCatalog(detail);
    return detail;
  }

  async updateItem(actor: Actor, input: UpdateItemInput): Promise<ItemDetailDto> {
    await this.assertMember(actor, input.householdId);
    const existing = await this.requireActiveItem(input.householdId, input.itemId);
    const household = await this.requireHousehold(input.householdId);
    const categoryId = input.categoryId ?? existing.categoryId;
    await this.requireCategory(input.householdId, categoryId);
    if (input.locationId) {
      await this.requireLocation(input.householdId, input.locationId);
    }
    const events = input.events
      ? (validateEvents(input.events),
        this.buildEvents(input.householdId, existing.id, input.events, household))
      : await this.repos.itemEvents.listByItem(existing.id);
    const name = input.name?.trim() ?? existing.name;
    const unit = input.unit?.trim() ?? existing.unit;
    const quantity = input.quantity ?? existing.quantity;
    if (!name || !unit || !Number.isFinite(quantity) || quantity < 0) {
      throw new ServiceError("VALIDATION_ERROR", "物品信息无效");
    }
    const timestamp = this.now().toISOString();
    const update: Partial<ItemRecord> = {
      name,
      unit,
      quantity,
      categoryId,
      barcode: input.barcode ?? existing.barcode,
      brand: input.brand ?? existing.brand,
      specification: input.specification ?? existing.specification,
      locationId: input.locationId ?? existing.locationId,
      note: input.note ?? existing.note,
      imageFileId: input.imageFileId ?? existing.imageFileId,
      entryMethod: input.entryMethod ?? existing.entryMethod,
      nearestEventDate: this.nearestEventDate(events),
      status: this.overallStatus(events),
      version: existing.version + 1,
      updatedBy: actor.userId,
      updatedAt: timestamp,
    };
    await this.repos.transaction(async (repos) => {
      await repos.items.update(existing.id, update);
      if (input.events) await repos.itemEvents.replaceByItem(existing.id, events);
    });
    const detail = await this.getDetailUnchecked(existing.id, input.householdId);
    await this.rememberCatalog(detail);
    return detail;
  }

  async changeQuantity(
    actor: Actor,
    input: ChangeQuantityInput,
  ): Promise<ItemDetailDto> {
    await this.assertMember(actor, input.householdId);
    await this.repos.transaction(async (repos) => {
      const item = await repos.items.findById(input.itemId);
      if (!item || item.householdId !== input.householdId || item.deletedAt) {
        throw new ServiceError("NOT_FOUND", "物品不存在");
      }
      const result = changeQuantity(item.quantity, input.delta);
      const timestamp = this.now().toISOString();
      let status = item.status;
      let processedStatus = item.processedStatus;
      if (result.exhausted) {
        status = "processed";
        processedStatus = "used_up";
        await repos.itemEvents.updateByItem(item.id, { status: "processed" });
      } else if (item.processedStatus === "used_up") {
        const household = await repos.households.findById(input.householdId);
        if (!household || household.dissolvedAt) {
          throw new ServiceError("NOT_FOUND", "家庭不存在");
        }
        const today = localDate(this.now(), household.timezone);
        const events = (await repos.itemEvents.listByItem(item.id)).map((event) => ({
          ...event,
          status: calculateEventStatus({
            today,
            eventDate: event.date,
            thresholdDays: event.thresholdDays,
            processed: false,
          }),
        }));
        status = this.overallStatus(events);
        processedStatus = null;
        await repos.itemEvents.replaceByItem(item.id, events);
      }
      const updated = await repos.items.updateOptimistic(
        item.id,
        input.householdId,
        input.expectedVersion,
        {
          quantity: result.quantity,
          processedStatus,
          status,
          version: input.expectedVersion + 1,
          updatedBy: actor.userId,
          updatedAt: timestamp,
        },
      );
      if (!updated) {
        throw new ServiceError("CONFLICT", "物品数量已发生变化，请刷新后重试");
      }
    });
    return this.getDetailUnchecked(input.itemId, input.householdId);
  }

  async processItem(
    actor: Actor,
    input: ProcessItemInput,
  ): Promise<ItemDetailDto> {
    await this.assertMember(actor, input.householdId);
    if (!(["used_up", "discarded", "completed", "other"] as const).includes(input.result)) {
      throw new ServiceError("VALIDATION_ERROR", "处理结果无效");
    }
    const item = await this.requireActiveItem(input.householdId, input.itemId);
    const timestamp = this.now().toISOString();
    await this.repos.transaction(async (repos) => {
      await repos.items.update(item.id, {
        processedStatus: input.result,
        status: "processed",
        version: item.version + 1,
        updatedBy: actor.userId,
        updatedAt: timestamp,
      });
      await repos.itemEvents.updateByItem(item.id, { status: "processed" });
    });
    return this.getDetailUnchecked(item.id, input.householdId);
  }

  async deleteItem(actor: Actor, input: DeleteItemInput): Promise<void> {
    await this.assertAdmin(actor, input.householdId, "仅管理员可删除物品");
    const item = await this.requireActiveItem(input.householdId, input.itemId);
    const deletedAt = this.now();
    await this.repos.items.update(item.id, {
      deletedAt: deletedAt.toISOString(),
      deletedBy: actor.userId,
      recoverableUntil: addDays(deletedAt, 30).toISOString(),
      version: item.version + 1,
      updatedBy: actor.userId,
      updatedAt: deletedAt.toISOString(),
    });
  }

  async restoreItem(actor: Actor, input: RestoreItemInput): Promise<ItemDetailDto> {
    await this.assertAdmin(actor, input.householdId, "仅管理员可恢复物品");
    const item = await this.requireItem(input.householdId, input.itemId);
    if (
      !item.deletedAt ||
      !item.recoverableUntil ||
      new Date(item.recoverableUntil).getTime() < this.now().getTime()
    ) {
      throw new ServiceError("VALIDATION_ERROR", "物品已超过可恢复期限");
    }
    const timestamp = this.now().toISOString();
    await this.repos.items.update(item.id, {
      deletedAt: null,
      deletedBy: null,
      recoverableUntil: null,
      version: item.version + 1,
      updatedBy: actor.userId,
      updatedAt: timestamp,
    });
    return this.getDetailUnchecked(item.id, input.householdId);
  }

  async bulkMoveCategory(
    actor: Actor,
    input: BulkMoveCategoryInput,
  ): Promise<number> {
    await this.assertAdmin(actor, input.householdId, "仅管理员可批量移动物品");
    await this.requireCategory(input.householdId, input.targetCategoryId);
    if (
      input.itemIds.length === 0 ||
      new Set(input.itemIds).size !== input.itemIds.length
    ) {
      throw new ServiceError("VALIDATION_ERROR", "物品列表无效");
    }
    const items = await Promise.all(
      input.itemIds.map((id) => this.requireActiveItem(input.householdId, id)),
    );
    const timestamp = this.now().toISOString();
    await this.repos.transaction(async (repos) => {
      for (const item of items) {
        await repos.items.update(item.id, {
          categoryId: input.targetCategoryId,
          version: item.version + 1,
          updatedBy: actor.userId,
          updatedAt: timestamp,
        });
      }
    });
    return items.length;
  }

  async listItems(actor: Actor, query: ItemListQuery): Promise<ItemListDto> {
    if (query.deleted === "recoverable") {
      await this.assertAdmin(actor, query.householdId, "仅管理员可查看最近删除");
    } else {
      await this.assertMember(actor, query.householdId);
    }
    const now = this.now().getTime();
    const keyword = query.keyword?.trim().toLocaleLowerCase("zh-CN");
    const items = (await this.repos.items.listByHousehold(query.householdId))
      .filter((item) =>
        query.deleted === "recoverable"
          ? Boolean(
              item.deletedAt &&
                item.recoverableUntil &&
                new Date(item.recoverableUntil).getTime() >= now,
            )
          : item.deletedAt === null,
      )
      .filter((item) => !query.categoryId || item.categoryId === query.categoryId)
      .filter((item) => !query.locationId || item.locationId === query.locationId)
      .filter((item) => !query.status || item.status === query.status)
      .filter(
        (item) =>
          !keyword ||
          [item.name, item.brand, item.barcode].some((value) =>
            value?.toLocaleLowerCase("zh-CN").includes(keyword),
          ),
      )
      .sort(
        (left, right) =>
          left.nearestEventDate.localeCompare(right.nearestEventDate) ||
          right.createdAt.localeCompare(left.createdAt),
      );
    return { items };
  }

  async getItem(actor: Actor, input: ItemTargetInput): Promise<ItemDetailDto> {
    const member = await this.assertMember(actor, input.householdId);
    const item = await this.requireItem(input.householdId, input.itemId);
    if (item.deletedAt && member.role !== "admin") {
      throw new ServiceError("FORBIDDEN", "无权查看已删除物品");
    }
    return this.getDetailUnchecked(input.itemId, input.householdId);
  }

  private buildItem(
    actor: Actor,
    input: CreateItemInput,
    id: string,
    events: ItemEventRecord[],
    timestamp: string,
  ): ItemRecord {
    return {
      id,
      householdId: input.householdId,
      name: input.name.trim(),
      categoryId: input.categoryId,
      quantity: input.quantity,
      unit: input.unit.trim(),
      barcode: input.barcode,
      brand: input.brand,
      specification: input.specification,
      locationId: input.locationId,
      note: input.note,
      imageFileId: input.imageFileId,
      entryMethod: input.entryMethod ?? "manual",
      status: input.quantity === 0 ? "processed" : this.overallStatus(events),
      nearestEventDate: this.nearestEventDate(events),
      processedStatus: input.quantity === 0 ? "used_up" : null,
      version: 1,
      createdBy: actor.userId,
      createdAt: timestamp,
      updatedBy: actor.userId,
      updatedAt: timestamp,
      deletedAt: null,
      deletedBy: null,
      recoverableUntil: null,
    };
  }

  private buildEvents(
    householdId: string,
    itemId: string,
    inputs: ItemEventInput[],
    household: HouseholdRecord,
  ): ItemEventRecord[] {
    const today = localDate(this.now(), household.timezone);
    return inputs.map((event) => ({
      ...event,
      id: this.createId("event"),
      itemId,
      householdId,
      status: calculateEventStatus({
        today,
        eventDate: event.date,
        thresholdDays: event.thresholdDays,
        processed: false,
      }),
    }));
  }

  private overallStatus(events: ItemEventRecord[]): ItemRecord["status"] {
    return this.reminderEvents(events).sort(
      (left, right) => STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status],
    )[0]?.status ?? "normal";
  }

  private nearestEventDate(events: ItemEventRecord[]): string {
    return this.reminderEvents(events).map((event) => event.date).sort()[0] ??
      "9999-12-31";
  }

  private reminderEvents(events: ItemEventRecord[]): ItemEventRecord[] {
    const reminderTypes = new Set([
      "expiry",
      "warranty",
      "maintenance",
      "renewal",
      "custom",
    ]);
    const reminders = events.filter((event) => reminderTypes.has(event.type));
    return reminders.length > 0 ? reminders : [...events];
  }

  private async getDetailUnchecked(
    itemId: string,
    householdId: string,
  ): Promise<ItemDetailDto> {
    const item = await this.requireItem(householdId, itemId);
    const records = await this.repos.itemEvents.listByItem(itemId);
    const events: ItemEventDto[] = records.map((event) => ({
      ...event,
      type: event.type as ItemEventDto["type"],
    }));
    return { ...item, events };
  }

  private async requireItem(householdId: string, itemId: string) {
    const item = await this.repos.items.findById(itemId);
    if (!item || item.householdId !== householdId) {
      throw new ServiceError("NOT_FOUND", "物品不存在");
    }
    return item;
  }

  private async requireActiveItem(householdId: string, itemId: string) {
    const item = await this.requireItem(householdId, itemId);
    if (item.deletedAt) throw new ServiceError("NOT_FOUND", "物品不存在");
    return item;
  }

  private async requireHousehold(householdId: string) {
    const household = await this.repos.households.findById(householdId);
    if (!household || household.dissolvedAt) {
      throw new ServiceError("NOT_FOUND", "家庭不存在");
    }
    return household;
  }

  private async requireCategory(householdId: string, categoryId: string) {
    const category = await this.repos.categories.findById(categoryId);
    if (!category || category.householdId !== householdId) {
      throw new ServiceError("VALIDATION_ERROR", "分类不属于当前家庭");
    }
    return category;
  }

  private async requireLocation(householdId: string, locationId: string) {
    const location = await this.repos.locations.findById(locationId);
    if (!location || location.householdId !== householdId) {
      throw new ServiceError("VALIDATION_ERROR", "位置不属于当前家庭");
    }
    return location;
  }

  private async rememberCatalog(detail: ItemDetailDto) {
    if (!detail.barcode?.trim()) return;
    const category = await this.repos.categories.findById(detail.categoryId);
    const expiry = detail.events.find((event) => event.type === "expiry");
    await new CatalogService(this.repos).rememberHouseholdProduct(
      detail.householdId,
      {
        barcode: detail.barcode,
        name: detail.name,
        brand: detail.brand,
        specification: detail.specification,
        imageFileId: detail.imageFileId,
        categorySystemKey: category?.systemKey,
        defaultThresholdDays: expiry?.thresholdDays,
      },
    );
  }

  private async assertMember(actor: Actor, householdId: string) {
    const member = await this.repos.members.find(householdId, actor.userId);
    if (!member || member.status !== "active") {
      throw new ServiceError("FORBIDDEN", "无权访问该家庭");
    }
    return member;
  }

  private async assertAdmin(actor: Actor, householdId: string, message: string) {
    const member = await this.assertMember(actor, householdId);
    if (member.role !== "admin") {
      throw new ServiceError("FORBIDDEN", message);
    }
  }

  private idempotencyKey(householdId: string, requestId: string) {
    return `item:create:${householdId}:${requestId}`;
  }
}
