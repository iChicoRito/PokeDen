"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Subject } from "@/features/pokeden/domain";
import { cn } from "@/lib/utils";

import { SubjectActions } from "./subject-actions";
import { getSubjectIcon, type SubjectViewModel } from "./subject-icons";

interface SubjectGridViewProps {
  items: SubjectViewModel[];
  onEdit: (subject: Subject) => void;
  onArchive: (subject: Subject) => void;
  onOpen: (subject: Subject) => void;
}

export function SubjectGridView({ items, onEdit, onArchive, onOpen }: SubjectGridViewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const { subject } = item;
        const SubjectIcon = getSubjectIcon(subject.icon);

        return (
          <Card
            key={subject.id}
            size="sm"
            role="button"
            tabIndex={0}
            aria-label={`Open ${subject.name}`}
            className={cn(
              "group/subject cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring",
              subject.archivedAt !== null && "opacity-75",
            )}
            onClick={() => onOpen(subject)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(subject);
              }
            }}
          >
            <CardContent>
              <div className="relative flex h-36 items-center justify-center rounded-lg bg-muted/50">
                <SubjectIcon className="size-12" style={{ color: subject.color }} aria-hidden="true" />
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 text-muted-foreground text-xs">
                  <span className="flex items-center gap-2">
                    <span>{item.progressPct}% complete</span>
                    {subject.archivedAt !== null && <Badge variant="secondary">Archived</Badge>}
                  </span>
                  <span>
                    {item.taskCount} {item.taskCount === 1 ? "task" : "tasks"}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardHeader>
              <CardTitle className="truncate">
                <span className="group-hover/subject:underline">{subject.name}</span>
              </CardTitle>
              <CardDescription className="truncate">
                Updated {item.updatedLabel} by {item.ownerName}
              </CardDescription>
              <CardAction>
                <SubjectActions vm={item} onEdit={onEdit} onArchive={onArchive} onOpen={onOpen} />
              </CardAction>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
