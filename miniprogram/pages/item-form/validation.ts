import type { ItemEventInput } from "../../../packages/contracts/src/items";

export interface ItemDraftForValidation {
  name: string;
  categoryId: string;
  events: ItemEventInput[];
}

export function validateItemDraft(draft: ItemDraftForValidation) {
  const errors: Partial<Record<keyof ItemDraftForValidation, string>> = {};
  if (!draft.name.trim()) errors.name = "请输入物品名称";
  if (!draft.categoryId) errors.categoryId = "请选择分类";
  if (draft.events.length === 0 || draft.events.some((event) => !event.date)) {
    errors.events = "请至少填写一个日期";
  } else {
    const production = draft.events.find((event) => event.type === "production");
    const expiry = draft.events.find((event) => event.type === "expiry");
    if (production && expiry && expiry.date < production.date) {
      errors.events = "到期日期不能早于生产日期";
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
