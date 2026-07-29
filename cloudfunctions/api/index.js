"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/server/src/index.ts
var index_exports = {};
__export(index_exports, {
  createRouter: () => createRouter,
  main: () => main
});
module.exports = __toCommonJS(index_exports);

// packages/server/src/categories/service.ts
var import_node_crypto = require("node:crypto");

// packages/domain/src/default-categories.ts
var DEFAULT_CATEGORIES = [
  {
    key: "food",
    name: "\u98DF\u54C1\u996E\u6599",
    icon: "food",
    color: "#E98A5F",
    defaultThresholdDays: 7
  },
  {
    key: "medicine",
    name: "\u836F\u54C1\u4FDD\u5065",
    icon: "medicine",
    color: "#D56F6F",
    defaultThresholdDays: 7
  },
  {
    key: "beauty",
    name: "\u7F8E\u5986\u4E2A\u62A4",
    icon: "beauty",
    color: "#C9819F",
    defaultThresholdDays: 7
  },
  {
    key: "digital",
    name: "\u6570\u7801\u4EA7\u54C1",
    icon: "digital",
    color: "#4F7E9D",
    defaultThresholdDays: 30
  },
  {
    key: "appliance",
    name: "\u5BB6\u7528\u7535\u5668",
    icon: "appliance",
    color: "#4F8B72",
    defaultThresholdDays: 30
  },
  {
    key: "household_supply",
    name: "\u5BB6\u5EAD\u8017\u6750",
    icon: "household-supply",
    color: "#A77A52",
    defaultThresholdDays: 7
  },
  {
    key: "document_service",
    name: "\u8BC1\u4EF6\u4E0E\u670D\u52A1",
    icon: "document-service",
    color: "#6C7293",
    defaultThresholdDays: 30
  },
  {
    key: "other",
    name: "\u5176\u4ED6",
    icon: "other",
    color: "#747B74",
    defaultThresholdDays: 7
  }
];

// packages/server/src/context.ts
var ServiceError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "ServiceError";
  }
};

// packages/server/src/categories/service.ts
var CategoryService = class {
  constructor(repos, createId = (prefix) => `${prefix}_${(0, import_node_crypto.randomUUID)()}`) {
    this.repos = repos;
    this.createId = createId;
  }
  async ensureDefaultCategories(householdId) {
    for (const [sortOrder, category] of DEFAULT_CATEGORIES.entries()) {
      const existing = await this.repos.categories.findBySystemKey(
        householdId,
        category.key
      );
      if (existing) continue;
      await this.repos.categories.insert({
        id: `category_${householdId}_${category.key}`,
        householdId,
        source: "system",
        systemKey: category.key,
        name: category.name,
        icon: category.icon,
        color: category.color,
        defaultThresholdDays: category.defaultThresholdDays,
        sortOrder,
        hidden: false,
        status: "active"
      });
    }
  }
  async listCategories(actor, householdId) {
    await this.assertActiveMember(actor, householdId);
    const categories = await this.repos.categories.listByHousehold(householdId);
    return categories.sort(
      (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
    );
  }
  async saveCategory(actor, input) {
    await this.assertAdmin(actor, input.householdId);
    const name = input.name.trim();
    const icon = input.icon.trim();
    if (!name || !icon || !/^#[0-9A-Fa-f]{6}$/.test(input.color) || input.defaultThresholdDays !== void 0 && (!Number.isInteger(input.defaultThresholdDays) || input.defaultThresholdDays < 0)) {
      throw new ServiceError("VALIDATION_ERROR", "\u5206\u7C7B\u4FE1\u606F\u65E0\u6548");
    }
    if (input.id) {
      const existing = await this.repos.categories.findById(input.id);
      if (!existing || existing.householdId !== input.householdId) {
        throw new ServiceError("NOT_FOUND", "\u5206\u7C7B\u4E0D\u5B58\u5728");
      }
      const update = {
        name,
        icon,
        color: input.color.toUpperCase(),
        hidden: input.hidden ?? existing.hidden,
        defaultThresholdDays: input.defaultThresholdDays ?? existing.defaultThresholdDays
      };
      await this.repos.categories.update(existing.id, update);
      return { ...existing, ...update };
    }
    const categories = await this.repos.categories.listByHousehold(
      input.householdId
    );
    const record = {
      id: this.createId("category"),
      householdId: input.householdId,
      source: "custom",
      name,
      icon,
      color: input.color.toUpperCase(),
      defaultThresholdDays: input.defaultThresholdDays ?? 7,
      sortOrder: categories.length,
      hidden: input.hidden ?? false,
      status: "active"
    };
    await this.repos.categories.insert(record);
    return record;
  }
  async reorderCategories(actor, input) {
    await this.assertAdmin(actor, input.householdId);
    const visible = (await this.repos.categories.listByHousehold(
      input.householdId
    )).filter((category) => !category.hidden);
    const visibleIds = new Set(visible.map((category) => category.id));
    const requestedIds = new Set(input.categoryIds);
    if (requestedIds.size !== input.categoryIds.length || requestedIds.size !== visibleIds.size || [...requestedIds].some((id) => !visibleIds.has(id))) {
      throw new ServiceError("VALIDATION_ERROR", "\u5206\u7C7B\u6392\u5E8F\u6570\u636E\u65E0\u6548");
    }
    await this.repos.transaction(async (repos) => {
      for (const [sortOrder, id] of input.categoryIds.entries()) {
        await repos.categories.update(id, { sortOrder });
      }
    });
  }
  async assertActiveMember(actor, householdId) {
    const member = await this.repos.members.find(householdId, actor.userId);
    if (!member || member.status !== "active") {
      throw new ServiceError("FORBIDDEN", "\u65E0\u6743\u8BBF\u95EE\u8BE5\u5BB6\u5EAD");
    }
    return member;
  }
  async assertAdmin(actor, householdId) {
    const member = await this.assertActiveMember(actor, householdId);
    if (member.role !== "admin") {
      throw new ServiceError("FORBIDDEN", "\u4EC5\u7BA1\u7406\u5458\u53EF\u7BA1\u7406\u5206\u7C7B");
    }
  }
};

// packages/server/src/cloud-setup.ts
var REQUIRED_COLLECTIONS = [
  "users",
  "households",
  "household_members",
  "household_invites",
  "idempotency_keys",
  "categories",
  "locations",
  "items",
  "item_events"
];
function errorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const candidate = error;
    if (typeof candidate.errMsg === "string") return candidate.errMsg;
    if (typeof candidate.message === "string") return candidate.message;
  }
  return "";
}
function isMissingCollectionError(error) {
  return /(?:collection|集合).*(?:not exist|does not exist|不存在)/i.test(
    errorMessage(error)
  );
}
function isExistingCollectionError(error) {
  return /(?:collection|集合).*(?:already exist|已存在)/i.test(
    errorMessage(error)
  );
}
async function ensureRequiredCollections(database) {
  await Promise.all(
    REQUIRED_COLLECTIONS.map(async (name) => {
      try {
        await database.createCollection(name);
      } catch (error) {
        if (!isExistingCollectionError(error)) throw error;
      }
    })
  );
}

// packages/server/src/households/service.ts
var import_node_crypto2 = require("node:crypto");
var INVITE_LIFETIME_MS = 24 * 60 * 60 * 1e3;
var DEFAULT_HOUSEHOLD_NAME = "\u6211\u7684\u5BB6";
var DEFAULT_TIMEZONE = "Asia/Shanghai";
function isValidTimezone(value) {
  try {
    new Intl.DateTimeFormat("zh-CN", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
function hashToken(token) {
  return (0, import_node_crypto2.createHash)("sha256").update(token).digest("hex");
}
var HouseholdService = class _HouseholdService {
  constructor(repos, options = {}) {
    this.repos = repos;
    this.now = options.now ?? (() => /* @__PURE__ */ new Date());
    this.createId = options.createId ?? ((prefix) => `${prefix}_${(0, import_node_crypto2.randomUUID)()}`);
    this.createInviteToken = options.createInviteToken ?? (() => (0, import_node_crypto2.randomBytes)(32).toString("base64url"));
    this.afterHouseholdCreated = options.afterHouseholdCreated ?? ((householdId, repos2) => new CategoryService(repos2).ensureDefaultCategories(householdId));
  }
  async assertMember(actor, householdId, roles) {
    const member = await this.repos.members.find(householdId, actor.userId);
    if (!member || member.status !== "active" || roles && !roles.includes(member.role)) {
      throw new ServiceError("FORBIDDEN", "\u65E0\u6743\u8BBF\u95EE\u8BE5\u5BB6\u5EAD");
    }
    return member;
  }
  async createHousehold(actor, input) {
    return this.repos.transaction(
      (repos) => this.insertHousehold(repos, actor, input)
    );
  }
  async ensureDefaultHousehold(actor) {
    return this.repos.transaction(async (repos) => {
      const service = new _HouseholdService(repos, {
        now: this.now,
        createId: this.createId,
        createInviteToken: this.createInviteToken,
        afterHouseholdCreated: this.afterHouseholdCreated
      });
      const existing = await service.listHouseholds(actor);
      if (existing[0]) return existing[0];
      return service.insertHousehold(repos, actor, {
        name: DEFAULT_HOUSEHOLD_NAME,
        timezone: DEFAULT_TIMEZONE
      });
    });
  }
  async insertHousehold(repos, actor, input) {
    const name = input.name.trim();
    if (!name || !isValidTimezone(input.timezone)) {
      throw new ServiceError("VALIDATION_ERROR", "\u5BB6\u5EAD\u4FE1\u606F\u65E0\u6548");
    }
    const timestamp = this.now().toISOString();
    const household = {
      id: this.createId("household"),
      name,
      timezone: input.timezone,
      reminderHour: 9,
      createdBy: actor.userId,
      createdAt: timestamp,
      dissolvedAt: null
    };
    await repos.households.insert(household);
    await repos.members.insert({
      householdId: household.id,
      userId: actor.userId,
      role: "admin",
      status: "active",
      joinedAt: timestamp
    });
    await this.afterHouseholdCreated(household.id, repos);
    return household;
  }
  async listHouseholds(actor) {
    const memberships = await this.repos.members.listActiveByUser(actor.userId);
    const households = await Promise.all(
      memberships.map(async (membership) => {
        const household = await this.repos.households.findById(
          membership.householdId
        );
        if (!household || household.dissolvedAt) return null;
        return { ...household, role: membership.role };
      })
    );
    return households.filter(
      (household) => household !== null
    );
  }
  async createInvite(actor, input) {
    await this.assertAdmin(actor, input.householdId, "\u4EC5\u7BA1\u7406\u5458\u53EF\u9080\u8BF7\u6210\u5458");
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
      revokedAt: null
    };
    await this.repos.invites.insert(record);
    return {
      id: record.id,
      householdId: record.householdId,
      token,
      expiresAt: record.expiresAt
    };
  }
  async listMembers(actor, householdId) {
    await this.assertMember(actor, householdId);
    return (await this.repos.members.listByHousehold(householdId)).filter((member) => member.status === "active").map((member) => ({
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      isSelf: member.userId === actor.userId
    }));
  }
  async acceptInvite(actor, input) {
    if (!input.token) {
      throw new ServiceError("VALIDATION_ERROR", "\u9080\u8BF7\u5DF2\u5931\u6548");
    }
    const tokenHash = hashToken(input.token);
    return this.repos.transaction(async (repos) => {
      const invite = await repos.invites.findByTokenHash(tokenHash);
      if (!invite || invite.usedAt || invite.revokedAt || new Date(invite.expiresAt).getTime() <= this.now().getTime()) {
        throw new ServiceError("VALIDATION_ERROR", "\u9080\u8BF7\u5DF2\u5931\u6548");
      }
      const household = await repos.households.findById(invite.householdId);
      if (!household || household.dissolvedAt) {
        throw new ServiceError("NOT_FOUND", "\u5BB6\u5EAD\u4E0D\u5B58\u5728");
      }
      const timestamp = this.now().toISOString();
      const existing = await repos.members.find(invite.householdId, actor.userId);
      const member = {
        householdId: invite.householdId,
        userId: actor.userId,
        role: "member",
        status: "active",
        joinedAt: existing?.joinedAt ?? timestamp,
        removedAt: null
      };
      if (existing) {
        await repos.members.update(invite.householdId, actor.userId, member);
      } else {
        await repos.members.insert(member);
      }
      await repos.invites.update(invite.id, {
        usedAt: timestamp,
        usedBy: actor.userId
      });
      return member;
    });
  }
  async removeMember(actor, input) {
    await this.assertAdmin(actor, input.householdId, "\u4EC5\u7BA1\u7406\u5458\u53EF\u79FB\u9664\u6210\u5458");
    if (actor.userId === input.userId) {
      throw new ServiceError("VALIDATION_ERROR", "\u7BA1\u7406\u5458\u4E0D\u80FD\u79FB\u9664\u81EA\u5DF1");
    }
    const target = await this.repos.members.find(
      input.householdId,
      input.userId
    );
    if (!target || target.status !== "active") {
      throw new ServiceError("NOT_FOUND", "\u5BB6\u5EAD\u6210\u5458\u4E0D\u5B58\u5728");
    }
    await this.repos.members.update(input.householdId, input.userId, {
      status: "removed",
      removedAt: this.now().toISOString()
    });
  }
  async transferAdmin(actor, input) {
    await this.assertAdmin(actor, input.householdId, "\u4EC5\u7BA1\u7406\u5458\u53EF\u8F6C\u8BA9\u7BA1\u7406\u5458");
    if (actor.userId === input.targetUserId) {
      throw new ServiceError("VALIDATION_ERROR", "\u8BF7\u9009\u62E9\u5176\u4ED6\u5BB6\u5EAD\u6210\u5458");
    }
    await this.repos.transaction(async (repos) => {
      const target = await repos.members.find(
        input.householdId,
        input.targetUserId
      );
      if (!target || target.status !== "active") {
        throw new ServiceError("NOT_FOUND", "\u5BB6\u5EAD\u6210\u5458\u4E0D\u5B58\u5728");
      }
      await repos.members.update(input.householdId, input.targetUserId, {
        role: "admin"
      });
      await repos.members.update(input.householdId, actor.userId, {
        role: "member"
      });
    });
  }
  async updateSettings(actor, input) {
    await this.assertAdmin(actor, input.householdId, "\u4EC5\u7BA1\u7406\u5458\u53EF\u4FEE\u6539\u5BB6\u5EAD\u8BBE\u7F6E");
    const household = await this.repos.households.findById(input.householdId);
    if (!household || household.dissolvedAt) {
      throw new ServiceError("NOT_FOUND", "\u5BB6\u5EAD\u4E0D\u5B58\u5728");
    }
    const name = input.name === void 0 ? household.name : input.name.trim();
    const timezone = input.timezone ?? household.timezone;
    const reminderHour = input.reminderHour ?? household.reminderHour;
    if (!name || !isValidTimezone(timezone) || !Number.isInteger(reminderHour) || reminderHour < 8 || reminderHour > 20) {
      throw new ServiceError("VALIDATION_ERROR", "\u5BB6\u5EAD\u8BBE\u7F6E\u65E0\u6548");
    }
    const update = { name, timezone, reminderHour };
    await this.repos.households.update(input.householdId, update);
    return { ...household, ...update };
  }
  async dissolveHousehold(actor, input) {
    await this.assertAdmin(actor, input.householdId, "\u4EC5\u7BA1\u7406\u5458\u53EF\u89E3\u6563\u5BB6\u5EAD");
    const timestamp = this.now().toISOString();
    await this.repos.transaction(async (repos) => {
      const household = await repos.households.findById(input.householdId);
      if (!household || household.dissolvedAt) {
        throw new ServiceError("NOT_FOUND", "\u5BB6\u5EAD\u4E0D\u5B58\u5728");
      }
      await repos.households.update(input.householdId, {
        dissolvedAt: timestamp
      });
      const members = await repos.members.listByHousehold(input.householdId);
      for (const member of members) {
        await repos.members.update(input.householdId, member.userId, {
          status: "removed",
          removedAt: timestamp
        });
      }
    });
  }
  async assertAdmin(actor, householdId, message) {
    const member = await this.repos.members.find(householdId, actor.userId);
    if (!member || member.status !== "active") {
      throw new ServiceError("FORBIDDEN", "\u65E0\u6743\u8BBF\u95EE\u8BE5\u5BB6\u5EAD");
    }
    if (member.role !== "admin") {
      throw new ServiceError("FORBIDDEN", message);
    }
    return member;
  }
};
var SessionService = class {
  constructor(repos, options = {}) {
    this.repos = repos;
    this.now = options.now ?? (() => /* @__PURE__ */ new Date());
    this.createId = options.createId ?? ((prefix) => `${prefix}_${(0, import_node_crypto2.randomUUID)()}`);
  }
  async bootstrap(openId) {
    if (!openId) {
      throw new ServiceError("UNAUTHENTICATED", "\u5FAE\u4FE1\u767B\u5F55\u72B6\u6001\u65E0\u6548");
    }
    let user = await this.repos.users.findByOpenId(openId);
    if (!user) {
      user = {
        id: this.createId("user"),
        openId,
        status: "active",
        createdAt: this.now().toISOString()
      };
      await this.repos.users.insert(user);
    }
    const actor = { userId: user.id, openId };
    const householdsService = new HouseholdService(this.repos, {
      now: this.now,
      createId: this.createId
    });
    let households = await householdsService.listHouseholds(actor);
    if (households.length === 0) {
      await householdsService.ensureDefaultHousehold(actor);
      households = await householdsService.listHouseholds(actor);
    }
    return { user, households };
  }
};

// packages/server/src/locations/service.ts
var import_node_crypto3 = require("node:crypto");
var LocationService = class {
  constructor(repos, createId = (prefix) => `${prefix}_${(0, import_node_crypto3.randomUUID)()}`) {
    this.repos = repos;
    this.createId = createId;
  }
  async listLocations(actor, householdId) {
    await this.assertActiveMember(actor, householdId);
    const locations = await this.repos.locations.listByHousehold(householdId);
    return locations.sort(
      (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
    );
  }
  async saveLocation(actor, input) {
    await this.assertAdmin(actor, input.householdId);
    const name = input.name.trim();
    if (!name || input.sortOrder !== void 0 && (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)) {
      throw new ServiceError("VALIDATION_ERROR", "\u4F4D\u7F6E\u4FE1\u606F\u65E0\u6548");
    }
    const duplicate = await this.repos.locations.findByName(
      input.householdId,
      name
    );
    if (duplicate && duplicate.id !== input.id) {
      throw new ServiceError("CONFLICT", "\u4F4D\u7F6E\u540D\u79F0\u5DF2\u5B58\u5728");
    }
    if (input.id) {
      const existing = await this.repos.locations.findById(input.id);
      if (!existing || existing.householdId !== input.householdId) {
        throw new ServiceError("NOT_FOUND", "\u4F4D\u7F6E\u4E0D\u5B58\u5728");
      }
      const update = {
        name,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        hidden: input.hidden ?? existing.hidden
      };
      await this.repos.locations.update(existing.id, update);
      return { ...existing, ...update };
    }
    const locations = await this.repos.locations.listByHousehold(
      input.householdId
    );
    const record = {
      id: this.createId("location"),
      householdId: input.householdId,
      name,
      sortOrder: input.sortOrder ?? locations.length,
      hidden: input.hidden ?? false,
      status: "active"
    };
    await this.repos.locations.insert(record);
    return record;
  }
  async assertActiveMember(actor, householdId) {
    const member = await this.repos.members.find(householdId, actor.userId);
    if (!member || member.status !== "active") {
      throw new ServiceError("FORBIDDEN", "\u65E0\u6743\u8BBF\u95EE\u8BE5\u5BB6\u5EAD");
    }
    return member;
  }
  async assertAdmin(actor, householdId) {
    const member = await this.assertActiveMember(actor, householdId);
    if (member.role !== "admin") {
      throw new ServiceError("FORBIDDEN", "\u4EC5\u7BA1\u7406\u5458\u53EF\u7BA1\u7406\u4F4D\u7F6E");
    }
  }
};

// packages/server/src/items/service.ts
var import_node_crypto4 = require("node:crypto");

// packages/domain/src/date-status.ts
var DAY_MS = 864e5;
function parseDate(value) {
  const [year = Number.NaN, month = Number.NaN, day = Number.NaN] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
function calculateEventStatus(input) {
  if (input.processed) return "processed";
  const days = Math.round(
    (parseDate(input.eventDate) - parseDate(input.today)) / DAY_MS
  );
  if (days < 0) return "expired";
  if (days === 0) return "due_today";
  if (days <= input.thresholdDays) return "near_expiry";
  return "normal";
}

// packages/domain/src/quantity.ts
function changeQuantity(current, delta) {
  const quantity = current + delta;
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("\u6570\u91CF\u4E0D\u80FD\u5C0F\u4E8E\u96F6");
  }
  return { quantity, exhausted: quantity === 0 };
}

// packages/server/src/items/validation.ts
var ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(value) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validateEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new ServiceError("VALIDATION_ERROR", "\u8BF7\u81F3\u5C11\u586B\u5199\u4E00\u4E2A\u65E5\u671F");
  }
  if (events.some(
    (event) => !isValidDate(event.date) || !Number.isInteger(event.thresholdDays) || event.thresholdDays < 0
  )) {
    throw new ServiceError("VALIDATION_ERROR", "\u65E5\u671F\u4FE1\u606F\u65E0\u6548");
  }
  const production = events.find((event) => event.type === "production")?.date;
  const expiry = events.find((event) => event.type === "expiry")?.date;
  if (production && expiry && expiry < production) {
    throw new ServiceError("VALIDATION_ERROR", "\u5230\u671F\u65E5\u671F\u4E0D\u80FD\u65E9\u4E8E\u751F\u4EA7\u65E5\u671F");
  }
}
function validateCreateItem(input) {
  if (!input.requestId?.trim() || !input.householdId?.trim() || !input.name?.trim() || !input.categoryId?.trim() || !input.unit?.trim() || !Number.isFinite(input.quantity) || input.quantity < 0) {
    throw new ServiceError("VALIDATION_ERROR", "\u7269\u54C1\u4FE1\u606F\u65E0\u6548");
  }
  validateEvents(input.events);
}

// packages/server/src/items/service.ts
var STATUS_PRIORITY = {
  expired: 0,
  due_today: 1,
  near_expiry: 2,
  normal: 3,
  processed: 4
};
function localDate(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function addDays(date, days) {
  return new Date(date.getTime() + days * 864e5);
}
var ItemService = class {
  constructor(repos, options = {}) {
    this.repos = repos;
    this.now = options.now ?? (() => /* @__PURE__ */ new Date());
    this.createId = options.createId ?? ((prefix) => `${prefix}_${(0, import_node_crypto4.randomUUID)()}`);
  }
  async createItem(actor, input) {
    validateCreateItem(input);
    await this.assertMember(actor, input.householdId);
    const existing = await this.repos.idempotency.find(
      this.idempotencyKey(input.householdId, input.requestId)
    );
    if (existing && typeof existing.value === "string") {
      return this.getDetailUnchecked(existing.value, input.householdId);
    }
    const household = await this.requireHousehold(input.householdId);
    await this.requireCategory(input.householdId, input.categoryId);
    if (input.locationId) {
      await this.requireLocation(input.householdId, input.locationId);
    }
    const timestamp = this.now().toISOString();
    const itemId = this.createId("item");
    const events = this.buildEvents(
      input.householdId,
      itemId,
      input.events,
      household
    );
    if (input.quantity === 0) {
      for (const event of events) event.status = "processed";
    }
    const item = this.buildItem(actor, input, itemId, events, timestamp);
    await this.repos.transaction(async (repos) => {
      const key = this.idempotencyKey(input.householdId, input.requestId);
      const duplicate = await repos.idempotency.find(key);
      if (duplicate) return;
      await repos.items.insert(item);
      await repos.itemEvents.insertMany(events);
      await repos.idempotency.insert({ key, value: item.id });
    });
    const stored = await this.repos.idempotency.find(
      this.idempotencyKey(input.householdId, input.requestId)
    );
    if (!stored || typeof stored.value !== "string") {
      throw new ServiceError("INTERNAL_ERROR", "\u7269\u54C1\u4FDD\u5B58\u5931\u8D25");
    }
    return this.getDetailUnchecked(stored.value, input.householdId);
  }
  async updateItem(actor, input) {
    await this.assertMember(actor, input.householdId);
    const existing = await this.requireActiveItem(input.householdId, input.itemId);
    const household = await this.requireHousehold(input.householdId);
    const categoryId = input.categoryId ?? existing.categoryId;
    await this.requireCategory(input.householdId, categoryId);
    if (input.locationId) {
      await this.requireLocation(input.householdId, input.locationId);
    }
    const events = input.events ? (validateEvents(input.events), this.buildEvents(input.householdId, existing.id, input.events, household)) : await this.repos.itemEvents.listByItem(existing.id);
    const name = input.name?.trim() ?? existing.name;
    const unit = input.unit?.trim() ?? existing.unit;
    const quantity = input.quantity ?? existing.quantity;
    if (!name || !unit || !Number.isFinite(quantity) || quantity < 0) {
      throw new ServiceError("VALIDATION_ERROR", "\u7269\u54C1\u4FE1\u606F\u65E0\u6548");
    }
    const timestamp = this.now().toISOString();
    const update = {
      name,
      unit,
      quantity,
      categoryId,
      barcode: input.barcode ?? existing.barcode,
      brand: input.brand ?? existing.brand,
      specification: input.specification ?? existing.specification,
      locationId: input.locationId ?? existing.locationId,
      note: input.note ?? existing.note,
      imageFileId: input.imageFileId ?? existing.imageFileId,
      entryMethod: input.entryMethod ?? existing.entryMethod,
      nearestEventDate: this.nearestEventDate(events),
      status: this.overallStatus(events),
      version: existing.version + 1,
      updatedBy: actor.userId,
      updatedAt: timestamp
    };
    await this.repos.transaction(async (repos) => {
      await repos.items.update(existing.id, update);
      if (input.events) await repos.itemEvents.replaceByItem(existing.id, events);
    });
    return this.getDetailUnchecked(existing.id, input.householdId);
  }
  async changeQuantity(actor, input) {
    await this.assertMember(actor, input.householdId);
    await this.repos.transaction(async (repos) => {
      const item = await repos.items.findById(input.itemId);
      if (!item || item.householdId !== input.householdId || item.deletedAt) {
        throw new ServiceError("NOT_FOUND", "\u7269\u54C1\u4E0D\u5B58\u5728");
      }
      const result = changeQuantity(item.quantity, input.delta);
      const timestamp = this.now().toISOString();
      let status = item.status;
      let processedStatus = item.processedStatus;
      if (result.exhausted) {
        status = "processed";
        processedStatus = "used_up";
        await repos.itemEvents.updateByItem(item.id, { status: "processed" });
      } else if (item.processedStatus === "used_up") {
        const household = await repos.households.findById(input.householdId);
        if (!household || household.dissolvedAt) {
          throw new ServiceError("NOT_FOUND", "\u5BB6\u5EAD\u4E0D\u5B58\u5728");
        }
        const today = localDate(this.now(), household.timezone);
        const events = (await repos.itemEvents.listByItem(item.id)).map((event) => ({
          ...event,
          status: calculateEventStatus({
            today,
            eventDate: event.date,
            thresholdDays: event.thresholdDays,
            processed: false
          })
        }));
        status = this.overallStatus(events);
        processedStatus = null;
        await repos.itemEvents.replaceByItem(item.id, events);
      }
      const updated = await repos.items.updateOptimistic(
        item.id,
        input.householdId,
        input.expectedVersion,
        {
          quantity: result.quantity,
          processedStatus,
          status,
          version: input.expectedVersion + 1,
          updatedBy: actor.userId,
          updatedAt: timestamp
        }
      );
      if (!updated) {
        throw new ServiceError("CONFLICT", "\u7269\u54C1\u6570\u91CF\u5DF2\u53D1\u751F\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");
      }
    });
    return this.getDetailUnchecked(input.itemId, input.householdId);
  }
  async processItem(actor, input) {
    await this.assertMember(actor, input.householdId);
    if (!["used_up", "discarded", "completed", "other"].includes(input.result)) {
      throw new ServiceError("VALIDATION_ERROR", "\u5904\u7406\u7ED3\u679C\u65E0\u6548");
    }
    const item = await this.requireActiveItem(input.householdId, input.itemId);
    const timestamp = this.now().toISOString();
    await this.repos.transaction(async (repos) => {
      await repos.items.update(item.id, {
        processedStatus: input.result,
        status: "processed",
        version: item.version + 1,
        updatedBy: actor.userId,
        updatedAt: timestamp
      });
      await repos.itemEvents.updateByItem(item.id, { status: "processed" });
    });
    return this.getDetailUnchecked(item.id, input.householdId);
  }
  async deleteItem(actor, input) {
    await this.assertAdmin(actor, input.householdId, "\u4EC5\u7BA1\u7406\u5458\u53EF\u5220\u9664\u7269\u54C1");
    const item = await this.requireActiveItem(input.householdId, input.itemId);
    const deletedAt = this.now();
    await this.repos.items.update(item.id, {
      deletedAt: deletedAt.toISOString(),
      deletedBy: actor.userId,
      recoverableUntil: addDays(deletedAt, 30).toISOString(),
      version: item.version + 1,
      updatedBy: actor.userId,
      updatedAt: deletedAt.toISOString()
    });
  }
  async restoreItem(actor, input) {
    await this.assertAdmin(actor, input.householdId, "\u4EC5\u7BA1\u7406\u5458\u53EF\u6062\u590D\u7269\u54C1");
    const item = await this.requireItem(input.householdId, input.itemId);
    if (!item.deletedAt || !item.recoverableUntil || new Date(item.recoverableUntil).getTime() < this.now().getTime()) {
      throw new ServiceError("VALIDATION_ERROR", "\u7269\u54C1\u5DF2\u8D85\u8FC7\u53EF\u6062\u590D\u671F\u9650");
    }
    const timestamp = this.now().toISOString();
    await this.repos.items.update(item.id, {
      deletedAt: null,
      deletedBy: null,
      recoverableUntil: null,
      version: item.version + 1,
      updatedBy: actor.userId,
      updatedAt: timestamp
    });
    return this.getDetailUnchecked(item.id, input.householdId);
  }
  async bulkMoveCategory(actor, input) {
    await this.assertAdmin(actor, input.householdId, "\u4EC5\u7BA1\u7406\u5458\u53EF\u6279\u91CF\u79FB\u52A8\u7269\u54C1");
    await this.requireCategory(input.householdId, input.targetCategoryId);
    if (input.itemIds.length === 0 || new Set(input.itemIds).size !== input.itemIds.length) {
      throw new ServiceError("VALIDATION_ERROR", "\u7269\u54C1\u5217\u8868\u65E0\u6548");
    }
    const items = await Promise.all(
      input.itemIds.map((id) => this.requireActiveItem(input.householdId, id))
    );
    const timestamp = this.now().toISOString();
    await this.repos.transaction(async (repos) => {
      for (const item of items) {
        await repos.items.update(item.id, {
          categoryId: input.targetCategoryId,
          version: item.version + 1,
          updatedBy: actor.userId,
          updatedAt: timestamp
        });
      }
    });
    return items.length;
  }
  async listItems(actor, query) {
    if (query.deleted === "recoverable") {
      await this.assertAdmin(actor, query.householdId, "\u4EC5\u7BA1\u7406\u5458\u53EF\u67E5\u770B\u6700\u8FD1\u5220\u9664");
    } else {
      await this.assertMember(actor, query.householdId);
    }
    const now = this.now().getTime();
    const keyword = query.keyword?.trim().toLocaleLowerCase("zh-CN");
    const items = (await this.repos.items.listByHousehold(query.householdId)).filter(
      (item) => query.deleted === "recoverable" ? Boolean(
        item.deletedAt && item.recoverableUntil && new Date(item.recoverableUntil).getTime() >= now
      ) : item.deletedAt === null
    ).filter((item) => !query.categoryId || item.categoryId === query.categoryId).filter((item) => !query.locationId || item.locationId === query.locationId).filter((item) => !query.status || item.status === query.status).filter(
      (item) => !keyword || [item.name, item.brand, item.barcode].some(
        (value) => value?.toLocaleLowerCase("zh-CN").includes(keyword)
      )
    ).sort(
      (left, right) => left.nearestEventDate.localeCompare(right.nearestEventDate) || right.createdAt.localeCompare(left.createdAt)
    );
    return { items };
  }
  async getItem(actor, input) {
    const member = await this.assertMember(actor, input.householdId);
    const item = await this.requireItem(input.householdId, input.itemId);
    if (item.deletedAt && member.role !== "admin") {
      throw new ServiceError("FORBIDDEN", "\u65E0\u6743\u67E5\u770B\u5DF2\u5220\u9664\u7269\u54C1");
    }
    return this.getDetailUnchecked(input.itemId, input.householdId);
  }
  buildItem(actor, input, id, events, timestamp) {
    return {
      id,
      householdId: input.householdId,
      name: input.name.trim(),
      categoryId: input.categoryId,
      quantity: input.quantity,
      unit: input.unit.trim(),
      barcode: input.barcode,
      brand: input.brand,
      specification: input.specification,
      locationId: input.locationId,
      note: input.note,
      imageFileId: input.imageFileId,
      entryMethod: input.entryMethod ?? "manual",
      status: input.quantity === 0 ? "processed" : this.overallStatus(events),
      nearestEventDate: this.nearestEventDate(events),
      processedStatus: input.quantity === 0 ? "used_up" : null,
      version: 1,
      createdBy: actor.userId,
      createdAt: timestamp,
      updatedBy: actor.userId,
      updatedAt: timestamp,
      deletedAt: null,
      deletedBy: null,
      recoverableUntil: null
    };
  }
  buildEvents(householdId, itemId, inputs, household) {
    const today = localDate(this.now(), household.timezone);
    return inputs.map((event) => ({
      ...event,
      id: this.createId("event"),
      itemId,
      householdId,
      status: calculateEventStatus({
        today,
        eventDate: event.date,
        thresholdDays: event.thresholdDays,
        processed: false
      })
    }));
  }
  overallStatus(events) {
    return this.reminderEvents(events).sort(
      (left, right) => STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status]
    )[0]?.status ?? "normal";
  }
  nearestEventDate(events) {
    return this.reminderEvents(events).map((event) => event.date).sort()[0] ?? "9999-12-31";
  }
  reminderEvents(events) {
    const reminderTypes = /* @__PURE__ */ new Set([
      "expiry",
      "warranty",
      "maintenance",
      "renewal",
      "custom"
    ]);
    const reminders = events.filter((event) => reminderTypes.has(event.type));
    return reminders.length > 0 ? reminders : [...events];
  }
  async getDetailUnchecked(itemId, householdId) {
    const item = await this.requireItem(householdId, itemId);
    const records = await this.repos.itemEvents.listByItem(itemId);
    const events = records.map((event) => ({
      ...event,
      type: event.type
    }));
    return { ...item, events };
  }
  async requireItem(householdId, itemId) {
    const item = await this.repos.items.findById(itemId);
    if (!item || item.householdId !== householdId) {
      throw new ServiceError("NOT_FOUND", "\u7269\u54C1\u4E0D\u5B58\u5728");
    }
    return item;
  }
  async requireActiveItem(householdId, itemId) {
    const item = await this.requireItem(householdId, itemId);
    if (item.deletedAt) throw new ServiceError("NOT_FOUND", "\u7269\u54C1\u4E0D\u5B58\u5728");
    return item;
  }
  async requireHousehold(householdId) {
    const household = await this.repos.households.findById(householdId);
    if (!household || household.dissolvedAt) {
      throw new ServiceError("NOT_FOUND", "\u5BB6\u5EAD\u4E0D\u5B58\u5728");
    }
    return household;
  }
  async requireCategory(householdId, categoryId) {
    const category = await this.repos.categories.findById(categoryId);
    if (!category || category.householdId !== householdId) {
      throw new ServiceError("VALIDATION_ERROR", "\u5206\u7C7B\u4E0D\u5C5E\u4E8E\u5F53\u524D\u5BB6\u5EAD");
    }
    return category;
  }
  async requireLocation(householdId, locationId) {
    const location = await this.repos.locations.findById(locationId);
    if (!location || location.householdId !== householdId) {
      throw new ServiceError("VALIDATION_ERROR", "\u4F4D\u7F6E\u4E0D\u5C5E\u4E8E\u5F53\u524D\u5BB6\u5EAD");
    }
    return location;
  }
  async assertMember(actor, householdId) {
    const member = await this.repos.members.find(householdId, actor.userId);
    if (!member || member.status !== "active") {
      throw new ServiceError("FORBIDDEN", "\u65E0\u6743\u8BBF\u95EE\u8BE5\u5BB6\u5EAD");
    }
    return member;
  }
  async assertAdmin(actor, householdId, message) {
    const member = await this.assertMember(actor, householdId);
    if (member.role !== "admin") {
      throw new ServiceError("FORBIDDEN", message);
    }
  }
  idempotencyKey(householdId, requestId) {
    return `item:create:${householdId}:${requestId}`;
  }
};

// packages/server/src/repositories.ts
var memberId = (householdId, userId) => `${householdId}_${userId}`;
async function findDocument(store, collection, id) {
  try {
    return (await store.collection(collection).doc(id).get()).data;
  } catch {
    return null;
  }
}
function createCloudBaseRepositories(store, rootStore = store) {
  const repos = {
    users: {
      async findByOpenId(openId) {
        const result = await store.collection("users").where({ openId }).limit(1).get();
        return result.data[0] ?? null;
      },
      async insert(record) {
        await store.collection("users").doc(record.id).set({
          data: record
        });
      }
    },
    households: {
      findById: (id) => findDocument(store, "households", id),
      async insert(record) {
        await store.collection("households").doc(record.id).set({ data: record });
      },
      async update(id, update) {
        await store.collection("households").doc(id).update({ data: update });
      }
    },
    members: {
      find: (householdId, userId) => findDocument(store, "household_members", memberId(householdId, userId)),
      async insert(record) {
        await store.collection("household_members").doc(memberId(record.householdId, record.userId)).set({ data: record });
      },
      async update(householdId, userId, update) {
        await store.collection("household_members").doc(memberId(householdId, userId)).update({ data: update });
      },
      async listByHousehold(householdId) {
        return (await store.collection("household_members").where({ householdId }).limit(100).get()).data;
      },
      async listActiveByUser(userId) {
        return (await store.collection("household_members").where({ userId, status: "active" }).limit(100).get()).data;
      }
    },
    invites: {
      async findByTokenHash(tokenHash) {
        const result = await store.collection("household_invites").where({ tokenHash }).limit(1).get();
        return result.data[0] ?? null;
      },
      async insert(record) {
        await store.collection("household_invites").doc(record.id).set({ data: record });
      },
      async update(id, update) {
        await store.collection("household_invites").doc(id).update({ data: update });
      }
    },
    idempotency: {
      find: (key) => findDocument(store, "idempotency_keys", key),
      async insert(record) {
        await store.collection("idempotency_keys").doc(record.key).set({ data: record });
      }
    },
    categories: {
      findById: (id) => findDocument(store, "categories", id),
      async findBySystemKey(householdId, systemKey) {
        const result = await store.collection("categories").where({ householdId, systemKey }).limit(1).get();
        return result.data[0] ?? null;
      },
      async listByHousehold(householdId) {
        return (await store.collection("categories").where({ householdId, status: "active" }).limit(100).get()).data;
      },
      async insert(record) {
        await store.collection("categories").doc(record.id).set({ data: record });
      },
      async update(id, update) {
        await store.collection("categories").doc(id).update({ data: update });
      }
    },
    locations: {
      findById: (id) => findDocument(store, "locations", id),
      async findByName(householdId, name) {
        const result = await store.collection("locations").where({ householdId, name, status: "active" }).limit(1).get();
        return result.data[0] ?? null;
      },
      async listByHousehold(householdId) {
        return (await store.collection("locations").where({ householdId, status: "active" }).limit(100).get()).data;
      },
      async insert(record) {
        await store.collection("locations").doc(record.id).set({ data: record });
      },
      async update(id, update) {
        await store.collection("locations").doc(id).update({ data: update });
      }
    },
    items: {
      findById: (id) => findDocument(store, "items", id),
      async insert(record) {
        await store.collection("items").doc(record.id).set({
          data: record
        });
      },
      async update(id, update) {
        await store.collection("items").doc(id).update({
          data: update
        });
      },
      async updateOptimistic(id, householdId, expectedVersion, update) {
        const result = await store.collection("items").where({ id, householdId, version: expectedVersion, deletedAt: null }).update({ data: update });
        return result.stats.updated === 1;
      },
      async listByHousehold(householdId) {
        return (await store.collection("items").where({ householdId }).limit(200).get()).data;
      },
      async count() {
        return (await store.collection("items").where({}).count()).total;
      }
    },
    itemEvents: {
      async listByItem(itemId) {
        return (await store.collection("item_events").where({ itemId }).limit(100).get()).data;
      },
      async insertMany(records) {
        for (const record of records) {
          await store.collection("item_events").doc(record.id).set({ data: record });
        }
      },
      async replaceByItem(itemId, records) {
        await store.collection("item_events").where({ itemId }).remove();
        for (const record of records) {
          await store.collection("item_events").doc(record.id).set({ data: record });
        }
      },
      async updateByItem(itemId, update) {
        await store.collection("item_events").where({ itemId }).update({ data: update });
      }
    },
    async transaction(work) {
      if (!rootStore.runTransaction) {
        throw new Error("\u5F53\u524D\u4ED3\u50A8\u4E0D\u652F\u6301\u4E8B\u52A1");
      }
      return rootStore.runTransaction(
        (transactionStore) => work(createCloudBaseRepositories(transactionStore, rootStore))
      );
    }
  };
  return repos;
}

// packages/server/src/result.ts
var ok = (data) => ({ ok: true, data });
var fail = (code, message) => ({
  ok: false,
  error: { code, message }
});

// packages/server/src/router.ts
function createRouter(services) {
  return async function route(context, request) {
    try {
      switch (request.action) {
        case "session.bootstrap":
          return ok(await services.session.bootstrap(context.actor.openId));
        case "household.create":
          return ok(
            await services.households.createHousehold(
              context.actor,
              request.payload
            )
          );
        case "household.list":
          return ok(await services.households.listHouseholds(context.actor));
        case "household.invite.create":
          return ok(
            await services.households.createInvite(
              context.actor,
              request.payload
            )
          );
        case "household.invite.accept":
          return ok(
            await services.households.acceptInvite(
              context.actor,
              request.payload
            )
          );
        case "household.member.list":
          return ok(
            await services.households.listMembers(
              context.actor,
              String(request.payload.householdId ?? "")
            )
          );
        case "household.member.remove":
          return ok(
            await services.households.removeMember(
              context.actor,
              request.payload
            )
          );
        case "household.admin.transfer":
          return ok(
            await services.households.transferAdmin(
              context.actor,
              request.payload
            )
          );
        case "household.settings.update":
          return ok(
            await services.households.updateSettings(
              context.actor,
              request.payload
            )
          );
        case "household.dissolve":
          return ok(
            await services.households.dissolveHousehold(
              context.actor,
              request.payload
            )
          );
        case "category.list":
          return ok(
            await services.categories.listCategories(
              context.actor,
              String(request.payload.householdId ?? "")
            )
          );
        case "category.save":
          return ok(
            await services.categories.saveCategory(
              context.actor,
              request.payload
            )
          );
        case "category.reorder":
          return ok(
            await services.categories.reorderCategories(
              context.actor,
              request.payload
            )
          );
        case "location.list":
          return ok(
            await services.locations.listLocations(
              context.actor,
              String(request.payload.householdId ?? "")
            )
          );
        case "location.save":
          return ok(
            await services.locations.saveLocation(
              context.actor,
              request.payload
            )
          );
        case "item.create":
          return ok(
            await services.items.createItem(
              context.actor,
              request.payload
            )
          );
        case "item.update":
          return ok(
            await services.items.updateItem(
              context.actor,
              request.payload
            )
          );
        case "item.list":
          return ok(
            await services.items.listItems(
              context.actor,
              request.payload
            )
          );
        case "item.detail":
          return ok(
            await services.items.getItem(
              context.actor,
              request.payload
            )
          );
        case "item.quantity.change":
          return ok(
            await services.items.changeQuantity(
              context.actor,
              request.payload
            )
          );
        case "item.process":
          return ok(
            await services.items.processItem(
              context.actor,
              request.payload
            )
          );
        case "item.delete":
          return ok(
            await services.items.deleteItem(
              context.actor,
              request.payload
            )
          );
        case "item.restore":
          return ok(
            await services.items.restoreItem(
              context.actor,
              request.payload
            )
          );
        case "item.bulkMoveCategory":
          return ok(
            await services.items.bulkMoveCategory(
              context.actor,
              request.payload
            )
          );
        default:
          return fail("NOT_FOUND", "\u672A\u77E5\u64CD\u4F5C");
      }
    } catch (error) {
      if (error instanceof ServiceError) {
        return fail(error.code, error.message);
      }
      throw error;
    }
  };
}

// packages/server/src/index.ts
var runtime;
function getRuntime() {
  if (runtime) return runtime;
  const cloud = require("wx-server-sdk");
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  const database = cloud.database();
  const repos = createCloudBaseRepositories(database);
  const session = new SessionService(repos);
  const categories = new CategoryService(repos);
  runtime = {
    cloud,
    database,
    session,
    route: createRouter({
      session,
      households: new HouseholdService(repos),
      categories,
      locations: new LocationService(repos),
      items: new ItemService(repos)
    })
  };
  return runtime;
}
async function execute(current, event) {
  const openId = current.cloud.getWXContext().OPENID ?? "";
  const session = await current.session.bootstrap(openId);
  return current.route(
    { actor: { userId: session.user.id, openId } },
    event
  );
}
function handleError(error) {
  if (error instanceof ServiceError) {
    return fail(error.code, error.message);
  }
  console.error("\u4E91\u51FD\u6570\u8BF7\u6C42\u5931\u8D25", {
    message: error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"
  });
  return fail("INTERNAL_ERROR", "\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528");
}
async function main(event) {
  const current = getRuntime();
  try {
    return await execute(current, event);
  } catch (error) {
    if (!isMissingCollectionError(error)) return handleError(error);
    try {
      await ensureRequiredCollections(current.database);
      return await execute(current, event);
    } catch (retryError) {
      return handleError(retryError);
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createRouter,
  main
});
