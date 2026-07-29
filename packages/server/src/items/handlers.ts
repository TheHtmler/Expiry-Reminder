import type { Actor } from "../context";
import type {
  BulkMoveCategoryInput,
  ChangeQuantityInput,
  CreateItemInput,
  ItemListQuery,
  ItemTargetInput,
  ProcessItemInput,
  UpdateItemInput,
} from "../../../contracts/src/items";
import type { ItemService } from "./service";

export function createItemHandlers(service: ItemService) {
  return {
    create: (actor: Actor, input: CreateItemInput) => service.createItem(actor, input),
    update: (actor: Actor, input: UpdateItemInput) => service.updateItem(actor, input),
    list: (actor: Actor, input: ItemListQuery) => service.listItems(actor, input),
    detail: (actor: Actor, input: ItemTargetInput) => service.getItem(actor, input),
    changeQuantity: (actor: Actor, input: ChangeQuantityInput) =>
      service.changeQuantity(actor, input),
    process: (actor: Actor, input: ProcessItemInput) => service.processItem(actor, input),
    delete: (actor: Actor, input: ItemTargetInput) => service.deleteItem(actor, input),
    restore: (actor: Actor, input: ItemTargetInput) => service.restoreItem(actor, input),
    bulkMoveCategory: (actor: Actor, input: BulkMoveCategoryInput) =>
      service.bulkMoveCategory(actor, input),
  };
}
