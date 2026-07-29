export const REQUIRED_COLLECTIONS = [
  "users",
  "households",
  "household_members",
  "household_invites",
  "idempotency_keys",
  "categories",
  "locations",
  "items",
  "item_events",
] as const;

interface CollectionAdmin {
  createCollection(name: string): Promise<unknown>;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const candidate = error as { errMsg?: unknown; message?: unknown };
    if (typeof candidate.errMsg === "string") return candidate.errMsg;
    if (typeof candidate.message === "string") return candidate.message;
  }
  return "";
}

export function isMissingCollectionError(error: unknown): boolean {
  return /(?:collection|集合).*(?:not exist|does not exist|不存在)/i.test(
    errorMessage(error),
  );
}

function isExistingCollectionError(error: unknown): boolean {
  return /(?:collection|集合).*(?:already exist|已存在)/i.test(
    errorMessage(error),
  );
}

export async function ensureRequiredCollections(
  database: CollectionAdmin,
): Promise<void> {
  await Promise.all(
    REQUIRED_COLLECTIONS.map(async (name) => {
      try {
        await database.createCollection(name);
      } catch (error) {
        if (!isExistingCollectionError(error)) throw error;
      }
    }),
  );
}
