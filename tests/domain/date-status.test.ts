import { describe, expect, it } from "vitest";
import { calculateEventStatus } from "../../packages/domain/src/date-status";

describe("calculateEventStatus", () => {
  it.each([
    ["2026-08-10", 7, "normal"],
    ["2026-08-05", 7, "near_expiry"],
    ["2026-07-29", 7, "due_today"],
    ["2026-07-28", 7, "expired"],
  ] as const)("将 %s 计算为 %s", (eventDate, thresholdDays, expected) => {
    expect(
      calculateEventStatus({
        today: "2026-07-29",
        eventDate,
        thresholdDays,
        processed: false,
      }),
    ).toBe(expected);
  });

  it("已处理事件始终返回 processed", () => {
    expect(
      calculateEventStatus({
        today: "2026-07-29",
        eventDate: "2026-07-01",
        thresholdDays: 7,
        processed: true,
      }),
    ).toBe("processed");
  });
});
