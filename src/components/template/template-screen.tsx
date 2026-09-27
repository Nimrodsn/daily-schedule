"use client";

import { CopyPlus, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCopyDay,
  useCreateTemplate,
  useDeactivateTemplate,
  useReorderTemplates,
  useTemplates,
  useUpdateTemplate,
} from "@/hooks/use-templates";
import { isTimed, templatesForDay, type Template } from "@/lib/templates";
import {
  DEFAULT_TIMEZONE,
  HEBREW_WEEKDAYS_LONG,
  dayOfWeek as dowOf,
  todayIso,
} from "@/lib/time";
import type { TemplateInput } from "@/lib/validators";

import { CopyDayDialog } from "./copy-day-dialog";
import { DayTabs } from "./day-tabs";
import { TemplateEditor, type TemplateEditorTarget } from "./template-editor";
import { TemplateList } from "./template-list";

export function TemplateScreen() {
  const today = dowOf(todayIso(DEFAULT_TIMEZONE));
  const [selectedDay, setSelectedDay] = useState(today);
  const [editorTarget, setEditorTarget] = useState<TemplateEditorTarget | null>(
    null,
  );
  const [copyOpen, setCopyOpen] = useState(false);

  const { data: templates, isPending, isError, refetch } = useTemplates();

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deactivateTemplate = useDeactivateTemplate();
  const reorderTemplates = useReorderTemplates();
  const copyDay = useCopyDay();

  const counts = useMemo(() => {
    const all = templates ?? [];
    return Array.from(
      { length: 7 },
      (_, day) => all.filter((t) => t.days_of_week.includes(day)).length,
    );
  }, [templates]);

  const dayTemplates = useMemo(
    () => templatesForDay(templates ?? [], selectedDay),
    [templates, selectedDay],
  );

  const timed = dayTemplates.filter(isTimed);
  const untimed = dayTemplates.filter((template) => !isTimed(template));

  function handleSave(input: TemplateInput) {
    if (!editorTarget) return;

    if (editorTarget.mode === "create") {
      createTemplate.mutate(input, { onSuccess: () => setEditorTarget(null) });
    } else {
      updateTemplate.mutate(
        { id: editorTarget.template.id, input },
        { onSuccess: () => setEditorTarget(null) },
      );
    }
  }

  function handleDelete(template: Template) {
    deactivateTemplate.mutate(template, {
      onSuccess: () => setEditorTarget(null),
    });
  }

  function handleReorder(ordered: Template[]) {
    reorderTemplates.mutate(
      ordered.map((template, index) => ({
        id: template.id,
        sort_order: index,
      })),
    );
  }

  return (
    <>
      <PageHeading
        title="התבנית השבועית"
        subtitle="המשימות הקבועות שחוזרות בכל שבוע"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCopyOpen(true)}
            disabled={dayTemplates.length === 0}
          >
            <CopyPlus className="size-4" aria-hidden="true" />
            העתק יום
          </Button>
        }
      />

      <DayTabs
        value={selectedDay}
        onChange={setSelectedDay}
        counts={counts}
        today={today}
      />

      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-dashed border-destructive/40 p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            טעינת התבנית נכשלה.
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            נסה שוב
          </Button>
        </div>
      ) : dayTemplates.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          אין עדיין משימות קבועות ל{HEBREW_WEEKDAYS_LONG[selectedDay]}.
        </div>
      ) : (
        <TemplateList
          timed={timed}
          untimed={untimed}
          onEdit={(template) => setEditorTarget({ mode: "edit", template })}
          onReorder={handleReorder}
        />
      )}

      <Button
        size="lg"
        className="mt-5 w-full"
        onClick={() =>
          setEditorTarget({ mode: "create", dayOfWeek: selectedDay })
        }
      >
        <Plus className="size-4" aria-hidden="true" />
        הוסף משימה קבועה
      </Button>

      <TemplateEditor
        target={editorTarget}
        onClose={() => setEditorTarget(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={createTemplate.isPending || updateTemplate.isPending}
      />

      <CopyDayDialog
        open={copyOpen}
        from={selectedDay}
        taskCount={dayTemplates.length}
        saving={copyDay.isPending}
        onClose={() => setCopyOpen(false)}
        onConfirm={(targets) =>
          copyDay.mutate(
            {
              templates: templates ?? [],
              input: { from: selectedDay, to: targets },
            },
            { onSuccess: () => setCopyOpen(false) },
          )
        }
      />
    </>
  );
}
