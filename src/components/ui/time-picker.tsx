"use client";

import * as React from "react";

import { ClockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type TimePickerProps = {
  id?: string;
  onChange: (value: string) => void;
  value: string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const TIME_OPTIONS: Array<string> = Array.from({ length: 24 * 4 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

function parseTimeValue(value: string): string | undefined {
  return TIME_PATTERN.test(value) ? value : undefined;
}

function formatTimeDisplay(value: string): string {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function TimePicker({ id, onChange, value }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const selected = parseTimeValue(value);

  React.useEffect(() => {
    if (open) {
      listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    }
  }, [open ]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          data-empty={!selected}
          aria-required="true"
          className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
        >
          {selected ? formatTimeDisplay(selected) : <span>Pick a time</span>}
          <ClockIcon aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-1" align="start">
        <div ref={listRef} role="listbox" aria-label="Time" className="max-h-60 overflow-y-auto p-1">
          {TIME_OPTIONS.map((option) => {
            const isSelected = option === selected;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm outline-none",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted focus-visible:bg-muted",
                )}
              >
                {formatTimeDisplay(option)}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
