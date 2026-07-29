import { randomUUID } from "node:crypto";
import { DEFAULT_CATEGORIES } from "../../../domain/src/default-categories";
import type { Actor } from "../context";
import { ServiceError } from "../context";
import type { CategoryRecord, Repositories } from "../repositories";

export interface SaveCategoryInput {
  householdId: string;
  id?: string;
  name: string;
  icon: string;
  color: string;
  defaultThresholdDays?: number;
  hidden?: boolean;
}

export interface ReorderCategoriesInput {
  householdId: string;
  categoryIds: string[];
}

export class CategoryService {
  constructor(
    private readonly repos: Repositories,
    private readonly createId: (prefix: string) => string = (prefix) =>
      `${prefix}_${randomUUID()}`,
  ) {}

  async ensureDefaultCategories(householdId: string): Promise<void> {
    for (const [sortOrder, category] of DEFAULT_CATEGORIES.entries()) {
      const existing = await this.repos.categories.findBySystemKey(
        householdId,
        category.key,
      );
      if (existing) continue;
      await this.repos.categories.insert({
        id: `category_${householdId}_${category.key}`,
        householdId,
        source: "system",
        systemKey: category.key,
        name: category.name,
        icon: category.icon,
        color: category.color,
        defaultThresholdDays: category.defaultThresholdDays,
        sortOrder,
        hidden: false,
        status: "active",
      });
    }
  }

  async listCategories(
    actor: Actor,
    householdId: string,
  ): Promise<CategoryRecord[]> {
    await this.assertActiveMember(actor, householdId);
    const categories = await this.repos.categories.listByHousehold(householdId);
    return categories.sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );
  }

  async saveCategory(
    actor: Actor,
    input: SaveCategoryInput,
  ): Promise<CategoryRecord> {
    await this.assertAdmin(actor, input.householdId);
    const name = input.name.trim();
    const icon = input.icon.trim();
    if (
      !name ||
      !icon ||
      !/^#[0-9A-Fa-f]{6}$/.test(input.color) ||
      (input.defaultThresholdDays !== undefined &&
        (!Number.isInteger(input.defaultThresholdDays) ||
          input.defaultThresholdDays < 0))
    ) {
      throw new ServiceError("VALIDATION_ERROR", "分类信息无效");
    }
    if (input.id) {
      const existing = await this.repos.categories.findById(input.id);
      if (!existing || existing.householdId !== input.householdId) {
        throw new ServiceError("NOT_FOUND", "分类不存在");
      }
      const update = {
        name,
        icon,
        color: input.color.toUpperCase(),
        hidden: input.hidden ?? existing.hidden,
        defaultThresholdDays:
          input.defaultThresholdDays ?? existing.defaultThresholdDays,
      };
      await this.repos.categories.update(existing.id, update);
      return { ...existing, ...update };
    }
    const categories = await this.repos.categories.listByHousehold(
      input.householdId,
    );
    const record: CategoryRecord = {
      id: this.createId("category"),
      householdId: input.householdId,
      source: "custom",
      name,
      icon,
      color: input.color.toUpperCase(),
      defaultThresholdDays: input.defaultThresholdDays ?? 7,
      sortOrder: categories.length,
      hidden: input.hidden ?? false,
      status: "active",
    };
    await this.repos.categories.insert(record);
    return record;
  }

  async reorderCategories(
    actor: Actor,
    input: ReorderCategoriesInput,
  ): Promise<void> {
    await this.assertAdmin(actor, input.householdId);
    const visible = (await this.repos.categories.listByHousehold(
      input.householdId,
    )).filter((category) => !category.hidden);
    const visibleIds = new Set(visible.map((category) => category.id));
    const requestedIds = new Set(input.categoryIds);
    if (
      requestedIds.size !== input.categoryIds.length ||
      requestedIds.size !== visibleIds.size ||
      [...requestedIds].some((id) => !visibleIds.has(id))
    ) {
      throw new ServiceError("VALIDATION_ERROR", "分类排序数据无效");
    }
    await this.repos.transaction(async (repos) => {
      for (const [sortOrder, id] of input.categoryIds.entries()) {
        await repos.categories.update(id, { sortOrder });
      }
    });
  }

  private async assertActiveMember(actor: Actor, householdId: string) {
    const member = await this.repos.members.find(householdId, actor.userId);
    if (!member || member.status !== "active") {
      throw new ServiceError("FORBIDDEN", "无权访问该家庭");
    }
    return member;
  }

  private async assertAdmin(actor: Actor, householdId: string) {
    const member = await this.assertActiveMember(actor, householdId);
    if (member.role !== "admin") {
      throw new ServiceError("FORBIDDEN", "仅管理员可管理分类");
    }
  }
}
