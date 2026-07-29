import { randomUUID } from "node:crypto";
import type { Actor } from "../context";
import { ServiceError } from "../context";
import type { LocationRecord, Repositories } from "../repositories";

export interface SaveLocationInput {
  householdId: string;
  id?: string;
  name: string;
  sortOrder?: number;
  hidden?: boolean;
}

export class LocationService {
  constructor(
    private readonly repos: Repositories,
    private readonly createId: (prefix: string) => string = (prefix) =>
      `${prefix}_${randomUUID()}`,
  ) {}

  async listLocations(
    actor: Actor,
    householdId: string,
  ): Promise<LocationRecord[]> {
    await this.assertActiveMember(actor, householdId);
    const locations = await this.repos.locations.listByHousehold(householdId);
    return locations.sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );
  }

  async saveLocation(
    actor: Actor,
    input: SaveLocationInput,
  ): Promise<LocationRecord> {
    await this.assertAdmin(actor, input.householdId);
    const name = input.name.trim();
    if (
      !name ||
      (input.sortOrder !== undefined &&
        (!Number.isInteger(input.sortOrder) || input.sortOrder < 0))
    ) {
      throw new ServiceError("VALIDATION_ERROR", "位置信息无效");
    }
    const duplicate = await this.repos.locations.findByName(
      input.householdId,
      name,
    );
    if (duplicate && duplicate.id !== input.id) {
      throw new ServiceError("CONFLICT", "位置名称已存在");
    }
    if (input.id) {
      const existing = await this.repos.locations.findById(input.id);
      if (!existing || existing.householdId !== input.householdId) {
        throw new ServiceError("NOT_FOUND", "位置不存在");
      }
      const update = {
        name,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        hidden: input.hidden ?? existing.hidden,
      };
      await this.repos.locations.update(existing.id, update);
      return { ...existing, ...update };
    }
    const locations = await this.repos.locations.listByHousehold(
      input.householdId,
    );
    const record: LocationRecord = {
      id: this.createId("location"),
      householdId: input.householdId,
      name,
      sortOrder: input.sortOrder ?? locations.length,
      hidden: input.hidden ?? false,
      status: "active",
    };
    await this.repos.locations.insert(record);
    return record;
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
      throw new ServiceError("FORBIDDEN", "仅管理员可管理位置");
    }
  }
}
