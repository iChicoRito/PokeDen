import {
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  type LucideIcon,
  PawPrint,
  Settings,
} from "lucide-react";

export interface PokeDenNavigationItem {
  readonly title: string;
  readonly href: `/${string}`;
  readonly icon: LucideIcon;
}

export interface PokeDenNavigationGroup {
  readonly label: string;
  readonly items: readonly PokeDenNavigationItem[];
}

export const POKEDEN_NAVIGATION: readonly PokeDenNavigationGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Subjects", href: "/subjects", icon: BookOpen },
      { title: "Tasks", href: "/tasks", icon: ListTodo },
      { title: "Study planner", href: "/study-planner", icon: CalendarDays },
      { title: "Companions", href: "/companions", icon: PawPrint },
    ],
  },
  {
    label: "Study tools",
    items: [
      { title: "Notes", href: "/notes", icon: FileText },
      { title: "Pomodoro", href: "/pomodoro", icon: Clock3 },
      { title: "Exams", href: "/exams", icon: GraduationCap },
      { title: "Progress", href: "/progress", icon: ChartNoAxesCombined },
      { title: "Calendar", href: "/calendar", icon: ClipboardCheck },
    ],
  },
  {
    label: "Account",
    items: [{ title: "Settings", href: "/settings", icon: Settings }],
  },
] as const;

export const POKEDEN_NAVIGATION_ITEMS = POKEDEN_NAVIGATION.flatMap((group) => group.items);
