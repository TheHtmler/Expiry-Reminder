import { describe, expect, it } from "vitest";
import { fail, ok } from "../../packages/server/src/result";

describe("云函数统一返回结构", () => {
  it("返回统一成功与失败结构", () => {
    expect(ok({ id: "1" })).toEqual({ ok: true, data: { id: "1" } });
    expect(fail("FORBIDDEN", "无权访问该家庭")).toEqual({
      ok: false,
      error: { code: "FORBIDDEN", message: "无权访问该家庭" },
    });
  });
});
