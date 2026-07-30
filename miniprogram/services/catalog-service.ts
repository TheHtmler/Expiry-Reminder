import type {
  CatalogLookupInput,
  MergeCandidateDto,
  MergeCandidateInput,
  ProductMatchDto,
} from "../../packages/contracts/src/catalog";
import { callApi } from "./cloud-client";

export const lookupProduct = (input: CatalogLookupInput) =>
  callApi<CatalogLookupInput, ProductMatchDto | null>("catalog.lookup", input);

export const findMergeCandidate = (input: MergeCandidateInput) =>
  callApi<MergeCandidateInput, MergeCandidateDto | null>(
    "catalog.findMergeCandidate",
    input,
  );
