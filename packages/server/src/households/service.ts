import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Actor } from "../context";
import { ServiceError } from "../context";
import { CategoryService } from "../categories/service";
import type {
  HouseholdRecord,
  MemberRecord,
  Repositories,
  UserRecord,
} from "../repositories";

const INVITE_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_HOUSEHOLD_NAME = "我的家";
const DEFAULT_TIMEZONE = "Asia/Shanghai";

export interface ServiceOptions {
  now?: () => Date;
  createId?: (prefix: string) => string;
  createInviteToken?: () => string;
  afterHouseholdCreated?: (
    householdId: string,
    repos: Repositories,
  ) => Promise<void>;
}

export interface CreateHouseholdInput {
  name: string;
  timezone: string;
}

export interface CreateInviteInput {
  householdId: string;
}

export interface AcceptInviteInput {
  token: string;
}

export interface RemoveMemberInput {
  householdId: string;
  userId: string;
}

export interface TransferAdminInput {
  householdId: string;
  targetUserId: string;
}

export interface UpdateHouseholdSettingsInput {
  householdId: string;
  name?: string;
  timezone?: string;
  reminderHour?: number;
}

export interface DissolveHouseholdInput {
  householdId: string;
}

export interface InviteDto {
  id: string;
  householdId: string;
  token: string;
  expiresAt: string;
}

export interface HouseholdListItem extends HouseholdRecord {
  role: "admin" | "member";
}

export interface HouseholdMemberDto {
  userId: string;
  role: "admin" | "member";
  joinedAt: string;
  isSelf: boolean;
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("zh-CN", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class HouseholdService {
  private readonly now: () => Date;
  private readonly createId: (prefix: string) => string;
  private readonly createInviteToken: () => string;
  private readonly afterHouseholdCreated: (
    householdId: string,
    repos: Repositories,
  ) => Promise<void>;

  constructor(
    private readonly repos: Repositories,
    options: ServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? ((prefix) => `${prefix}_${randomUUID()}`);
    this.createInviteToken =
      options.createInviteToken ?? (() => randomBytes(32).toString("base64url"));
    this.afterHouseholdCreated =
      options.afterHouseholdCreated ??
      ((householdId, repos) =>
        new CategoryService(repos).ensureDefaultCategories(householdId));
  }

  async assertMember(
    actor: Actor,
    householdId: string,
    roles?: MemberRecord["role"][],
  ): Promise<MemberRecord> {
    const member = await this.repos.members.find(householdId, actor.userId);
    if (
      !member ||
      member.status !== "active" ||
      (roles && !roles.includes(member.role))
    ) {
      throw new ServiceError("FORBIDDEN", "无权访问该家庭");
    }
    return member;
  }

  async createHousehold(
    actor: Actor,
    input: CreateHouseholdInput,
  ): Promise<HouseholdRecord> {
    return this.repos.transaction((repos) =>
      this.insertHousehold(repos, actor, input),
    );
  }

  async ensureDefaultHousehold(actor: Actor): Promise<HouseholdRecord> {
    return this.repos.transaction(async (repos) => {
      const service = new HouseholdService(repos, {
        now: this.now,
        createId: this.createId,
        createInviteToken: this.createInviteToken,
        afterHouseholdCreated: this.afterHouseholdCreated,
      });
      const existing = await service.listHouseholds(actor);
      if (existing[0]) return existing[0];
      return service.insertHousehold(repos, actor, {
        name: DEFAULT_HOUSEHOLD_NAME,
        timezone: DEFAULT_TIMEZONE,
      });
    });
  }

  private async insertHousehold(
    repos: Repositories,
    actor: Actor,
    input: CreateHouseholdInput,
  ): Promise<HouseholdRecord> {
    const name = input.name.trim();
    if (!name || !isValidTimezone(input.timezone)) {
      throw new ServiceError("VALIDATION_ERROR", "家庭信息无效");
    }
    const timestamp = this.now().toISOString();
    const household: HouseholdRecord = {
      id: this.createId("household"),
      name,
      timezone: input.timezone,
      reminderHour: 9,
      createdBy: actor.userId,
      createdAt: timestamp,
      dissolvedAt: null,
    };
    await repos.households.insert(household);
    await repos.members.insert({
      householdId: household.id,
      userId: actor.userId,
      role: "admin",
      status: "active",
      joinedAt: timestamp,
    });
    await this.afterHouseholdCreated(household.id, repos);
    return household;
  }

  async listHouseholds(actor: Actor): Promise<HouseholdListItem[]> {
    const memberships = await this.repos.members.listActiveByUser(actor.userId);
    const households = await Promise.all(
      memberships.map(async (membership) => {
        const household = await this.repos.households.findById(
          membership.householdId,
        );
        if (!household || household.dissolvedAt) return null;
        return { ...household, role: membership.role };
      }),
    );
    return households.filter(
      (household): household is HouseholdListItem => household !== null,
    );
  }

  async createInvite(actor: Actor, input: CreateInviteInput): Promise<InviteDto> {
    await this.assertAdmin(actor, input.householdId, "仅管理员可邀请成员");
    const token = this.createInviteToken();
    const createdAt = this.now();
    const record = {
      id: this.createId("invite"),
      householdId: input.householdId,
      tokenHash: hashToken(token),
      createdBy: actor.userId,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + INVITE_LIFETIME_MS).toISOString(),
      usedAt: null,
      usedBy: null,
      revokedAt: null,
    };
    await this.repos.invites.insert(record);
    return {
      id: record.id,
      householdId: record.householdId,
      token,
      expiresAt: record.expiresAt,
    };
  }

  async listMembers(
    actor: Actor,
    householdId: string,
  ): Promise<HouseholdMemberDto[]> {
    await this.assertMember(actor, householdId);
    return (await this.repos.members.listByHousehold(householdId))
      .filter((member) => member.status === "active")
      .map((member) => ({
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
        isSelf: member.userId === actor.userId,
      }));
  }

  async acceptInvite(actor: Actor, input: AcceptInviteInput): Promise<MemberRecord> {
    if (!input.token) {
      throw new ServiceError("VALIDATION_ERROR", "邀请已失效");
    }
    const tokenHash = hashToken(input.token);
    return this.repos.transaction(async (repos) => {
      const invite = await repos.invites.findByTokenHash(tokenHash);
      if (
        !invite ||
        invite.usedAt ||
        invite.revokedAt ||
        new Date(invite.expiresAt).getTime() <= this.now().getTime()
      ) {
        throw new ServiceError("VALIDATION_ERROR", "邀请已失效");
      }
      const household = await repos.households.findById(invite.householdId);
      if (!household || household.dissolvedAt) {
        throw new ServiceError("NOT_FOUND", "家庭不存在");
      }
      const timestamp = this.now().toISOString();
      const existing = await repos.members.find(invite.householdId, actor.userId);
      const member: MemberRecord = {
        householdId: invite.householdId,
        userId: actor.userId,
        role: "member",
        status: "active",
        joinedAt: existing?.joinedAt ?? timestamp,
        removedAt: null,
      };
      if (existing) {
        await repos.members.update(invite.householdId, actor.userId, member);
      } else {
        await repos.members.insert(member);
      }
      await repos.invites.update(invite.id, {
        usedAt: timestamp,
        usedBy: actor.userId,
      });
      return member;
    });
  }

  async removeMember(actor: Actor, input: RemoveMemberInput): Promise<void> {
    await this.assertAdmin(actor, input.householdId, "仅管理员可移除成员");
    if (actor.userId === input.userId) {
      throw new ServiceError("VALIDATION_ERROR", "管理员不能移除自己");
    }
    const target = await this.repos.members.find(
      input.householdId,
      input.userId,
    );
    if (!target || target.status !== "active") {
      throw new ServiceError("NOT_FOUND", "家庭成员不存在");
    }
    await this.repos.members.update(input.householdId, input.userId, {
      status: "removed",
      removedAt: this.now().toISOString(),
    });
  }

  async transferAdmin(actor: Actor, input: TransferAdminInput): Promise<void> {
    await this.assertAdmin(actor, input.householdId, "仅管理员可转让管理员");
    if (actor.userId === input.targetUserId) {
      throw new ServiceError("VALIDATION_ERROR", "请选择其他家庭成员");
    }
    await this.repos.transaction(async (repos) => {
      const target = await repos.members.find(
        input.householdId,
        input.targetUserId,
      );
      if (!target || target.status !== "active") {
        throw new ServiceError("NOT_FOUND", "家庭成员不存在");
      }
      await repos.members.update(input.householdId, input.targetUserId, {
        role: "admin",
      });
      await repos.members.update(input.householdId, actor.userId, {
        role: "member",
      });
    });
  }

  async updateSettings(
    actor: Actor,
    input: UpdateHouseholdSettingsInput,
  ): Promise<HouseholdRecord> {
    await this.assertAdmin(actor, input.householdId, "仅管理员可修改家庭设置");
    const household = await this.repos.households.findById(input.householdId);
    if (!household || household.dissolvedAt) {
      throw new ServiceError("NOT_FOUND", "家庭不存在");
    }
    const name = input.name === undefined ? household.name : input.name.trim();
    const timezone = input.timezone ?? household.timezone;
    const reminderHour = input.reminderHour ?? household.reminderHour;
    if (
      !name ||
      !isValidTimezone(timezone) ||
      !Number.isInteger(reminderHour) ||
      reminderHour < 0 ||
      reminderHour > 23
    ) {
      throw new ServiceError("VALIDATION_ERROR", "家庭设置无效");
    }
    const update = { name, timezone, reminderHour };
    await this.repos.households.update(input.householdId, update);
    return { ...household, ...update };
  }

  async dissolveHousehold(
    actor: Actor,
    input: DissolveHouseholdInput,
  ): Promise<void> {
    await this.assertAdmin(actor, input.householdId, "仅管理员可解散家庭");
    const timestamp = this.now().toISOString();
    await this.repos.transaction(async (repos) => {
      const household = await repos.households.findById(input.householdId);
      if (!household || household.dissolvedAt) {
        throw new ServiceError("NOT_FOUND", "家庭不存在");
      }
      await repos.households.update(input.householdId, {
        dissolvedAt: timestamp,
      });
      const members = await repos.members.listByHousehold(input.householdId);
      for (const member of members) {
        await repos.members.update(input.householdId, member.userId, {
          status: "removed",
          removedAt: timestamp,
        });
      }
    });
  }

  private async assertAdmin(
    actor: Actor,
    householdId: string,
    message: string,
  ): Promise<MemberRecord> {
    const member = await this.repos.members.find(householdId, actor.userId);
    if (!member || member.status !== "active") {
      throw new ServiceError("FORBIDDEN", "无权访问该家庭");
    }
    if (member.role !== "admin") {
      throw new ServiceError("FORBIDDEN", message);
    }
    return member;
  }
}

export interface SessionDto {
  user: UserRecord;
  households: HouseholdListItem[];
}

export class SessionService {
  private readonly now: () => Date;
  private readonly createId: (prefix: string) => string;

  constructor(
    private readonly repos: Repositories,
    options: Pick<ServiceOptions, "now" | "createId"> = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  async bootstrap(openId: string): Promise<SessionDto> {
    if (!openId) {
      throw new ServiceError("UNAUTHENTICATED", "微信登录状态无效");
    }
    let user = await this.repos.users.findByOpenId(openId);
    if (!user) {
      user = {
        id: this.createId("user"),
        openId,
        status: "active",
        createdAt: this.now().toISOString(),
      };
      await this.repos.users.insert(user);
    }
    const actor = { userId: user.id, openId };
    const householdsService = new HouseholdService(this.repos, {
      now: this.now,
      createId: this.createId,
    });
    let households = await householdsService.listHouseholds(actor);
    if (households.length === 0) {
      await householdsService.ensureDefaultHousehold(actor);
      households = await householdsService.listHouseholds(actor);
    }
    return { user, households };
  }
}
