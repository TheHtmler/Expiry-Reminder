import { describe, expect, it } from "vitest";
import { CLOUD_ENV_ID } from "../../miniprogram/config/cloud";

describe("CloudBase 环境配置", () => {
  it("使用当前开发环境", () => {
    expect(CLOUD_ENV_ID).toBe("cloud1-d6ga4b3yb70ea3b1c");
  });
});
