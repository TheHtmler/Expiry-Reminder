import type { ApiEnvelope } from "../../contracts/src/dto";
import type { RequestContext } from "./context";
import { ServiceError } from "./context";
import type {
  CategoryService,
  ReorderCategoriesInput,
  SaveCategoryInput,
} from "./categories/service";
import type {
  AcceptInviteInput,
  CreateHouseholdInput,
  CreateInviteInput,
  DissolveHouseholdInput,
  HouseholdService,
  RemoveMemberInput,
  SessionService,
  TransferAdminInput,
  UpdateHouseholdSettingsInput,
} from "./households/service";
import { fail, ok } from "./result";
import type { LocationService, SaveLocationInput } from "./locations/service";
import type {
  BulkMoveCategoryInput,
  ChangeQuantityInput,
  CreateItemInput,
  ItemListQuery,
  ItemTargetInput,
  ProcessItemInput,
  UpdateItemInput,
} from "../../contracts/src/items";
import type { ItemService } from "./items/service";

export interface Services {
  session: SessionService;
  households: HouseholdService;
  categories: CategoryService;
  locations: LocationService;
  items: ItemService;
}

export function createRouter(services: Services) {
  return async function route(
    context: RequestContext,
    request: ApiEnvelope,
  ) {
    try {
      switch (request.action) {
        case "session.bootstrap":
          return ok(await services.session.bootstrap(context.actor.openId));
        case "household.create":
          return ok(
            await services.households.createHousehold(
              context.actor,
              request.payload as unknown as CreateHouseholdInput,
            ),
          );
        case "household.list":
          return ok(await services.households.listHouseholds(context.actor));
        case "household.invite.create":
          return ok(
            await services.households.createInvite(
              context.actor,
              request.payload as unknown as CreateInviteInput,
            ),
          );
        case "household.invite.accept":
          return ok(
            await services.households.acceptInvite(
              context.actor,
              request.payload as unknown as AcceptInviteInput,
            ),
          );
        case "household.member.list":
          return ok(
            await services.households.listMembers(
              context.actor,
              String(request.payload.householdId ?? ""),
            ),
          );
        case "household.member.remove":
          return ok(
            await services.households.removeMember(
              context.actor,
              request.payload as unknown as RemoveMemberInput,
            ),
          );
        case "household.admin.transfer":
          return ok(
            await services.households.transferAdmin(
              context.actor,
              request.payload as unknown as TransferAdminInput,
            ),
          );
        case "household.settings.update":
          return ok(
            await services.households.updateSettings(
              context.actor,
              request.payload as unknown as UpdateHouseholdSettingsInput,
            ),
          );
        case "household.dissolve":
          return ok(
            await services.households.dissolveHousehold(
              context.actor,
              request.payload as unknown as DissolveHouseholdInput,
            ),
          );
        case "category.list":
          return ok(
            await services.categories.listCategories(
              context.actor,
              String(request.payload.householdId ?? ""),
            ),
          );
        case "category.save":
          return ok(
            await services.categories.saveCategory(
              context.actor,
              request.payload as unknown as SaveCategoryInput,
            ),
          );
        case "category.reorder":
          return ok(
            await services.categories.reorderCategories(
              context.actor,
              request.payload as unknown as ReorderCategoriesInput,
            ),
          );
        case "location.list":
          return ok(
            await services.locations.listLocations(
              context.actor,
              String(request.payload.householdId ?? ""),
            ),
          );
        case "location.save":
          return ok(
            await services.locations.saveLocation(
              context.actor,
              request.payload as unknown as SaveLocationInput,
            ),
          );
        case "item.create":
          return ok(
            await services.items.createItem(
              context.actor,
              request.payload as unknown as CreateItemInput,
            ),
          );
        case "item.update":
          return ok(
            await services.items.updateItem(
              context.actor,
              request.payload as unknown as UpdateItemInput,
            ),
          );
        case "item.list":
          return ok(
            await services.items.listItems(
              context.actor,
              request.payload as unknown as ItemListQuery,
            ),
          );
        case "item.detail":
          return ok(
            await services.items.getItem(
              context.actor,
              request.payload as unknown as ItemTargetInput,
            ),
          );
        case "item.quantity.change":
          return ok(
            await services.items.changeQuantity(
              context.actor,
              request.payload as unknown as ChangeQuantityInput,
            ),
          );
        case "item.process":
          return ok(
            await services.items.processItem(
              context.actor,
              request.payload as unknown as ProcessItemInput,
            ),
          );
        case "item.delete":
          return ok(
            await services.items.deleteItem(
              context.actor,
              request.payload as unknown as ItemTargetInput,
            ),
          );
        case "item.restore":
          return ok(
            await services.items.restoreItem(
              context.actor,
              request.payload as unknown as ItemTargetInput,
            ),
          );
        case "item.bulkMoveCategory":
          return ok(
            await services.items.bulkMoveCategory(
              context.actor,
              request.payload as unknown as BulkMoveCategoryInput,
            ),
          );
        default:
          return fail("NOT_FOUND", "未知操作");
      }
    } catch (error) {
      if (error instanceof ServiceError) {
        return fail(error.code, error.message);
      }
      throw error;
    }
  };
}
