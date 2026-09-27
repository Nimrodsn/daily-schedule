import { formatInTimeZone } from "date-fns-tz";

/**
 * Every "today" and "now" decision in the app goes through this module.
 * Vercel runs in UTC, so nothing may rely on the host timezone.
 *
 * Dates are plain `YYYY-MM-DD` strings and times are `HH:mm` strings, matching
 * the Postgres `date` and `time` columns. Keeping them as strings avoids the
 * whole class of bugs where a Date object silently shifts across midnight.
 */

export const DEFAULT_TIMEZONE = "Asia/Jerusalem";

/** `YYYY-MM-DD` */
export type IsoDate = string;
/** `HH:mm` */
export type ClockTime = string;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_TIME_RE = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

export const MINUTES_PER_DAY = 24 * 60;

/** Sunday-first, matching Postgres `extract(dow)` and `templates.days_of_week`. */
export const HEBREW_WEEKDAYS_LONG = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת",
] as const;

export const HEBREW_WEEKDAYS_SHORT = [
  "א׳",
  "ב׳",
  "ג׳",
  "ד׳",
  "ה׳",
  "ו׳",
  "ש׳",
] as const;

export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === "string" && ISO_DATE_RE.test(value);
}

function assertIsoDate(date: string): void {
  if (!ISO_DATE_RE.test(date)) {
    throw new RangeError(`Expected a YYYY-MM-DD date, received "${date}"`);
  }
}

/** Anchors a calendar date at UTC noon so formatting never crosses midnight. */
function utcAnchor(date: IsoDate): Date {
  assertIsoDate(date);
  const anchor = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(anchor.getTime())) {
    throw new RangeError(`Invalid calendar date "${date}"`);
  }
  return anchor;
}

/** The current calendar date in the given timezone. */
export function todayIso(
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): IsoDate {
  return formatInTimeZone(now, timeZone, "yyyy-MM-dd");
}

/** The current wall-clock time in the given timezone. */
export function nowClock(
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): ClockTime {
  return formatInTimeZone(now, timeZone, "HH:mm");
}

/** Minutes since midnight in the given timezone. */
export function nowMinutes(
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): number {
  return timeToMinutes(nowClock(timeZone, now));
}

/** 0 = Sunday ... 6 = Saturday. */
export function dayOfWeek(date: IsoDate): number {
  return utcAnchor(date).getUTCDay();
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const anchor = utcAnchor(date);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return anchor.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function diffInDays(from: IsoDate, to: IsoDate): number {
  const ms = utcAnchor(to).getTime() - utcAnchor(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Postgres returns `time` as `HH:mm:ss`; the UI only ever wants `HH:mm`. */
export function normalizeTime(
  value: string | null | undefined,
): ClockTime | null {
  if (value == null || value === "") return null;

  const match = CLOCK_TIME_RE.exec(value);
  if (!match) {
    throw new RangeError(`Expected an HH:mm time, received "${value}"`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new RangeError(`Time out of range: "${value}"`);
  }

  return `${match[1]}:${match[2]}`;
}

export function timeToMinutes(value: ClockTime): number {
  const normalized = normalizeTime(value);
  if (normalized === null) {
    throw new RangeError("Cannot convert an empty time to minutes");
  }
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Wraps around midnight so callers can add freely and read back the day shift. */
export function minutesToTime(totalMinutes: number): ClockTime {
  const wrapped =
    ((Math.round(totalMinutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) %
    MINUTES_PER_DAY;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export type Scheduled = { date: IsoDate; time: ClockTime };

/** "דחה שעה" - push a scheduled task forward, rolling into the next day. */
export function snoozeByMinutes(
  date: IsoDate,
  time: ClockTime,
  minutes: number,
): Scheduled {
  const total = timeToMinutes(time) + minutes;
  const dayShift = Math.floor(total / MINUTES_PER_DAY);
  return {
    date: addDays(date, dayShift),
    time: minutesToTime(total),
  };
}

export function snoozeByHour(date: IsoDate, time: ClockTime): Scheduled {
  return snoozeByMinutes(date, time, 60);
}

/** The Sunday-to-Saturday week containing `date`. */
export function weekStrip(date: IsoDate): IsoDate[] {
  const sunday = addDays(date, -dayOfWeek(date));
  return Array.from({ length: 7 }, (_, index) => addDays(sunday, index));
}

/** A pending task counts as overdue once its scheduled moment has passed. */
export function isOverdue(
  date: IsoDate,
  time: ClockTime | null,
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): boolean {
  const today = todayIso(timeZone, now);
  if (date < today) return true;
  if (date > today) return false;
  if (time === null) return false;
  return timeToMinutes(time) < nowMinutes(timeZone, now);
}

export function formatHebrewWeekday(date: IsoDate): string {
  return HEBREW_WEEKDAYS_LONG[dayOfWeek(date)];
}

/** "יום שלישי, 29 בספטמבר" */
export function formatHebrewDateLong(date: IsoDate): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(utcAnchor(date));
}

/** "29 בספטמבר" */
export function formatHebrewDateShort(date: IsoDate): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
  }).format(utcAnchor(date));
}

/** The Hebrew-calendar date, e.g. "ט״ו בתשרי תשפ״ו". */
export function formatHebrewCalendarDate(date: IsoDate): string {
  return new Intl.DateTimeFormat("he-u-ca-hebrew", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(utcAnchor(date));
}

/** Relative label used in headers and the week strip. */
export function relativeDayLabel(
  date: IsoDate,
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): string | null {
  const today = todayIso(timeZone, now);
  switch (diffInDays(today, date)) {
    case 0:
      return "היום";
    case 1:
      return "מחר";
    case 2:
      return "מחרתיים";
    case -1:
      return "אתמול";
    default:
      return null;
  }
}
