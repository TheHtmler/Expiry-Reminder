import type {
  ChangeQuantityInput,
  BulkMoveCategoryInput,
  CreateItemInput,
  ItemDetailDto,
  ItemListDto,
  ItemListQuery,
  ProcessItemInput,
  UpdateItemInput,
} from "../../packages/contracts/src/items";
import { callApi } from "./cloud-client";

export const listItems = (query: ItemListQuery) =>
  callApi<ItemListQuery, ItemListDto>("item.list", query);

export const getItemDetail = (householdId: string, itemId: string) =>
  callApi<{ householdId: string; itemId: string }, ItemDetailDto>(
    "item.detail",
    { householdId, itemId },
  );

export const createItem = (input: CreateItemInput) =>
  callApi<CreateItemInput, ItemDetailDto>("item.create", input);

export const updateItem = (input: UpdateItemInput) =>
  callApi<UpdateItemInput, ItemDetailDto>("item.update", input);

export const changeItemQuantity = (input: ChangeQuantityInput) =>
  callApi<ChangeQuantityInput, ItemDetailDto>("item.quantity.change", input);

export const processItem = (input: ProcessItemInput) =>
  callApi<ProcessItemInput, ItemDetailDto>("item.process", input);

export const deleteItem = (householdId: string, itemId: string) =>
  callApi<{ householdId: string; itemId: string }, void>("item.delete", {
    householdId,
    itemId,
  });

export const restoreItem = (householdId: string, itemId: string) =>
  callApi<{ householdId: string; itemId: string }, ItemDetailDto>(
    "item.restore",
    { householdId, itemId },
  );

export const bulkMoveItems = (input: BulkMoveCategoryInput) =>
  callApi<BulkMoveCategoryInput, number>("item.bulkMoveCategory", input);
