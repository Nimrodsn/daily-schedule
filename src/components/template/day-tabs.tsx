"use client";

import { cn } from "@/lib/utils";
import { HEBREW_WEEKDAYS_LONG, HEBREW_WEEKDAYS_SHORT } from "@/lib/time";

export function DayTabs({
  value,
  onChange,
  counts,
  today,
}: {
  value: number;
  onChange: (dayOfWeek: number) => void;
  counts: number[];
  today: number | null;
}) {
  return (
    <div
      role="tablist"
      aria-label="ימי השבוע"
      className="mb-4 flex gap-0.5 rounded-xl bg-muted/60 p-1"
    >
      {HEBREW_WEEKDAYS_SHORT.map((label, dayOfWeek) => {
        const selected = dayOfWeek === value;

        return (
          <button
            key={dayOfWeek}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={`${HEBREW_WEEKDAYS_LONG[dayOfWeek]} · ${counts[dayOfWeek]} משימות`}
            onClick={() => onChange(dayOfWeek)}
            className={cn(
              "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              selected
                ? "bg-background font-semibold text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{label}</span>
            <span
              className={cn(
                "numeric text-[10px] leading-none",
                counts[dayOfWeek] === 0 && "opacity-40",
              )}
            >
              {counts[dayOfWeek]}
            </span>
            {dayOfWeek === today ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-primary"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
