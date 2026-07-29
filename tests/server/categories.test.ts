import { beforeEach, describe, expect, it } from "vitest";
import { CategoryService } from "../../packages/server/src/categories/service";
import { HouseholdService } from "../../packages/server/src/households/service";
import { createMemoryRepositories } from "../support/memory-repositories";

const adminActor = { userId: "admin", openId: "oa" };
const memberActor = { userId: "member", openId: "om" };

describe("CategoryService", () => {
  let repos: ReturnType<typeof createMemoryRepositories>;
  let service: CategoryService;

  beforeEach(async () => {
    repos = createMemoryRepositories();
    service = new CategoryService(repos);
    await repos.members.insert({
      householdId: "h1",
      userId: "admin",
      role: "admin",
      status: "active",
      joinedAt: "2026-07-29T00:00:00.000Z",
    });
    await repos.members.insert({
      householdId: "h1",
      userId: "member",
      role: "member",
      status: "active",
      joinedAt: "2026-07-29T00:00:00.000Z",
    });
    await service.ensureDefaultCategories("h1");
  });

  it("重复初始化不会新增默认分类", async () => {
    await service.ensureDefaultCategories("h1");
    await expect(repos.categories.listByHousehold("h1")).resolves.toHaveLength(8);
  });

  it("创建家庭时自动初始化默认分类", async () => {
    const household = await new HouseholdService(repos).createHousehold(
      adminActor,
      { name: "新家庭", timezone: "Asia/Shanghai" },
    );
    await expect(
      repos.categories.listByHousehold(household.id),
    ).resolves.toHaveLength(8);
  });

  it("普通成员不能修改分类", async () => {
    await expect(
      service.saveCategory(memberActor, {
        householdId: "h1",
        name: "宠物用品",
        icon: "paw",
        color: "#9B7B5A",
      }),
    ).rejects.toThrow("仅管理员可管理分类");
  });

  it("排序必须包含家庭全部可见分类且不得重复", async () => {
    const categories = await service.listCategories(adminActor, "h1");
    await expect(
      service.reorderCategories(adminActor, {
        householdId: "h1",
        categoryIds: [categories[0]?.id ?? "", categories[0]?.id ?? ""],
      }),
    ).rejects.toThrow("分类排序数据无效");
  });
});
