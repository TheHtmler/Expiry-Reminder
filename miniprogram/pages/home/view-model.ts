import type { ItemDto } from "../../../packages/contracts/src/items";

const PRIORITY: Record<ItemDto["status"], number> = {
  expired: 0,
  due_today: 1,
  near_expiry: 2,
  normal: 3,
  processed: 4,
};

export function buildHomeViewModel(items: ItemDto[]) {
  const priorityItems = items
    .filter((item) => PRIORITY[item.status] <= PRIORITY.near_expiry)
    .sort(
      (left, right) =>
        PRIORITY[left.status] - PRIORITY[right.status] ||
        left.nearestEventDate.localeCompare(right.nearestEventDate),
    );
  return {
    summary: {
      expired: items.filter((item) => item.status === "expired").length,
      dueToday: items.filter((item) => item.status === "due_today").length,
      nearExpiry: items.filter((item) => item.status === "near_expiry").length,
    },
    priorityItems,
  };
}
