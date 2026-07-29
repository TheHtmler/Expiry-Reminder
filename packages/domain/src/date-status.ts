export type EventStatus =
  | "normal"
  | "near_expiry"
  | "due_today"
  | "expired"
  | "processed";

export interface EventStatusInput {
  today: string;
  eventDate: string;
  thresholdDays: number;
  processed: boolean;
}

const DAY_MS = 86_400_000;

function parseDate(value: string): number {
  const [year = Number.NaN, month = Number.NaN, day = Number.NaN] = value
    .split("-")
    .map(Number);
  return Date.UTC(year, month - 1, day);
}

export function calculateEventStatus(input: EventStatusInput): EventStatus {
  if (input.processed) return "processed";

  const days = Math.round(
    (parseDate(input.eventDate) - parseDate(input.today)) / DAY_MS,
  );
  if (days < 0) return "expired";
  if (days === 0) return "due_today";
  if (days <= input.thresholdDays) return "near_expiry";
  return "normal";
}
