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
import type { Template } from "@/lib/templates";
import {
  HEBREW_WEEKDAYS_LONG,
  HEBREW_WEEKDAYS_SHORT,
  normalizeTime,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import { templateInputSchema, type TemplateInput } from "@/lib/validators";

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

export type TemplateEditorTarget =
  { mode: "create"; dayOfWeek: number } | { mode: "edit"; template: Template };

/** Stable identity for the target, used as a remount key. */
function targetKey(target: TemplateEditorTarget): string {
  return target.mode === "edit"
    ? `edit-${target.template.id}`
    : `create-${target.dayOfWeek}`;
}

function TemplateForm({
  target,
  onSave,
  onDelete,
  saving,
}: {
  target: TemplateEditorTarget;
  onSave: (input: TemplateInput) => void;
  onDelete: (template: Template) => void;
  saving: boolean;
}) {
  const existing = target.mode === "edit" ? target.template : null;
  const existingTime = normalizeTime(existing?.scheduled_time);

  // Initialised straight from props. The parent remounts this form with a new
  // key when a different task is opened, so no effect is needed to resync.
  const [title, setTitle] = useState(existing?.title ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [hasTime, setHasTime] = useState(existingTime !== null);
  const [time, setTime] = useState(existingTime ?? "08:00");
  const [days, setDays] = useState<number[]>(() =>
    target.mode === "edit"
      ? [...target.template.days_of_week]
      : [target.dayOfWeek],
  );
  const [icon, setIcon] = useState<string | null>(existing?.icon ?? null);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(dayOfWeek: number) {
    setDays((current) =>
      current.includes(dayOfWeek)
        ? current.filter((day) => day !== dayOfWeek)
        : [...current, dayOfWeek],
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = templateInputSchema.safeParse({
      title,
      notes: notes.trim() === "" ? null : notes,
      scheduled_time: hasTime ? time : null,
      days_of_week: days,
      icon,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setError(null);
    onSave(parsed.data);
  }

  return (
    <div className="mx-auto w-full max-w-lg overflow-y-auto">
      <DrawerHeader className="text-start">
        <DrawerTitle>
          {existing ? "עריכת משימה קבועה" : "משימה קבועה חדשה"}
        </DrawerTitle>
        <DrawerDescription>
          המשימה תופיע אוטומטית בכל יום שתבחר.
        </DrawerDescription>
      </DrawerHeader>

      <form onSubmit={handleSubmit} className="space-y-5 px-4 pb-2">
        <div className="space-y-2">
          <Label htmlFor="template-title">כותרת</Label>
          <Input
            id="template-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="למשל: לקחת ויטמין"
            maxLength={200}
            autoComplete="off"
            required
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm leading-none font-medium">
            ימים בשבוע
          </legend>
          <div className="flex gap-1.5">
            {HEBREW_WEEKDAYS_SHORT.map((label, dayOfWeek) => {
              const active = days.includes(dayOfWeek);
              return (
                <button
                  key={dayOfWeek}
                  type="button"
                  onClick={() => toggleDay(dayOfWeek)}
                  aria-pressed={active}
                  aria-label={HEBREW_WEEKDAYS_LONG[dayOfWeek]}
                  className={cn(
                    "min-h-11 flex-1 rounded-lg border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
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
        </fieldset>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="template-has-time">שעה קבועה</Label>
            <Switch
              id="template-has-time"
              checked={hasTime}
              onCheckedChange={setHasTime}
            />
          </div>
          {hasTime ? (
            <Input
              id="template-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              dir="ltr"
              className="w-36"
              aria-label="שעה"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              בלי שעה המשימה תופיע בסוף היום, בסדר שתקבע בגרירה.
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
          <Label htmlFor="template-notes">הערות</Label>
          <Textarea
            id="template-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            maxLength={2000}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DrawerFooter className="gap-2 px-0">
          <Button type="submit" size="lg" disabled={saving}>
            שמור
          </Button>
          {existing ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(existing)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              מחק מהתבנית
            </Button>
          ) : null}
        </DrawerFooter>
      </form>
    </div>
  );
}

export function TemplateEditor({
  target,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  target: TemplateEditorTarget | null;
  onClose: () => void;
  onSave: (input: TemplateInput) => void;
  onDelete: (template: Template) => void;
  saving: boolean;
}) {
  return (
    <Drawer
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent className="max-h-[92dvh]">
        {target ? (
          <TemplateForm
            key={targetKey(target)}
            target={target}
            onSave={onSave}
            onDelete={onDelete}
            saving={saving}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
