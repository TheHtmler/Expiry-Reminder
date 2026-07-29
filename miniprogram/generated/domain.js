"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/domain/src/index.ts
var src_exports = {};
__export(src_exports, {
  DEFAULT_CATEGORIES: () => DEFAULT_CATEGORIES,
  buildReminderSchedule: () => buildReminderSchedule,
  calculateEventStatus: () => calculateEventStatus,
  changeQuantity: () => changeQuantity
});
module.exports = __toCommonJS(src_exports);

// packages/domain/src/date-status.ts
var DAY_MS = 864e5;
function parseDate(value) {
  const [year = Number.NaN, month = Number.NaN, day = Number.NaN] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
function calculateEventStatus(input) {
  if (input.processed) return "processed";
  const days = Math.round(
    (parseDate(input.eventDate) - parseDate(input.today)) / DAY_MS
  );
  if (days < 0) return "expired";
  if (days === 0) return "due_today";
  if (days <= input.thresholdDays) return "near_expiry";
  return "normal";
}

// packages/domain/src/default-categories.ts
var DEFAULT_CATEGORIES = [
  {
    key: "food",
    name: "\u98DF\u54C1\u996E\u6599",
    icon: "food",
    color: "#E98A5F",
    defaultThresholdDays: 7
  },
  {
    key: "medicine",
    name: "\u836F\u54C1\u4FDD\u5065",
    icon: "medicine",
    color: "#D56F6F",
    defaultThresholdDays: 7
  },
  {
    key: "beauty",
    name: "\u7F8E\u5986\u4E2A\u62A4",
    icon: "beauty",
    color: "#C9819F",
    defaultThresholdDays: 7
  },
  {
    key: "digital",
    name: "\u6570\u7801\u4EA7\u54C1",
    icon: "digital",
    color: "#4F7E9D",
    defaultThresholdDays: 30
  },
  {
    key: "appliance",
    name: "\u5BB6\u7528\u7535\u5668",
    icon: "appliance",
    color: "#4F8B72",
    defaultThresholdDays: 30
  },
  {
    key: "household_supply",
    name: "\u5BB6\u5EAD\u8017\u6750",
    icon: "household-supply",
    color: "#A77A52",
    defaultThresholdDays: 7
  },
  {
    key: "document_service",
    name: "\u8BC1\u4EF6\u4E0E\u670D\u52A1",
    icon: "document-service",
    color: "#6C7293",
    defaultThresholdDays: 30
  },
  {
    key: "other",
    name: "\u5176\u4ED6",
    icon: "other",
    color: "#747B74",
    defaultThresholdDays: 7
  }
];

// packages/domain/src/quantity.ts
function changeQuantity(current, delta) {
  const quantity = current + delta;
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("\u6570\u91CF\u4E0D\u80FD\u5C0F\u4E8E\u96F6");
  }
  return { quantity, exhausted: quantity === 0 };
}

// packages/domain/src/reminder-policy.ts
var DAY_MS2 = 864e5;
var toDate = (value) => /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
var toIso = (value) => value.toISOString().slice(0, 10);
var addDays = (value, days) => new Date(value.getTime() + days * DAY_MS2);
function buildReminderSchedule(input) {
  const event = toDate(input.eventDate);
  const end = toDate(input.repeatUntil);
  const dates = /* @__PURE__ */ new Set([
    toIso(addDays(event, -input.thresholdDays)),
    toIso(event)
  ]);
  for (let day = 1; day <= 3; day += 1) {
    const date = addDays(event, day);
    if (date <= end) dates.add(toIso(date));
  }
  for (let day = 6; addDays(event, day) <= end; day += 3) {
    dates.add(toIso(addDays(event, day)));
  }
  return [...dates].sort();
}
