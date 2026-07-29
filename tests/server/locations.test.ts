import { beforeEach, describe, expect, it } from "vitest";
import { LocationService } from "../../packages/server/src/locations/service";
import { createMemoryRepositories } from "../support/memory-repositories";

const adminActor = { userId: "admin", openId: "oa" };
const memberActor = { userId: "member", openId: "om" };

describe("LocationService", () => {
  let service: LocationService;

  beforeEach(async () => {
    const repos = createMemoryRepositories();
    service = new LocationService(repos);
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
  });

  it("普通成员只能读取位置", async () => {
    await expect(
      service.saveLocation(memberActor, {
        householdId: "h1",
        name: "冰箱",
      }),
    ).rejects.toThrow("仅管理员可管理位置");
  });

  it("同一家庭的位置名称去除空格后不得重复", async () => {
    await service.saveLocation(adminActor, {
      householdId: "h1",
      name: "冰箱",
    });
    await expect(
      service.saveLocation(adminActor, {
        householdId: "h1",
        name: "  冰箱  ",
      }),
    ).rejects.toThrow("位置名称已存在");
  });
});
