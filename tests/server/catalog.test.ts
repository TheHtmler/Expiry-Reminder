import { beforeEach, describe, expect, it } from "vitest";
import { CatalogService } from "../../packages/server/src/catalog/service";
import { createMemoryRepositories } from "../support/memory-repositories";

const memberActor = { userId: "member", openId: "om" };
const outsider = { userId: "outsider", openId: "ox" };

describe("CatalogService", () => {
  let service: CatalogService;
  let repos: ReturnType<typeof createMemoryRepositories>;

  beforeEach(async () => {
    repos = createMemoryRepositories();
    service = new CatalogService(repos);
    await repos.members.insert({
      householdId: "h1",
      userId: "member",
      role: "member",
      status: "active",
      joinedAt: "2026-07-29T00:00:00.000Z",
    });
  });

  it("家庭修正资料优先于公共商品资料", async () => {
    repos.catalog.seedPublic({ barcode: "6901", name: "牛奶" });
    repos.catalog.seedHousehold({
      householdId: "h1",
      barcode: "6901",
      name: "儿童牛奶",
    });
    await expect(service.lookup(memberActor, "h1", "6901")).resolves.toMatchObject({
      name: "儿童牛奶",
      source: "household",
    });
  });

  it("无家庭修正时回退公共资料", async () => {
    repos.catalog.seedPublic({
      barcode: "6901",
      name: "牛奶",
      brand: "示例",
      specification: "250ml",
    });
    await expect(service.lookup(memberActor, "h1", "6901")).resolves.toMatchObject({
      name: "牛奶",
      brand: "示例",
      specification: "250ml",
      source: "public",
    });
  });

  it("无匹配时返回 null", async () => {
    await expect(service.lookup(memberActor, "h1", "0000")).resolves.toBeNull();
  });

  it("非家庭成员不可查询商品资料", async () => {
    await expect(service.lookup(outsider, "h1", "6901")).rejects.toThrow(
      "无权访问该家庭",
    );
  });

  it("条码、到期日和位置完全相同时返回合并候选", async () => {
    await repos.items.insert({
      id: "item-1",
      householdId: "h1",
      name: "牛奶",
      categoryId: "cat-1",
      quantity: 2,
      unit: "盒",
      barcode: "6901",
      locationId: "loc-1",
      entryMethod: "scan",
      status: "normal",
      nearestEventDate: "2026-08-01",
      processedStatus: null,
      version: 3,
      createdBy: "member",
      createdAt: "2026-07-29T00:00:00.000Z",
      updatedBy: "member",
      updatedAt: "2026-07-29T00:00:00.000Z",
      deletedAt: null,
      deletedBy: null,
      recoverableUntil: null,
    });

    await expect(
      service.findMergeCandidate(memberActor, {
        householdId: "h1",
        barcode: "6901",
        expiryDate: "2026-08-01",
        locationId: "loc-1",
      }),
    ).resolves.toMatchObject({
      itemId: "item-1",
      quantity: 2,
      version: 3,
    });
  });

  it("位置不同时不返回合并候选", async () => {
    await repos.items.insert({
      id: "item-1",
      householdId: "h1",
      name: "牛奶",
      categoryId: "cat-1",
      quantity: 2,
      unit: "盒",
      barcode: "6901",
      locationId: "loc-1",
      entryMethod: "scan",
      status: "normal",
      nearestEventDate: "2026-08-01",
      processedStatus: null,
      version: 1,
      createdBy: "member",
      createdAt: "2026-07-29T00:00:00.000Z",
      updatedBy: "member",
      updatedAt: "2026-07-29T00:00:00.000Z",
      deletedAt: null,
      deletedBy: null,
      recoverableUntil: null,
    });

    await expect(
      service.findMergeCandidate(memberActor, {
        householdId: "h1",
        barcode: "6901",
        expiryDate: "2026-08-01",
        locationId: "loc-2",
      }),
    ).resolves.toBeNull();
  });
});
