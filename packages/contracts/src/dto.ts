import type { ApiAction } from "./actions";
import type { ApiErrorCode } from "./errors";

export interface ApiRequest<A extends ApiAction, P = unknown> {
  action: A;
  payload: P;
  requestId: string;
}

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string } };

export type ApiEnvelope = ApiRequest<
  ApiAction,
  Record<string, unknown>
>;
