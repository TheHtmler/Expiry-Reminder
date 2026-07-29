import { describe, expect, it } from "vitest";
import {
  HouseholdService,
  SessionService,
} from "../../packages/server/src/households/service";
import { createMemoryRepositories } from "../support/memory-repositories";

describe("家庭创建与邀请流程", () => {
  it("邀请只允许使用一次，成员移除后立即失去访问权限", async () => {
    const repos = createMemoryRepositories();
    const now = new Date("2026-07-29T00:00:00.000Z");
    const service = new HouseholdService(repos, { now: () => now });
    const sessions = new SessionService(repos, { now: () => now });
    const admin = await sessions.bootstrap("admin-openid");
    const member = await sessions.bootstrap("member-openid");
    const household = await service.createHousehold(
      { userId: admin.user.id, openId: "admin-openid" },
      { name: "我们家", timezone: "Asia/Shanghai" },
    );
    const invite = await service.createInvite(
      { userId: admin.user.id, openId: "admin-openid" },
      { householdId: household.id },
    );

    await expect(
      service.acceptInvite(
        { userId: member.user.id, openId: "member-openid" },
        { token: invite.token },
      ),
    ).resolves.toMatchObject({
      householdId: household.id,
      userId: member.user.id,
      role: "member",
      status: "active",
    });
    await expect(
      service.acceptInvite(
        { userId: member.user.id, openId: "member-openid" },
        { token: invite.token },
      ),
    ).rejects.toThrow("邀请已失效");

    await service.removeMember(
      { userId: admin.user.id, openId: "admin-openid" },
      { householdId: household.id, userId: member.user.id },
    );
    await expect(
      service.assertMember(
        { userId: member.user.id, openId: "member-openid" },
        household.id,
      ),
    ).rejects.toThrow("无权访问该家庭");
  });
});
