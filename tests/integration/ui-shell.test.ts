import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("小程序主要界面", () => {
  it("四个主标签都有可见内容", () => {
    for (const page of ["home", "items", "reminders", "profile"]) {
      const wxml = readFileSync(`miniprogram/pages/${page}/index.wxml`, "utf8");
      expect(wxml.length, page).toBeGreaterThan(300);
    }
  });

  it("提醒页提供待处理与已处理视图", () => {
    const wxml = readFileSync("miniprogram/pages/reminders/index.wxml", "utf8");
    expect(wxml).toContain("待处理");
    expect(wxml).toContain("已处理");
  });

  it("核心流程页面包含真实操作入口", () => {
    expect(readFileSync("miniprogram/pages/item-form/index.wxml", "utf8")).toContain("保存物品");
    expect(readFileSync("miniprogram/pages/item-detail/index.wxml", "utf8")).toContain("标记已处理");
    expect(readFileSync("miniprogram/pages/profile/index.wxml", "utf8")).toContain("家庭成员");
  });
});
