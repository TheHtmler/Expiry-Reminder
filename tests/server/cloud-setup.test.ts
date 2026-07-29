import { describe, expect, it, vi } from "vitest";
import {
  ensureRequiredCollections,
  isMissingCollectionError,
  REQUIRED_COLLECTIONS,
} from "../../packages/server/src/cloud-setup";

describe("CloudBase 空环境初始化", () => {
  it("识别集合不存在错误", () => {
    expect(isMissingCollectionError(new Error("Collection users not exists")))
      .toBe(true);
    expect(isMissingCollectionError(new Error("网络暂时不可用"))).toBe(false);
  });

  it("创建全部必需集合并忽略已存在集合", async () => {
    const createCollection = vi.fn(async (name: string) => {
      if (name === "users") throw new Error("Collection already exists");
    });

    await ensureRequiredCollections({ createCollection });

    expect(createCollection).toHaveBeenCalledTimes(REQUIRED_COLLECTIONS.length);
  });
});
