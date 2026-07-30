import type {
  CatalogLookupInput,
  MergeCandidateInput,
} from "../../../contracts/src/catalog";
import type { Actor } from "../context";
import type { CatalogService } from "./service";

export function createCatalogHandlers(service: CatalogService) {
  return {
    lookup: (actor: Actor, input: CatalogLookupInput) =>
      service.lookupByInput(actor, input),
    findMergeCandidate: (actor: Actor, input: MergeCandidateInput) =>
      service.findMergeCandidate(actor, input),
  };
}
