export interface QuantityResult {
  quantity: number;
  exhausted: boolean;
}

export function changeQuantity(
  current: number,
  delta: number,
): QuantityResult {
  const quantity = current + delta;
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("数量不能小于零");
  }
  return { quantity, exhausted: quantity === 0 };
}
