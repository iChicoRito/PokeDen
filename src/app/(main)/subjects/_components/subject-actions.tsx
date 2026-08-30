import { Archive, BookOpen, MoreVertical, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Subject } from "@/features/pokeden/domain";

import type { SubjectViewModel } from "./subject-icons";

interface SubjectActionsProps {
  vm: SubjectViewModel;
  onEdit: (subject: Subject) => void;
  onArchive: (subject: Subject) => void;
  onOpen: (subject: Subject) => void;
}

export function SubjectActions({ vm, onEdit, onArchive, onOpen }: SubjectActionsProps) {
  const { subject } = vm;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        onClick={(event) => {
          // Keep the card's open-subject click handler from firing.
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") event.stopPropagation();
        }}
      >
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${subject.name}`}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onOpen(subject)}>
            <BookOpen />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit(subject)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {subject.archivedAt === null && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onSelect={() => onArchive(subject)}>
                <Archive />
                Archive
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
