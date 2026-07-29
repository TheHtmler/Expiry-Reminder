import type { Actor } from "../context";
import type { LocationService, SaveLocationInput } from "./service";

export function createLocationHandlers(service: LocationService) {
  return {
    list: (actor: Actor, householdId: string) =>
      service.listLocations(actor, householdId),
    save: (actor: Actor, input: SaveLocationInput) =>
      service.saveLocation(actor, input),
  };
}
