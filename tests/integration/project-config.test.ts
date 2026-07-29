import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("微信小程序工程配置", () => {
  it("使用正式 AppID 与 miniprogram 根目录", () => {
    const config = JSON.parse(readFileSync("project.config.json", "utf8"));
    expect(config.appid).toBe("wxb8bd2ab35c41a7cd");
    expect(config.miniprogramRoot).toBe("miniprogram/");
    expect(config.cloudfunctionRoot).toBe("cloudfunctions/");
  });

  it("注册四个首期页面", () => {
    const app = JSON.parse(readFileSync("miniprogram/app.json", "utf8"));
    expect(app.pages).toEqual([
      "pages/home/index",
      "pages/items/index",
      "pages/reminders/index",
      "pages/profile/index",
    ]);
  });
});
