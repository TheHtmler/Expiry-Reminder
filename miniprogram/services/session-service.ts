import type { SessionSnapshot } from "../state/session";
import { callApi } from "./cloud-client";

export const bootstrapSession = () =>
  callApi<Record<string, never>, SessionSnapshot>("session.bootstrap", {});

export const createHousehold = (input: { name: string; timezone: string }) =>
  callApi<typeof input, SessionSnapshot["households"][number]>(
    "household.create",
    input,
  );

export const createHouseholdInvite = (householdId: string) =>
  callApi<{ householdId: string }, { token: string; expiresAt: string }>(
    "household.invite.create",
    { householdId },
  );

export const acceptHouseholdInvite = (token: string) =>
  callApi<{ token: string }, { householdId: string }>(
    "household.invite.accept",
    { token },
  );

export const removeHouseholdMember = (householdId: string, userId: string) =>
  callApi<{ householdId: string; userId: string }, void>(
    "household.member.remove",
    { householdId, userId },
  );

export interface HouseholdMemberView {
  userId: string;
  role: "admin" | "member";
  joinedAt: string;
  isSelf: boolean;
}

export const listHouseholdMembers = (householdId: string) =>
  callApi<{ householdId: string }, HouseholdMemberView[]>(
    "household.member.list",
    { householdId },
  );

export const transferHouseholdAdmin = (
  householdId: string,
  targetUserId: string,
) =>
  callApi<{ householdId: string; targetUserId: string }, void>(
    "household.admin.transfer",
    { householdId, targetUserId },
  );

export const updateHouseholdSettings = (input: {
  householdId: string;
  name: string;
  timezone: string;
  reminderHour: number;
}) => callApi<typeof input, SessionSnapshot["households"][number]>(
  "household.settings.update",
  input,
);

export const dissolveHousehold = (householdId: string) =>
  callApi<{ householdId: string }, void>("household.dissolve", { householdId });

export interface CategoryView {
  id: string;
  name: string;
  icon: string;
  color: string;
  source: "system" | "custom";
  systemKey?: string;
  hidden: boolean;
  sortOrder: number;
}

export const listCategories = (householdId: string) =>
  callApi<{ householdId: string }, CategoryView[]>("category.list", {
    householdId,
  });

export const saveCategory = (input: {
  householdId: string;
  id?: string;
  name: string;
  icon: string;
  color: string;
  hidden?: boolean;
}) => callApi<typeof input, CategoryView>("category.save", input);

export const reorderCategories = (householdId: string, categoryIds: string[]) =>
  callApi<{ householdId: string; categoryIds: string[] }, void>(
    "category.reorder",
    { householdId, categoryIds },
  );

export interface LocationView {
  id: string;
  name: string;
  hidden: boolean;
  sortOrder: number;
}

export const listLocations = (householdId: string) =>
  callApi<{ householdId: string }, LocationView[]>("location.list", {
    householdId,
  });

export const saveLocation = (input: {
  householdId: string;
  id?: string;
  name: string;
  hidden?: boolean;
  sortOrder?: number;
}) => callApi<typeof input, LocationView>("location.save", input);
