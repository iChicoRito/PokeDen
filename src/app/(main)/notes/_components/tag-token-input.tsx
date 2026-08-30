"use client";

import { type KeyboardEvent, useRef, useState } from "react";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const MAX_TAG_LENGTH = 24;

export function TagTokenInput({
  tags,
  onChange,
  id,
  ariaLabel,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  id?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commitDraft = () => {
    const next = draft.trim().replace(/^#+/, "").trim().slice(0, MAX_TAG_LENGTH);
    if (next.length > 0 && !tags.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      onChange([...tags, next]);
    }
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Backspace" && draft.length === 0 && tags.length > 0) {
      event.preventDefault();
      onChange(tags.slice(0, -1));
      return;
    }
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    }
  };

  return (
    <div
      className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1.5"
      onPointerDown={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag.replace(/^#+/, "")}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
            onClick={() => onChange(tags.filter((item) => item !== tag))}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={draft}
        placeholder="Add a tag…"
        aria-label={ariaLabel}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
