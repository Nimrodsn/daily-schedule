"use client";

import { Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { DailyTask } from "@/lib/day";
import {
  formatHebrewDateShort,
  normalizeTime,
  type IsoDate,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import { taskInputSchema, type EditScope, type TaskInput } from "@/lib/validators";

const ICON_CHOICES = [
  "☕",
  "🏃",
  "💊",
  "📞",
  "💻",
  "🛒",
  "🧺",
  "📚",
  "🧘",
  "🍽️",
  "🚗",
  "💰",
];

/**
 * A task that came from the weekly template can be changed for this one day or
 * for every day from here on. A one-off has only itself, so the choice is
 * hidden and "today" is implied.
 */
function ScopeChoice({
  scope,
  onChange,
}: {
  scope: EditScope;
  onChange: (scope: EditScope) => void;
}) {
  const options: { value: EditScope; label: string; hint: string }[] = [
    { value: "today", label: "רק היום", hint: "התבנית לא משתנה" },
    { value: "onward", label: "מהיום והלאה", hint: "מעדכן גם את התבנית" },
  ];

  return (
    <fieldset>
      <legend className="mb-2 text-sm leading-none font-medium">
        על מה החל השינוי
      </legend>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => {
          const active = scope === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={cn(
                "min-h-14 rounded-lg border px-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:bg-accent",
              )}
            >
              <span className="block font-medium">{option.label}</span>
              <span
                className={cn(
                  "block text-[11px]",
                  active ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function TaskForm({
  task,
  date,
  onSave,
  onDelete,
  saving,
}: {
  task: DailyTask;
  date: IsoDate;
  onSave: (input: TaskInput, scope: EditScope) => void;
  onDelete: (scope: EditScope) => void;
  saving: boolean;
}) {
  const existingTime = normalizeTime(task.scheduled_time);
  const fromTemplate = task.template_id !== null;

  // Initialised straight from props; the parent remounts on a different task.
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [hasTime, setHasTime] = useState(existingTime !== null);
  const [time, setTime] = useState(existingTime ?? "08:00");
  const [icon, setIcon] = useState<string | null>(task.icon);
  const [scope, setScope] = useState<EditScope>("today");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = taskInputSchema.safeParse({
      title,
      notes: notes.trim() === "" ? null : notes,
      scheduled_time: hasTime ? time : null,
      icon,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setError(null);
    onSave(parsed.data, fromTemplate ? scope : "today");
  }

  return (
    <div className="mx-auto w-full max-w-lg overflow-y-auto">
      <DrawerHeader className="text-start">
        <DrawerTitle>עריכת משימה</DrawerTitle>
        <DrawerDescription>
          {fromTemplate
            ? `משימה קבועה, ${formatHebrewDateShort(date)}`
            : `משימה חד-פעמית, ${formatHebrewDateShort(date)}`}
        </DrawerDescription>
      </DrawerHeader>

      <form onSubmit={handleSubmit} className="space-y-5 px-4 pb-2">
        <div className="space-y-2">
          <Label htmlFor="task-title">כותרת</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            autoComplete="off"
            required
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="task-has-time">שעה</Label>
            <Switch
              id="task-has-time"
              checked={hasTime}
              onCheckedChange={setHasTime}
            />
          </div>
          {hasTime ? (
            <Input
              id="task-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              dir="ltr"
              className="w-36"
              aria-label="שעה"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              בלי שעה המשימה תופיע בסוף היום.
            </p>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm leading-none font-medium">
            אייקון (אופציונלי)
          </legend>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setIcon(null)}
              aria-pressed={icon === null}
              className={cn(
                "min-h-11 min-w-11 rounded-lg border text-xs",
                icon === null
                  ? "border-primary bg-accent"
                  : "border-input hover:bg-accent",
              )}
            >
              ללא
            </button>
            {ICON_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => setIcon(choice)}
                aria-pressed={icon === choice}
                aria-label={`אייקון ${choice}`}
                className={cn(
                  "min-h-11 min-w-11 rounded-lg border text-lg",
                  icon === choice
                    ? "border-primary bg-accent"
                    : "border-input hover:bg-accent",
                )}
              >
                {choice}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="task-notes">הערות</Label>
          <Textarea
            id="task-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            maxLength={2000}
          />
        </div>

        {fromTemplate ? <ScopeChoice scope={scope} onChange={setScope} /> : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DrawerFooter className="gap-2 px-0">
          <Button type="submit" size="lg" disabled={saving}>
            שמור
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(fromTemplate ? scope : "today")}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {fromTemplate && scope === "onward"
              ? "מחק מהיום והלאה"
              : "מחק מהיום הזה"}
          </Button>
        </DrawerFooter>
      </form>
    </div>
  );
}

export function TaskEditor({
  task,
  date,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  task: DailyTask | null;
  date: IsoDate;
  onClose: () => void;
  onSave: (input: TaskInput, scope: EditScope) => void;
  onDelete: (scope: EditScope) => void;
  saving: boolean;
}) {
  return (
    <Drawer
      open={task !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent className="max-h-[92dvh]">
        {task ? (
          <TaskForm
            key={task.id}
            task={task}
            date={date}
            onSave={onSave}
            onDelete={onDelete}
            saving={saving}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
