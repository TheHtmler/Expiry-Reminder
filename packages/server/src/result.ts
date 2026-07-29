import type { ApiErrorCode } from "../../contracts/src/errors";

export const ok = <T>(data: T) => ({ ok: true as const, data });

export const fail = (code: ApiErrorCode, message: string) => ({
  ok: false as const,
  error: { code, message },
});
