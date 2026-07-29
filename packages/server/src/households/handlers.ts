import type { Actor } from "../context";
import type {
  AcceptInviteInput,
  CreateHouseholdInput,
  CreateInviteInput,
  DissolveHouseholdInput,
  HouseholdService,
  RemoveMemberInput,
  TransferAdminInput,
  UpdateHouseholdSettingsInput,
} from "./service";

export function createHouseholdHandlers(service: HouseholdService) {
  return {
    create: (actor: Actor, input: CreateHouseholdInput) =>
      service.createHousehold(actor, input),
    list: (actor: Actor) => service.listHouseholds(actor),
    createInvite: (actor: Actor, input: CreateInviteInput) =>
      service.createInvite(actor, input),
    acceptInvite: (actor: Actor, input: AcceptInviteInput) =>
      service.acceptInvite(actor, input),
    removeMember: (actor: Actor, input: RemoveMemberInput) =>
      service.removeMember(actor, input),
    transferAdmin: (actor: Actor, input: TransferAdminInput) =>
      service.transferAdmin(actor, input),
    updateSettings: (actor: Actor, input: UpdateHouseholdSettingsInput) =>
      service.updateSettings(actor, input),
    dissolve: (actor: Actor, input: DissolveHouseholdInput) =>
      service.dissolveHousehold(actor, input),
  };
}
