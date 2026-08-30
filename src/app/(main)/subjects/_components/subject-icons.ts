import { BookOpen, Landmark, Leaf, type LucideIcon, Sigma } from "lucide-react";

import type { Subject } from "@/features/pokeden/domain";

const subjectIcons: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  landmark: Landmark,
  leaf: Leaf,
  sigma: Sigma,
};

export function getSubjectIcon(icon: string): LucideIcon {
  return subjectIcons[icon] ?? BookOpen;
}

export interface SubjectViewModel {
  subject: Subject;
  progressPct: number;
  taskCount: number;
  noteCount: number;
  scheduleCount: number;
  materialCount: number;
  updatedLabel: string;
  ownerName: string;
  ownerInitials: string;
}
