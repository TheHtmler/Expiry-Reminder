import type {
  CatalogLookupInput,
  MergeCandidateDto,
  MergeCandidateInput,
  ProductMatchDto,
} from "../../../contracts/src/catalog";
import type { Actor } from "../context";
import { ServiceError } from "../context";
import type { CatalogRecord, Repositories } from "../repositories";

function normalizeLocationId(locationId?: string | null): string | undefined {
  const value = locationId?.trim();
  return value ? value : undefined;
}

function toMatchDto(
  record: CatalogRecord,
  source: "household" | "public",
): ProductMatchDto {
  return {
    barcode: record.barcode,
    name: record.name,
    brand: record.brand,
    specification: record.specification,
    imageFileId: record.imageFileId,
    categorySystemKey: record.categorySystemKey,
    defaultThresholdDays: record.defaultThresholdDays,
    defaultShelfLifeDays: record.defaultShelfLifeDays,
    source,
  };
}

export class CatalogService {
  constructor(private readonly repos: Repositories) {}

  async rememberHouseholdProduct(
    householdId: string,
    product: {
      barcode: string;
      name: string;
      brand?: string;
      specification?: string;
      imageFileId?: string;
      categorySystemKey?: string;
      defaultThresholdDays?: number;
    },
  ): Promise<void> {
    const barcode = product.barcode.trim();
    const name = product.name.trim();
    if (!barcode || !name) return;
    const existing = await this.repos.catalog.findHousehold(householdId, barcode);
    const id = existing?.id ?? `household_${householdId}_${barcode}`;
    await this.repos.catalog.upsert({
      id,
      scope: "household",
      householdId,
      barcode,
      name,
      brand: product.brand,
      specification: product.specification,
      imageFileId: product.imageFileId,
      categorySystemKey: product.categorySystemKey ?? existing?.categorySystemKey,
      defaultThresholdDays:
        product.defaultThresholdDays ?? existing?.defaultThresholdDays,
      defaultShelfLifeDays: existing?.defaultShelfLifeDays,
      updatedAt: new Date().toISOString(),
    });
  }

  async lookup(
    actor: Actor,
    householdId: string,
    code: string,
  ): Promise<ProductMatchDto | null> {
    await this.assertActiveMember(actor, householdId);
    const barcode = code.trim();
    if (!barcode) {
      throw new ServiceError("VALIDATION_ERROR", "条码不能为空");
    }
    const household = await this.repos.catalog.findHousehold(
      householdId,
      barcode,
    );
    if (household) return toMatchDto(household, "household");
    const publicProduct = await this.repos.catalog.findPublic(barcode);
    if (publicProduct) return toMatchDto(publicProduct, "public");
    return null;
  }

  async lookupByInput(
    actor: Actor,
    input: CatalogLookupInput,
  ): Promise<ProductMatchDto | null> {
    return this.lookup(actor, input.householdId, input.code);
  }

  async findMergeCandidate(
    actor: Actor,
    input: MergeCandidateInput,
  ): Promise<MergeCandidateDto | null> {
    await this.assertActiveMember(actor, input.householdId);
    const barcode = input.barcode.trim();
    const expiryDate = input.expiryDate.trim();
    if (!barcode || !expiryDate) {
      throw new ServiceError("VALIDATION_ERROR", "合并比对信息不完整");
    }
    const locationId = normalizeLocationId(input.locationId);
    const items = await this.repos.items.listByHousehold(input.householdId);
    for (const item of items) {
      if (item.deletedAt !== null) continue;
      if ((item.barcode ?? "").trim() !== barcode) continue;
      if (normalizeLocationId(item.locationId) !== locationId) continue;
      const events = await this.repos.itemEvents.listByItem(item.id);
      const hasExpiry = events.some(
        (event) => event.type === "expiry" && event.date === expiryDate,
      );
      if (!hasExpiry && item.nearestEventDate !== expiryDate) continue;
      return {
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        version: item.version,
        barcode,
        locationId: item.locationId,
        nearestEventDate: item.nearestEventDate,
      };
    }
    return null;
  }

  private async assertActiveMember(actor: Actor, householdId: string) {
    const member = await this.repos.members.find(householdId, actor.userId);
    if (!member || member.status !== "active") {
      throw new ServiceError("FORBIDDEN", "无权访问该家庭");
    }
    return member;
  }
}
