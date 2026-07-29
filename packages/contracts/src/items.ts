import type { EventStatus } from "../../domain/src/date-status";

export type ItemEventType =
  | "production"
  | "opened"
  | "expiry"
  | "purchase"
  | "installation"
  | "warranty"
  | "maintenance"
  | "renewal"
  | "custom";

export interface ItemEventInput {
  type: ItemEventType;
  date: string;
  thresholdDays: number;
  label?: string;
}

export interface CreateItemInput {
  requestId: string;
  householdId: string;
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  barcode?: string;
  brand?: string;
  specification?: string;
  locationId?: string;
  note?: string;
  imageFileId?: string;
  entryMethod?: "manual" | "scan" | "ocr";
  events: ItemEventInput[];
}

export interface UpdateItemInput
  extends Partial<Omit<CreateItemInput, "requestId" | "householdId">> {
  householdId: string;
  itemId: string;
}

export interface ChangeQuantityInput {
  householdId: string;
  itemId: string;
  delta: number;
  expectedVersion: number;
}

export interface ProcessItemInput {
  householdId: string;
  itemId: string;
  result: "used_up" | "discarded" | "completed" | "other";
}

export interface ItemTargetInput {
  householdId: string;
  itemId: string;
}

export type DeleteItemInput = ItemTargetInput;
export type RestoreItemInput = ItemTargetInput;

export interface BulkMoveCategoryInput {
  householdId: string;
  itemIds: string[];
  targetCategoryId: string;
}

export interface ItemListQuery {
  householdId: string;
  categoryId?: string;
  locationId?: string;
  status?: EventStatus;
  keyword?: string;
  deleted?: "active" | "recoverable";
}

export interface ItemEventDto extends ItemEventInput {
  id: string;
  itemId: string;
  householdId: string;
  status: EventStatus;
}

export interface ItemDto {
  id: string;
  householdId: string;
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  barcode?: string;
  brand?: string;
  specification?: string;
  locationId?: string;
  note?: string;
  imageFileId?: string;
  entryMethod: "manual" | "scan" | "ocr";
  status: EventStatus;
  nearestEventDate: string;
  processedStatus: ProcessItemInput["result"] | null;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  recoverableUntil: string | null;
}

export interface ItemDetailDto extends ItemDto {
  events: ItemEventDto[];
}

export interface ItemListDto {
  items: ItemDto[];
}
