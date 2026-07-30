import { describe, expect, it } from "vitest";
import { buildDraftProductImagePath } from "../../miniprogram/services/media-service";

describe("商品图草稿路径", () => {
  it("按家庭与 requestId 生成隔离路径", () => {
    expect(buildDraftProductImagePath({
      householdId: "home-1",
      requestId: "req-abc",
      timestamp: 1_700_000_000_000,
      extension: "png",
    })).toBe("households/home-1/drafts/req-abc/product/1700000000000.png");
  });

  it("规范化扩展名并默认使用 jpg", () => {
    expect(buildDraftProductImagePath({
      householdId: "home-1",
      requestId: "req-1",
      timestamp: 42,
      extension: ".JPEG",
    })).toBe("households/home-1/drafts/req-1/product/42.jpeg");

    expect(buildDraftProductImagePath({
      householdId: "home-1",
      requestId: "req-1",
      timestamp: 42,
    })).toBe("households/home-1/drafts/req-1/product/42.jpg");
  });
});
