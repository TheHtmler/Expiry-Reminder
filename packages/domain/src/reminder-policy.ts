export interface ReminderScheduleInput {
  eventDate: string;
  thresholdDays: number;
  repeatUntil: string;
}

const DAY_MS = 86_400_000;

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const toIso = (value: Date) => value.toISOString().slice(0, 10);
const addDays = (value: Date, days: number) =>
  new Date(value.getTime() + days * DAY_MS);

export function buildReminderSchedule(
  input: ReminderScheduleInput,
): string[] {
  const event = toDate(input.eventDate);
  const end = toDate(input.repeatUntil);
  const dates = new Set<string>([
    toIso(addDays(event, -input.thresholdDays)),
    toIso(event),
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
