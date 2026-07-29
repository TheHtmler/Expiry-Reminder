import { describe, expect, it } from "vitest";
import { changeQuantity } from "../../packages/domain/src/quantity";

describe("changeQuantity", () => {
  it("数量归零后返回已用完", () => {
    expect(changeQuantity(1, -1)).toEqual({ quantity: 0, exhausted: true });
  });

  it("拒绝负数数量", () => {
    expect(() => changeQuantity(0, -1)).toThrow("数量不能小于零");
  });
});
