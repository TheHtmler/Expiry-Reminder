import { describe, expect, it } from "vitest";
import { buildReminderSchedule } from "../../packages/domain/src/reminder-policy";

describe("buildReminderSchedule", () => {
  it("过期前三天每天提醒，之后每三天提醒", () => {
    expect(
      buildReminderSchedule({
        eventDate: "2026-07-29",
        thresholdDays: 2,
        repeatUntil: "2026-08-07",
      }),
    ).toEqual([
      "2026-07-27",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-04",
      "2026-08-07",
    ]);
  });
});
