import type { Actor } from "../context";
import type {
  CategoryService,
  ReorderCategoriesInput,
  SaveCategoryInput,
} from "./service";

export function createCategoryHandlers(service: CategoryService) {
  return {
    list: (actor: Actor, householdId: string) =>
      service.listCategories(actor, householdId),
    save: (actor: Actor, input: SaveCategoryInput) =>
      service.saveCategory(actor, input),
    reorder: (actor: Actor, input: ReorderCategoriesInput) =>
      service.reorderCategories(actor, input),
  };
}
