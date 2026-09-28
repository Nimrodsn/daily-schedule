"use client";

import type { DayProgress } from "@/lib/day";
import {
  dayOfWeek,
  HEBREW_WEEKDAYS_LONG,
  HEBREW_WEEKDAYS_SHORT,
  type IsoDate,
} from "@/lib/time";
import { cn } from "@/lib/utils";

function DayDot({ progress }: { progress: DayProgress | undefined }) {
  if (!progress || progress.total === 0) {
    return <span className="block size-1.5" aria-hidden="true" />;
  }

  const complete = progress.done === progress.total;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block size-1.5 rounded-full",
        complete
          ? "bg-success"
          : progress.done > 0
            ? "bg-primary"
            : "bg-muted-foreground/40",
      )}
    />
  );
}

export function WeekStrip({
  dates,
  selected,
  today,
  progressByDate,
  onSelect,
}: {
  dates: IsoDate[];
  selected: IsoDate;
  today: IsoDate;
  progressByDate: Map<IsoDate, DayProgress>;
  onSelect: (date: IsoDate) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="בחירת יום בשבוע"
      className="flex gap-1"
    >
      {dates.map((date) => {
        const isSelected = date === selected;
        const isToday = date === today;
        const weekday = dayOfWeek(date);

        return (
          <button
            key={date}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={`${HEBREW_WEEKDAYS_LONG[weekday]}${isToday ? ", היום" : ""}`}
            onClick={() => onSelect(date)}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl border text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-transparent bg-card hover:bg-accent",
            )}
          >
            <span
              className={cn(
                !isSelected && "text-muted-foreground",
                isToday && !isSelected && "font-semibold text-primary",
              )}
            >
              {HEBREW_WEEKDAYS_SHORT[weekday]}
            </span>
            <span className="numeric text-[13px] font-medium">
              {Number(date.slice(8, 10))}
            </span>
            <DayDot progress={progressByDate.get(date)} />
          </button>
        );
      })}
    </div>
  );
}
