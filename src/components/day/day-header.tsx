"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

import { ProgressRing } from "@/components/day/progress-ring";
import { WeekStrip } from "@/components/day/week-strip";
import { Button } from "@/components/ui/button";
import type { DayProgress } from "@/lib/day";
import {
  addDays,
  diffInDays,
  formatHebrewCalendarDate,
  formatHebrewDateLong,
  weekStrip,
  type IsoDate,
} from "@/lib/time";

/**
 * Same labels as relativeDayLabel, but anchored to the day the screen is
 * showing as "today" rather than re-reading the clock.
 */
function relativeTo(today: IsoDate, date: IsoDate): string | null {
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

export function DayHeader({
  date,
  today,
  progress,
  progressByDate,
  onSelect,
}: {
  date: IsoDate;
  today: IsoDate;
  progress: DayProgress;
  progressByDate: Map<IsoDate, DayProgress>;
  onSelect: (date: IsoDate) => void;
}) {
  const relative = relativeTo(today, date);

  return (
    <header className="space-y-3">
      <div className="flex items-center gap-2">
        {/* In RTL the chevron pointing right moves backwards in time. */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSelect(addDays(date, -1))}
          aria-label="היום הקודם"
          className="size-11 shrink-0"
        >
          <ChevronRight aria-hidden="true" />
        </Button>

        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-lg font-semibold">
            {relative ?? formatHebrewDateLong(date)}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {relative ? `${formatHebrewDateLong(date)} · ` : ""}
            {formatHebrewCalendarDate(date)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSelect(addDays(date, 1))}
          aria-label="היום הבא"
          className="size-11 shrink-0"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <ProgressRing progress={progress} />

        <div className="min-w-0 flex-1">
          {/* .numeric isolates as LTR, so it goes on a span rather than the
              paragraph, which would drag the text alignment with it. */}
          <p className="text-sm font-medium">
            <span className="numeric">
              {progress.done} / {progress.total}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {progress.total === 0
              ? "אין משימות ליום הזה"
              : progress.done === progress.total
                ? "הכול בוצע. כל הכבוד!"
                : `נותרו ${progress.total - progress.done}`}
          </p>
        </div>

        {date !== today ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(today)}
            className="shrink-0"
          >
            <CalendarDays aria-hidden="true" />
            היום
          </Button>
        ) : null}
      </div>

      <WeekStrip
        dates={weekStrip(date)}
        selected={date}
        today={today}
        progressByDate={progressByDate}
        onSelect={onSelect}
      />
    </header>
  );
}
