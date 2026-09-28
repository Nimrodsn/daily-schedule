"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { quickAddSchema, type TaskInput } from "@/lib/validators";

export function QuickAdd({
  onAdd,
  pending,
}: {
  onAdd: (input: TaskInput) => void;
  pending: boolean;
}) {
  const [text, setText] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = quickAddSchema.safeParse({ text });
    if (!parsed.success) return;

    onAdd({
      title: parsed.data.text,
      notes: null,
      scheduled_time: null,
      icon: null,
    });
    setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="הוספת משימה ליום הזה"
        aria-label="הוספת משימה ליום הזה"
        maxLength={300}
        autoComplete="off"
        enterKeyHint="done"
        className="min-h-11"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="הוסף משימה"
        disabled={pending || text.trim() === ""}
        className="size-11 shrink-0"
      >
        <Plus aria-hidden="true" />
      </Button>
    </form>
  );
}
