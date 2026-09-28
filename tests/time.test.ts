import { describe, expect, it } from "vitest";

import {
  addDays,
  DEFAULT_TIMEZONE,
  dayOfWeek,
  diffInDays,
  formatHebrewCalendarDate,
  formatHebrewDateLong,
  formatHebrewWeekday,
  isOverdue,
  minutesToTime,
  normalizeTime,
  nowClock,
  nowMinutes,
  relativeDayLabel,
  snoozeByHour,
  snoozeByMinutes,
  timeToMinutes,
  todayIso,
  toGematria,
  weekStrip,
} from "@/lib/time";

// The suite runs with TZ=UTC (see vitest.config.mts) so any function that
// forgets to convert into Asia/Jerusalem will fail here.

describe("todayIso", () => {
  it("uses the Jerusalem date, not the UTC date, in winter (UTC+2)", () => {
    const instant = new Date("2026-01-15T22:30:00Z");
    expect(todayIso(DEFAULT_TIMEZONE, instant)).toBe("2026-01-16");
  });

  it("uses the Jerusalem date, not the UTC date, in summer (UTC+3)", () => {
    const instant = new Date("2026-07-01T21:30:00Z");
    expect(todayIso(DEFAULT_TIMEZONE, instant)).toBe("2026-07-02");
  });

  it("stays on the previous day before the Jerusalem rollover", () => {
    const instant = new Date("2026-07-01T20:30:00Z");
    expect(todayIso(DEFAULT_TIMEZONE, instant)).toBe("2026-07-01");
  });
});

describe("nowClock", () => {
  it("shifts by two hours in winter", () => {
    expect(nowClock(DEFAULT_TIMEZONE, new Date("2026-01-15T09:00:00Z"))).toBe(
      "11:00",
    );
  });

  it("shifts by three hours during daylight saving time", () => {
    expect(nowClock(DEFAULT_TIMEZONE, new Date("2026-07-01T09:00:00Z"))).toBe(
      "12:00",
    );
  });

  it("reports minutes since Jerusalem midnight", () => {
    expect(nowMinutes(DEFAULT_TIMEZONE, new Date("2026-07-01T09:30:00Z"))).toBe(
      12 * 60 + 30,
    );
  });
});

describe("dayOfWeek", () => {
  it("returns 0 for Sunday and 6 for Saturday", () => {
    expect(dayOfWeek("2026-09-27")).toBe(0);
    expect(dayOfWeek("2026-10-03")).toBe(6);
  });

  it("rejects malformed dates", () => {
    expect(() => dayOfWeek("27/09/2026")).toThrow(RangeError);
  });
});

describe("addDays and diffInDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("is unaffected by the Israeli DST transition", () => {
    // DST starts on 2026-03-27; a naive 24h addition would land on the 27th.
    expect(addDays("2026-03-26", 2)).toBe("2026-03-28");
    expect(diffInDays("2026-03-26", "2026-03-29")).toBe(3);
  });

  it("returns negative differences for earlier dates", () => {
    expect(diffInDays("2026-09-27", "2026-09-20")).toBe(-7);
  });
});

describe("normalizeTime", () => {
  it("trims the seconds Postgres sends back", () => {
    expect(normalizeTime("08:00:00")).toBe("08:00");
    expect(normalizeTime("23:59:59.999")).toBe("23:59");
  });

  it("passes through an already-normalized time", () => {
    expect(normalizeTime("07:05")).toBe("07:05");
  });

  it("treats null and empty string as no time", () => {
    expect(normalizeTime(null)).toBeNull();
    expect(normalizeTime(undefined)).toBeNull();
    expect(normalizeTime("")).toBeNull();
  });

  it("rejects out-of-range and malformed values", () => {
    expect(() => normalizeTime("24:00")).toThrow(RangeError);
    expect(() => normalizeTime("08:60")).toThrow(RangeError);
    expect(() => normalizeTime("8:00")).toThrow(RangeError);
  });
});

describe("timeToMinutes and minutesToTime", () => {
  it("round-trips", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("13:45")).toBe(825);
    expect(minutesToTime(825)).toBe("13:45");
  });

  it("wraps around midnight in both directions", () => {
    expect(minutesToTime(24 * 60)).toBe("00:00");
    expect(minutesToTime(24 * 60 + 30)).toBe("00:30");
    expect(minutesToTime(-30)).toBe("23:30");
  });
});

describe("snooze", () => {
  it("adds an hour within the same day", () => {
    expect(snoozeByHour("2026-09-27", "09:15")).toEqual({
      date: "2026-09-27",
      time: "10:15",
    });
  });

  it("rolls over to the next day past midnight", () => {
    expect(snoozeByHour("2026-09-27", "23:30")).toEqual({
      date: "2026-09-28",
      time: "00:30",
    });
  });

  it("rolls over month boundaries for larger snoozes", () => {
    expect(snoozeByMinutes("2026-09-30", "23:00", 120)).toEqual({
      date: "2026-10-01",
      time: "01:00",
    });
  });
});

describe("weekStrip", () => {
  it("returns Sunday through Saturday for a midweek date", () => {
    // 2026-09-30 is a Wednesday.
    expect(weekStrip("2026-09-30")).toEqual([
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
  });

  it("keeps Sunday as the first day when given a Sunday", () => {
    expect(weekStrip("2026-09-27")[0]).toBe("2026-09-27");
  });

  it("keeps Sunday as the first day when given a Saturday", () => {
    expect(weekStrip("2026-10-03")[0]).toBe("2026-09-27");
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-09-27T09:00:00Z"); // 12:00 in Jerusalem

  it("marks an earlier time today as overdue", () => {
    expect(isOverdue("2026-09-27", "11:00", DEFAULT_TIMEZONE, now)).toBe(true);
  });

  it("does not mark a later time today as overdue", () => {
    expect(isOverdue("2026-09-27", "13:00", DEFAULT_TIMEZONE, now)).toBe(false);
  });

  it("never marks a task without a time as overdue on its own day", () => {
    expect(isOverdue("2026-09-27", null, DEFAULT_TIMEZONE, now)).toBe(false);
  });

  it("marks any past day as overdue, even without a time", () => {
    expect(isOverdue("2026-09-26", null, DEFAULT_TIMEZONE, now)).toBe(true);
  });

  it("never marks a future day as overdue", () => {
    expect(isOverdue("2026-09-28", "00:01", DEFAULT_TIMEZONE, now)).toBe(false);
  });
});

describe("Hebrew formatting", () => {
  it("names the weekday", () => {
    expect(formatHebrewWeekday("2026-09-27")).toBe("יום ראשון");
    expect(formatHebrewWeekday("2026-10-03")).toBe("שבת");
  });

  it("formats the Gregorian date in Hebrew", () => {
    const formatted = formatHebrewDateLong("2026-09-27");
    expect(formatted).toContain("יום ראשון");
    expect(formatted).toContain("ספטמבר");
    expect(formatted).toContain("27");
  });

  it("formats the Hebrew-calendar date in Hebrew numerals", () => {
    // 2026-09-27 is 16 Tishrei 5787.
    expect(formatHebrewCalendarDate("2026-09-27")).toBe("ט״ז בתשרי תשפ״ז");
  });
});

describe("toGematria", () => {
  it("writes single letters with a geresh", () => {
    expect(toGematria(1)).toBe("א׳");
    expect(toGematria(9)).toBe("ט׳");
    expect(toGematria(10)).toBe("י׳");
  });

  it("writes multiple letters with gershayim before the last", () => {
    expect(toGematria(11)).toBe("י״א");
    expect(toGematria(17)).toBe("י״ז");
    expect(toGematria(30)).toBe("ל׳");
  });

  it("avoids spelling a divine name at 15 and 16", () => {
    expect(toGematria(15)).toBe("ט״ו");
    expect(toGematria(16)).toBe("ט״ז");
  });

  it("handles years without the thousands", () => {
    expect(toGematria(787)).toBe("תשפ״ז");
    expect(toGematria(786)).toBe("תשפ״ו");
    expect(toGematria(700)).toBe("ת״ש");
  });

  it("rejects values it cannot express", () => {
    expect(() => toGematria(0)).toThrow(RangeError);
    expect(() => toGematria(-1)).toThrow(RangeError);
    expect(() => toGematria(1.5)).toThrow(RangeError);
  });
});

describe("relativeDayLabel", () => {
  const now = new Date("2026-09-27T09:00:00Z");

  it("labels today, tomorrow, the day after and yesterday", () => {
    expect(relativeDayLabel("2026-09-27", DEFAULT_TIMEZONE, now)).toBe("היום");
    expect(relativeDayLabel("2026-09-28", DEFAULT_TIMEZONE, now)).toBe("מחר");
    expect(relativeDayLabel("2026-09-29", DEFAULT_TIMEZONE, now)).toBe(
      "מחרתיים",
    );
    expect(relativeDayLabel("2026-09-26", DEFAULT_TIMEZONE, now)).toBe("אתמול");
  });

  it("returns null for dates further away", () => {
    expect(relativeDayLabel("2026-10-05", DEFAULT_TIMEZONE, now)).toBeNull();
  });
});
