import { describe, expect, it } from "vitest";
import { validateItemDraft } from "../../miniprogram/pages/item-form/validation";

describe("物品表单校验", () => {
  it("名称、分类或日期缺失时拒绝提交", () => {
    expect(validateItemDraft({ name: "", categoryId: "", events: [] })).toEqual({
      valid: false,
      errors: {
        name: "请输入物品名称",
        categoryId: "请选择分类",
        events: "请至少填写一个日期",
      },
    });
  });

  it("拒绝到期日早于生产日期", () => {
    expect(validateItemDraft({
      name: "牛奶",
      categoryId: "food",
      events: [
        { type: "production", date: "2026-07-30", thresholdDays: 0 },
        { type: "expiry", date: "2026-07-29", thresholdDays: 7 },
      ],
    })).toMatchObject({
      valid: false,
      errors: { events: "到期日期不能早于生产日期" },
    });
  });
});
