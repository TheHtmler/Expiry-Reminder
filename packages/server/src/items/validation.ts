import type { CreateItemInput, ItemEventInput } from "../../../contracts/src/items";
import { ServiceError } from "../context";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateEvents(events: ItemEventInput[]): void {
  if (!Array.isArray(events) || events.length === 0) {
    throw new ServiceError("VALIDATION_ERROR", "请至少填写一个日期");
  }
  if (
    events.some(
      (event) =>
        !isValidDate(event.date) ||
        !Number.isInteger(event.thresholdDays) ||
        event.thresholdDays < 0,
    )
  ) {
    throw new ServiceError("VALIDATION_ERROR", "日期信息无效");
  }
  const production = events.find((event) => event.type === "production")?.date;
  const expiry = events.find((event) => event.type === "expiry")?.date;
  if (production && expiry && expiry < production) {
    throw new ServiceError("VALIDATION_ERROR", "到期日期不能早于生产日期");
  }
}

export function validateCreateItem(input: CreateItemInput): void {
  if (
    !input.requestId?.trim() ||
    !input.householdId?.trim() ||
    !input.name?.trim() ||
    !input.categoryId?.trim() ||
    !input.unit?.trim() ||
    !Number.isFinite(input.quantity) ||
    input.quantity < 0
  ) {
    throw new ServiceError("VALIDATION_ERROR", "物品信息无效");
  }
  validateEvents(input.events);
}
