"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import type { Template } from "@/lib/templates";
import { HEBREW_WEEKDAYS_SHORT, normalizeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

function OtherDays({ template }: { template: Template }) {
  if (template.days_of_week.length < 2) return null;

  return (
    <span className="text-[11px] text-muted-foreground">
      {template.days_of_week
        .map((day) => HEBREW_WEEKDAYS_SHORT[day])
        .join(" · ")}
    </span>
  );
}

function TemplateRow({
  template,
  onEdit,
  handle,
  dragging,
}: {
  template: Template;
  onEdit: (template: Template) => void;
  handle?: React.ReactNode;
  dragging?: boolean;
}) {
  const time = normalizeTime(template.scheduled_time);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-card p-2 shadow-xs",
        dragging && "shadow-lg ring-2 ring-primary/40",
      )}
    >
      {handle}

      <button
        type="button"
        onClick={() => onEdit(template)}
        className="flex min-h-11 flex-1 items-center gap-3 rounded-lg px-1 text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {template.icon ? (
          <span aria-hidden="true" className="text-lg">
            {template.icon}
          </span>
        ) : null}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px]">{template.title}</span>
          <OtherDays template={template} />
        </span>

        <span className="numeric shrink-0 text-sm text-muted-foreground">
          {time ?? ""}
        </span>
      </button>
    </div>
  );
}

function SortableTemplateRow({
  template,
  onEdit,
}: {
  template: Template;
  onEdit: (template: Template) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "z-10")}
    >
      <TemplateRow
        template={template}
        onEdit={onEdit}
        dragging={isDragging}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`שינוי הסדר של ${template.title}`}
            className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        }
      />
    </li>
  );
}

export function TemplateList({
  timed,
  untimed,
  onEdit,
  onReorder,
}: {
  timed: Template[];
  untimed: Template[];
  onEdit: (template: Template) => void;
  onReorder: (ordered: Template[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = untimed.findIndex((template) => template.id === active.id);
    const to = untimed.findIndex((template) => template.id === over.id);
    if (from === -1 || to === -1) return;

    onReorder(arrayMove(untimed, from, to));
  }

  return (
    <div className="space-y-5">
      {timed.length > 0 ? (
        <section aria-labelledby="timed-heading">
          <h2
            id="timed-heading"
            className="mb-2 text-xs font-semibold text-muted-foreground"
          >
            לפי שעה
          </h2>
          <ul className="space-y-2">
            {timed.map((template) => (
              <li key={template.id}>
                {/* Timed rows sort by clock time, so there is nothing to drag. */}
                <TemplateRow
                  template={template}
                  onEdit={onEdit}
                  handle={<span className="w-2" aria-hidden="true" />}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {untimed.length > 0 ? (
        <section aria-labelledby="untimed-heading">
          <h2
            id="untimed-heading"
            className="mb-2 text-xs font-semibold text-muted-foreground"
          >
            ללא שעה · אפשר לגרור כדי לשנות סדר
          </h2>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={untimed.map((template) => template.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {untimed.map((template) => (
                  <SortableTemplateRow
                    key={template.id}
                    template={template}
                    onEdit={onEdit}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </section>
      ) : null}
    </div>
  );
}
