import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "../../packages/domain/src/default-categories";

describe("DEFAULT_CATEGORIES", () => {
  it("提供八个固定默认分类", () => {
    expect(DEFAULT_CATEGORIES.map((item) => item.key)).toEqual([
      "food",
      "medicine",
      "beauty",
      "digital",
      "appliance",
      "household_supply",
      "document_service",
      "other",
    ]);
  });
});
