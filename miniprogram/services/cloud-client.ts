import type { ApiAction } from "../../packages/contracts/src/actions";
import type { ApiResponse } from "../../packages/contracts/src/dto";

export function getCloudErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const candidate = error as { errMsg?: unknown; message?: unknown };
    if (typeof candidate.errMsg === "string") return candidate.errMsg;
    if (typeof candidate.message === "string") return candidate.message;
  }
  return "未知云服务错误";
}

export function isCloudSetupError(message: string): boolean {
  return [
    /(?:environment|env|环境).*(?:not found|不存在|未找到|invalid)/i,
    /(?:function|云函数).*(?:not found|不存在|未找到|未部署)/i,
    /(?:not found|不存在|未找到|未部署).*(?:environment|env|环境|function|云函数)/i,
    /cloud.*(?:not initialized|not enabled)/i,
    /云开发.*(?:未开通|未初始化)/i,
    /(?:collection|集合).*(?:not exist|does not exist|不存在)/i,
  ].some((pattern) => pattern.test(message));
}

export async function callApi<TPayload, TResult>(
  action: ApiAction,
  payload: TPayload,
): Promise<TResult> {
  const response = await wx.cloud.callFunction({
    name: "api",
    data: {
      action,
      payload,
      requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
  });
  const result = response.result as ApiResponse<TResult> | undefined;
  if (!result || typeof result !== "object" || !("ok" in result)) {
    throw new Error("云服务返回异常，请稍后重试");
  }
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
