export interface UserRecord {
  id: string;
  openId: string;
  status: "active" | "deleted";
  createdAt: string;
}

export interface HouseholdRecord {
  id: string;
  name: string;
  timezone: string;
  reminderHour: number;
  createdBy: string;
  createdAt: string;
  dissolvedAt: string | null;
}

export interface MemberRecord {
  householdId: string;
  userId: string;
  role: "admin" | "member";
  status: "active" | "removed";
  joinedAt: string;
  removedAt?: string | null;
}

export interface InviteRecord {
  id: string;
  householdId: string;
  tokenHash: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
  revokedAt: string | null;
}

export interface IdempotencyRecord {
  key: string;
  value: unknown;
}

export interface CategoryRecord {
  id: string;
  householdId: string;
  source: "system" | "custom";
  systemKey?: string;
  name: string;
  icon: string;
  color: string;
  defaultThresholdDays: number;
  sortOrder: number;
  hidden: boolean;
  status: "active";
}

export interface LocationRecord {
  id: string;
  householdId: string;
  name: string;
  sortOrder: number;
  hidden: boolean;
  status: "active";
}

export interface ItemRecord {
  id: string;
  householdId: string;
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  barcode?: string;
  brand?: string;
  specification?: string;
  locationId?: string;
  note?: string;
  imageFileId?: string;
  entryMethod: "manual" | "scan" | "ocr";
  status: "normal" | "near_expiry" | "due_today" | "expired" | "processed";
  nearestEventDate: string;
  processedStatus: "used_up" | "discarded" | "completed" | "other" | null;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  recoverableUntil: string | null;
}

export interface ItemEventRecord {
  id: string;
  itemId: string;
  householdId: string;
  type: string;
  date: string;
  thresholdDays: number;
  label?: string;
  status: ItemRecord["status"];
}

export interface UserRepository {
  findByOpenId(openId: string): Promise<UserRecord | null>;
  insert(record: UserRecord): Promise<void>;
}

export interface HouseholdRepository {
  findById(id: string): Promise<HouseholdRecord | null>;
  insert(record: HouseholdRecord): Promise<void>;
  update(id: string, patch: Partial<HouseholdRecord>): Promise<void>;
}

export interface MemberRepository {
  find(householdId: string, userId: string): Promise<MemberRecord | null>;
  insert(record: MemberRecord): Promise<void>;
  update(
    householdId: string,
    userId: string,
    patch: Partial<MemberRecord>,
  ): Promise<void>;
  listByHousehold(householdId: string): Promise<MemberRecord[]>;
  listActiveByUser(userId: string): Promise<MemberRecord[]>;
}

export interface InviteRepository {
  findByTokenHash(tokenHash: string): Promise<InviteRecord | null>;
  insert(record: InviteRecord): Promise<void>;
  update(id: string, patch: Partial<InviteRecord>): Promise<void>;
}

export interface IdempotencyRepository {
  find(key: string): Promise<IdempotencyRecord | null>;
  insert(record: IdempotencyRecord): Promise<void>;
}

export interface CategoryRepository {
  findById(id: string): Promise<CategoryRecord | null>;
  findBySystemKey(
    householdId: string,
    systemKey: string,
  ): Promise<CategoryRecord | null>;
  listByHousehold(householdId: string): Promise<CategoryRecord[]>;
  insert(record: CategoryRecord): Promise<void>;
  update(id: string, patch: Partial<CategoryRecord>): Promise<void>;
}

export interface LocationRepository {
  findById(id: string): Promise<LocationRecord | null>;
  findByName(householdId: string, name: string): Promise<LocationRecord | null>;
  listByHousehold(householdId: string): Promise<LocationRecord[]>;
  insert(record: LocationRecord): Promise<void>;
  update(id: string, patch: Partial<LocationRecord>): Promise<void>;
}

export interface ItemRepository {
  findById(id: string): Promise<ItemRecord | null>;
  insert(record: ItemRecord): Promise<void>;
  update(id: string, patch: Partial<ItemRecord>): Promise<void>;
  updateOptimistic(
    id: string,
    householdId: string,
    expectedVersion: number,
    patch: Partial<ItemRecord>,
  ): Promise<boolean>;
  listByHousehold(householdId: string): Promise<ItemRecord[]>;
  count(): Promise<number>;
}

export interface ItemEventRepository {
  listByItem(itemId: string): Promise<ItemEventRecord[]>;
  insertMany(records: ItemEventRecord[]): Promise<void>;
  replaceByItem(itemId: string, records: ItemEventRecord[]): Promise<void>;
  updateByItem(itemId: string, patch: Partial<ItemEventRecord>): Promise<void>;
}

export interface Repositories {
  users: UserRepository;
  households: HouseholdRepository;
  members: MemberRepository;
  invites: InviteRepository;
  idempotency: IdempotencyRepository;
  categories: CategoryRepository;
  locations: LocationRepository;
  items: ItemRepository;
  itemEvents: ItemEventRepository;
  transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}

interface CloudQueryResult<T> {
  data: T[];
}

interface CloudDocumentResult<T> {
  data: T;
}

interface CloudQuery<T> {
  limit(value: number): CloudQuery<T>;
  get(): Promise<CloudQueryResult<T>>;
  update(input: { data: Partial<T> }): Promise<{ stats: { updated: number } }>;
  remove(): Promise<unknown>;
  count(): Promise<{ total: number }>;
}

interface CloudDocument<T> {
  get(): Promise<CloudDocumentResult<T>>;
  set(input: { data: T }): Promise<unknown>;
  update(input: { data: Partial<T> }): Promise<unknown>;
}

interface CloudCollection<T> {
  doc(id: string): CloudDocument<T>;
  where(query: Partial<T>): CloudQuery<T>;
}

export interface CloudStore {
  collection<T>(name: string): CloudCollection<T>;
  runTransaction?<T>(work: (store: CloudStore) => Promise<T>): Promise<T>;
}

const memberId = (householdId: string, userId: string) =>
  `${householdId}_${userId}`;

async function findDocument<T>(
  store: CloudStore,
  collection: string,
  id: string,
): Promise<T | null> {
  try {
    return (await store.collection<T>(collection).doc(id).get()).data;
  } catch {
    return null;
  }
}

export function createCloudBaseRepositories(
  store: CloudStore,
  rootStore: CloudStore = store,
): Repositories {
  const repos: Repositories = {
    users: {
      async findByOpenId(openId) {
        const result = await store
          .collection<UserRecord>("users")
          .where({ openId })
          .limit(1)
          .get();
        return result.data[0] ?? null;
      },
      async insert(record) {
        await store.collection<UserRecord>("users").doc(record.id).set({
          data: record,
        });
      },
    },
    households: {
      findById: (id) => findDocument(store, "households", id),
      async insert(record) {
        await store
          .collection<HouseholdRecord>("households")
          .doc(record.id)
          .set({ data: record });
      },
      async update(id, update) {
        await store
          .collection<HouseholdRecord>("households")
          .doc(id)
          .update({ data: update });
      },
    },
    members: {
      find: (householdId, userId) =>
        findDocument(store, "household_members", memberId(householdId, userId)),
      async insert(record) {
        await store
          .collection<MemberRecord>("household_members")
          .doc(memberId(record.householdId, record.userId))
          .set({ data: record });
      },
      async update(householdId, userId, update) {
        await store
          .collection<MemberRecord>("household_members")
          .doc(memberId(householdId, userId))
          .update({ data: update });
      },
      async listByHousehold(householdId) {
        return (
          await store
            .collection<MemberRecord>("household_members")
            .where({ householdId })
            .limit(100)
            .get()
        ).data;
      },
      async listActiveByUser(userId) {
        return (
          await store
            .collection<MemberRecord>("household_members")
            .where({ userId, status: "active" })
            .limit(100)
            .get()
        ).data;
      },
    },
    invites: {
      async findByTokenHash(tokenHash) {
        const result = await store
          .collection<InviteRecord>("household_invites")
          .where({ tokenHash })
          .limit(1)
          .get();
        return result.data[0] ?? null;
      },
      async insert(record) {
        await store
          .collection<InviteRecord>("household_invites")
          .doc(record.id)
          .set({ data: record });
      },
      async update(id, update) {
        await store
          .collection<InviteRecord>("household_invites")
          .doc(id)
          .update({ data: update });
      },
    },
    idempotency: {
      find: (key) => findDocument(store, "idempotency_keys", key),
      async insert(record) {
        await store
          .collection<IdempotencyRecord>("idempotency_keys")
          .doc(record.key)
          .set({ data: record });
      },
    },
    categories: {
      findById: (id) => findDocument(store, "categories", id),
      async findBySystemKey(householdId, systemKey) {
        const result = await store
          .collection<CategoryRecord>("categories")
          .where({ householdId, systemKey })
          .limit(1)
          .get();
        return result.data[0] ?? null;
      },
      async listByHousehold(householdId) {
        return (
          await store
            .collection<CategoryRecord>("categories")
            .where({ householdId, status: "active" })
            .limit(100)
            .get()
        ).data;
      },
      async insert(record) {
        await store
          .collection<CategoryRecord>("categories")
          .doc(record.id)
          .set({ data: record });
      },
      async update(id, update) {
        await store
          .collection<CategoryRecord>("categories")
          .doc(id)
          .update({ data: update });
      },
    },
    locations: {
      findById: (id) => findDocument(store, "locations", id),
      async findByName(householdId, name) {
        const result = await store
          .collection<LocationRecord>("locations")
          .where({ householdId, name, status: "active" })
          .limit(1)
          .get();
        return result.data[0] ?? null;
      },
      async listByHousehold(householdId) {
        return (
          await store
            .collection<LocationRecord>("locations")
            .where({ householdId, status: "active" })
            .limit(100)
            .get()
        ).data;
      },
      async insert(record) {
        await store
          .collection<LocationRecord>("locations")
          .doc(record.id)
          .set({ data: record });
      },
      async update(id, update) {
        await store
          .collection<LocationRecord>("locations")
          .doc(id)
          .update({ data: update });
      },
    },
    items: {
      findById: (id) => findDocument(store, "items", id),
      async insert(record) {
        await store.collection<ItemRecord>("items").doc(record.id).set({
          data: record,
        });
      },
      async update(id, update) {
        await store.collection<ItemRecord>("items").doc(id).update({
          data: update,
        });
      },
      async updateOptimistic(id, householdId, expectedVersion, update) {
        const result = await store
          .collection<ItemRecord>("items")
          .where({ id, householdId, version: expectedVersion, deletedAt: null })
          .update({ data: update });
        return result.stats.updated === 1;
      },
      async listByHousehold(householdId) {
        return (
          await store
            .collection<ItemRecord>("items")
            .where({ householdId })
            .limit(200)
            .get()
        ).data;
      },
      async count() {
        return (await store.collection<ItemRecord>("items").where({}).count())
          .total;
      },
    },
    itemEvents: {
      async listByItem(itemId) {
        return (
          await store
            .collection<ItemEventRecord>("item_events")
            .where({ itemId })
            .limit(100)
            .get()
        ).data;
      },
      async insertMany(records) {
        for (const record of records) {
          await store
            .collection<ItemEventRecord>("item_events")
            .doc(record.id)
            .set({ data: record });
        }
      },
      async replaceByItem(itemId, records) {
        await store
          .collection<ItemEventRecord>("item_events")
          .where({ itemId })
          .remove();
        for (const record of records) {
          await store
            .collection<ItemEventRecord>("item_events")
            .doc(record.id)
            .set({ data: record });
        }
      },
      async updateByItem(itemId, update) {
        await store
          .collection<ItemEventRecord>("item_events")
          .where({ itemId })
          .update({ data: update });
      },
    },
    async transaction(work) {
      if (!rootStore.runTransaction) {
        throw new Error("当前仓储不支持事务");
      }
      return rootStore.runTransaction((transactionStore) =>
        work(createCloudBaseRepositories(transactionStore, rootStore)),
      );
    },
  };

  return repos;
}
