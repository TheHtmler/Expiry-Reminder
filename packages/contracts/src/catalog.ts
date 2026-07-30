export interface ProductMatchDto {
  barcode: string;
  name: string;
  brand?: string;
  specification?: string;
  imageFileId?: string;
  categorySystemKey?: string;
  defaultThresholdDays?: number;
  defaultShelfLifeDays?: number;
  source: "household" | "public";
}

export interface CatalogLookupInput {
  householdId: string;
  code: string;
}

export interface MergeCandidateInput {
  householdId: string;
  barcode: string;
  expiryDate: string;
  locationId?: string;
}

export interface MergeCandidateDto {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  version: number;
  barcode: string;
  locationId?: string;
  nearestEventDate: string;
}
