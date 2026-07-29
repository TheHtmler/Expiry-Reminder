import type { ApiErrorCode } from "../../contracts/src/errors";

export interface Actor {
  userId: string;
  openId: string;
}

export interface RequestContext {
  actor: Actor;
}

export class ServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
