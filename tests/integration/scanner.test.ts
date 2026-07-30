import { describe, expect, it } from "vitest";
import { createScanner } from "../../miniprogram/services/scanner";

describe("扫码适配器", () => {
  it("只接受条形码和二维码结果", async () => {
    const scanner = createScanner({
      scanCode: async () => ({ result: "6901234567890", scanType: "EAN_13" }),
    });
    await expect(scanner.scanProductCode()).resolves.toEqual({
      value: "6901234567890",
      type: "barcode",
    });
  });

  it("二维码结果映射为 qrCode", async () => {
    const scanner = createScanner({
      scanCode: async () => ({ result: "https://example.com/p/1", scanType: "QR_CODE" }),
    });
    await expect(scanner.scanProductCode()).resolves.toEqual({
      value: "https://example.com/p/1",
      type: "qrCode",
    });
  });

  it("用户取消扫码不显示系统错误", async () => {
    const scanner = createScanner({
      scanCode: async () => Promise.reject({ errMsg: "scanCode:fail cancel" }),
    });
    await expect(scanner.scanProductCode()).resolves.toBeNull();
  });
});
