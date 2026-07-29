import { bootstrapSession } from "../services/session-service";

export interface SessionUser {
  id: string;
}

export interface SessionHousehold {
  id: string;
  name: string;
  timezone?: string;
  reminderHour?: number;
  role?: "admin" | "member";
}

export interface SessionSnapshot {
  user: SessionUser;
  households: SessionHousehold[];
}

export interface SessionStateDependencies {
  storage: {
    get(): string | null;
    set(householdId: string): void;
  };
  api(): Promise<SessionSnapshot>;
}

export function createSessionState(dependencies: SessionStateDependencies) {
  const listeners = new Set<(householdId: string) => void>();
  let bootstrapTask: Promise<void> | null = null;
  const state = {
    user: null as SessionUser | null,
    households: [] as SessionHousehold[],
    currentHouseholdId: null as string | null,
    needsOnboarding: false,

    async bootstrap(): Promise<void> {
      if (bootstrapTask) return bootstrapTask;
      bootstrapTask = (async () => {
        const snapshot = await dependencies.api();
        state.user = snapshot.user;
        state.households = snapshot.households;
        state.needsOnboarding = snapshot.households.length === 0;
        const stored = dependencies.storage.get();
        const selected = snapshot.households.some((item) => item.id === stored)
          ? stored
          : (snapshot.households[0]?.id ?? null);
        state.currentHouseholdId = selected;
        if (selected) {
          dependencies.storage.set(selected);
          for (const listener of listeners) listener(selected);
        }
      })();
      try {
        await bootstrapTask;
      } finally {
        bootstrapTask = null;
      }
    },

    async ensureReady(): Promise<void> {
      if (state.user && state.currentHouseholdId) return;
      await state.bootstrap();
    },

    switchHousehold(householdId: string) {
      if (!state.households.some((household) => household.id === householdId)) {
        throw new Error("家庭不存在或已无权访问");
      }
      state.currentHouseholdId = householdId;
      dependencies.storage.set(householdId);
      for (const listener of listeners) listener(householdId);
    },

    onHouseholdChanged(listener: (householdId: string) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getCurrentHousehold() {
      return (
        state.households.find(
          (household) => household.id === state.currentHouseholdId,
        ) ?? null
      );
    },
  };
  return state;
}

export const sessionState = createSessionState({
  storage: {
    get: () => wx.getStorageSync<string>("currentHouseholdId") || null,
    set: (householdId) => wx.setStorageSync("currentHouseholdId", householdId),
  },
  api: bootstrapSession,
});

export function getCurrentHouseholdId(): string | null {
  return sessionState.currentHouseholdId;
}
