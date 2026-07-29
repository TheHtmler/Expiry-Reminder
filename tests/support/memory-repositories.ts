import type {
  CategoryRecord,
  HouseholdRecord,
  IdempotencyRecord,
  InviteRecord,
  ItemEventRecord,
  ItemRecord,
  LocationRecord,
  MemberRecord,
  Repositories,
  UserRecord,
} from "../../packages/server/src/repositories";

interface MemoryState {
  users: Map<string, UserRecord>;
  households: Map<string, HouseholdRecord>;
  members: Map<string, MemberRecord>;
  invites: Map<string, InviteRecord>;
  idempotency: Map<string, IdempotencyRecord>;
  categories: Map<string, CategoryRecord>;
  locations: Map<string, LocationRecord>;
  items: Map<string, ItemRecord>;
  itemEvents: Map<string, ItemEventRecord>;
}

const memberKey = (householdId: string, userId: string) =>
  `${householdId}:${userId}`;

function cloneState(state: MemoryState): MemoryState {
  return {
    users: structuredClone(state.users),
    households: structuredClone(state.households),
    members: structuredClone(state.members),
    invites: structuredClone(state.invites),
    idempotency: structuredClone(state.idempotency),
    categories: structuredClone(state.categories),
    locations: structuredClone(state.locations),
    items: structuredClone(state.items),
    itemEvents: structuredClone(state.itemEvents),
  };
}

export function createMemoryRepositories(): Repositories & {
  invites: Repositories["invites"] & { count(): Promise<number> };
} {
  const state: MemoryState = {
    users: new Map(),
    households: new Map(),
    members: new Map(),
    invites: new Map(),
    idempotency: new Map(),
    categories: new Map(),
    locations: new Map(),
    items: new Map(),
    itemEvents: new Map(),
  };
  let transactionQueue: Promise<void> = Promise.resolve();

  const createRepositories = (current: MemoryState): Repositories => ({
    users: {
      async findByOpenId(openId) {
        return (
          [...current.users.values()].find((user) => user.openId === openId) ??
          null
        );
      },
      async insert(record) {
        current.users.set(record.id, structuredClone(record));
      },
    },
    households: {
      async findById(id) {
        return structuredClone(current.households.get(id) ?? null);
      },
      async insert(record) {
        current.households.set(record.id, structuredClone(record));
      },
      async update(id, patch) {
        const record = current.households.get(id);
        if (!record) throw new Error("家庭不存在");
        current.households.set(id, { ...record, ...structuredClone(patch) });
      },
    },
    members: {
      async find(householdId, userId) {
        return structuredClone(
          current.members.get(memberKey(householdId, userId)) ?? null,
        );
      },
      async insert(record) {
        current.members.set(
          memberKey(record.householdId, record.userId),
          structuredClone(record),
        );
      },
      async update(householdId, userId, patch) {
        const key = memberKey(householdId, userId);
        const record = current.members.get(key);
        if (!record) throw new Error("家庭成员不存在");
        current.members.set(key, { ...record, ...structuredClone(patch) });
      },
      async listByHousehold(householdId) {
        return structuredClone(
          [...current.members.values()].filter(
            (member) => member.householdId === householdId,
          ),
        );
      },
      async listActiveByUser(userId) {
        return structuredClone(
          [...current.members.values()].filter(
            (member) => member.userId === userId && member.status === "active",
          ),
        );
      },
    },
    invites: {
      async findByTokenHash(tokenHash) {
        return structuredClone(
          [...current.invites.values()].find(
            (invite) => invite.tokenHash === tokenHash,
          ) ?? null,
        );
      },
      async insert(record) {
        current.invites.set(record.id, structuredClone(record));
      },
      async update(id, patch) {
        const record = current.invites.get(id);
        if (!record) throw new Error("邀请不存在");
        current.invites.set(id, { ...record, ...structuredClone(patch) });
      },
    },
    idempotency: {
      async find(key) {
        return structuredClone(current.idempotency.get(key) ?? null);
      },
      async insert(record) {
        current.idempotency.set(record.key, structuredClone(record));
      },
    },
    categories: {
      async findById(id) {
        return structuredClone(current.categories.get(id) ?? null);
      },
      async findBySystemKey(householdId, systemKey) {
        return structuredClone(
          [...current.categories.values()].find(
            (category) =>
              category.householdId === householdId &&
              category.systemKey === systemKey,
          ) ?? null,
        );
      },
      async listByHousehold(householdId) {
        return structuredClone(
          [...current.categories.values()].filter(
            (category) => category.householdId === householdId,
          ),
        );
      },
      async insert(record) {
        current.categories.set(record.id, structuredClone(record));
      },
      async update(id, patch) {
        const record = current.categories.get(id);
        if (!record) throw new Error("分类不存在");
        current.categories.set(id, { ...record, ...structuredClone(patch) });
      },
    },
    locations: {
      async findById(id) {
        return structuredClone(current.locations.get(id) ?? null);
      },
      async findByName(householdId, name) {
        return structuredClone(
          [...current.locations.values()].find(
            (location) =>
              location.householdId === householdId && location.name === name,
          ) ?? null,
        );
      },
      async listByHousehold(householdId) {
        return structuredClone(
          [...current.locations.values()].filter(
            (location) => location.householdId === householdId,
          ),
        );
      },
      async insert(record) {
        current.locations.set(record.id, structuredClone(record));
      },
      async update(id, patch) {
        const record = current.locations.get(id);
        if (!record) throw new Error("位置不存在");
        current.locations.set(id, { ...record, ...structuredClone(patch) });
      },
    },
    items: {
      async findById(id) {
        return structuredClone(current.items.get(id) ?? null);
      },
      async insert(record) {
        current.items.set(record.id, structuredClone(record));
      },
      async update(id, patch) {
        const record = current.items.get(id);
        if (!record) throw new Error("物品不存在");
        current.items.set(id, { ...record, ...structuredClone(patch) });
      },
      async updateOptimistic(id, householdId, expectedVersion, patch) {
        const record = current.items.get(id);
        if (
          !record ||
          record.householdId !== householdId ||
          record.version !== expectedVersion ||
          record.deletedAt !== null
        ) {
          return false;
        }
        current.items.set(id, { ...record, ...structuredClone(patch) });
        return true;
      },
      async listByHousehold(householdId) {
        return structuredClone(
          [...current.items.values()].filter(
            (item) => item.householdId === householdId,
          ),
        );
      },
      async count() {
        return current.items.size;
      },
    },
    itemEvents: {
      async listByItem(itemId) {
        return structuredClone(
          [...current.itemEvents.values()].filter(
            (event) => event.itemId === itemId,
          ),
        );
      },
      async insertMany(records) {
        for (const record of records) {
          current.itemEvents.set(record.id, structuredClone(record));
        }
      },
      async replaceByItem(itemId, records) {
        for (const [id, event] of current.itemEvents) {
          if (event.itemId === itemId) current.itemEvents.delete(id);
        }
        for (const record of records) {
          current.itemEvents.set(record.id, structuredClone(record));
        }
      },
      async updateByItem(itemId, patch) {
        for (const [id, event] of current.itemEvents) {
          if (event.itemId === itemId) {
            current.itemEvents.set(id, {
              ...event,
              ...structuredClone(patch),
            });
          }
        }
      },
    },
    async transaction(work) {
      const run = transactionQueue.then(async () => {
        const transactionState = cloneState(current);
        const result = await work(createRepositories(transactionState));
        current.users = transactionState.users;
        current.households = transactionState.households;
        current.members = transactionState.members;
        current.invites = transactionState.invites;
        current.idempotency = transactionState.idempotency;
        current.categories = transactionState.categories;
        current.locations = transactionState.locations;
        current.items = transactionState.items;
        current.itemEvents = transactionState.itemEvents;
        return result;
      });
      transactionQueue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  });

  const repos = createRepositories(state) as ReturnType<
    typeof createMemoryRepositories
  >;
  repos.invites.count = async () => state.invites.size;
  return repos;
}
