"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { HEBREW_WEEKDAYS_LONG, HEBREW_WEEKDAYS_SHORT } from "@/lib/time";
import { cn } from "@/lib/utils";

function CopyDayForm({
  from,
  taskCount,
  onClose,
  onConfirm,
  saving,
}: {
  from: number;
  taskCount: number;
  onClose: () => void;
  onConfirm: (targets: number[]) => void;
  saving: boolean;
}) {
  const [targets, setTargets] = useState<number[]>([]);

  function toggle(dayOfWeek: number) {
    setTargets((current) =>
      current.includes(dayOfWeek)
        ? current.filter((day) => day !== dayOfWeek)
        : [...current, dayOfWeek],
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <DrawerHeader className="text-start">
        <DrawerTitle>
          העתקת {HEBREW_WEEKDAYS_LONG[from]} לימים אחרים
        </DrawerTitle>
        <DrawerDescription>
          {taskCount} משימות יתווספו לימים שתבחר. משימות שכבר קיימות בהם לא
          ישוכפלו.
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex gap-1.5 px-4">
        {HEBREW_WEEKDAYS_SHORT.map((label, dayOfWeek) => {
          const disabled = dayOfWeek === from;
          const active = targets.includes(dayOfWeek);

          return (
            <button
              key={dayOfWeek}
              type="button"
              disabled={disabled}
              onClick={() => toggle(dayOfWeek)}
              aria-pressed={active}
              aria-label={HEBREW_WEEKDAYS_LONG[dayOfWeek]}
              className={cn(
                "min-h-11 flex-1 rounded-lg border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                disabled && "cursor-not-allowed opacity-35",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:bg-accent",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <DrawerFooter>
        <Button
          size="lg"
          disabled={targets.length === 0 || saving || taskCount === 0}
          onClick={() => onConfirm(targets)}
        >
          העתק
        </Button>
        <Button variant="ghost" onClick={onClose}>
          ביטול
        </Button>
      </DrawerFooter>
    </div>
  );
}

export function CopyDayDialog({
  open,
  from,
  taskCount,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean;
  from: number;
  taskCount: number;
  onClose: () => void;
  onConfirm: (targets: number[]) => void;
  saving: boolean;
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent>
        {open ? (
          // Remounting per source day clears the previous selection.
          <CopyDayForm
            key={from}
            from={from}
            taskCount={taskCount}
            onClose={onClose}
            onConfirm={onConfirm}
            saving={saving}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
