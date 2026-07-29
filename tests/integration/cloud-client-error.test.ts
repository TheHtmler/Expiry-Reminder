import { describe, expect, it } from "vitest";
import {
  getCloudErrorMessage,
  isCloudSetupError,
} from "../../miniprogram/services/cloud-client";

describe("云函数错误提示", () => {
  it("提取微信接口 errMsg", () => {
    expect(getCloudErrorMessage({ errMsg: "cloud.callFunction:fail function not found" }))
      .toBe("cloud.callFunction:fail function not found");
  });

  it("识别环境或云函数未配置", () => {
    expect(isCloudSetupError("cloud.callFunction:fail function not found")).toBe(true);
    expect(isCloudSetupError("Collection users not exists")).toBe(true);
    expect(isCloudSetupError("网络暂时不可用")).toBe(false);
    expect(isCloudSetupError("cloud.callFunction:fail network error")).toBe(false);
  });
});
