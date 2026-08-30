"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

const THEME_CYCLE = ["light", "dark", "system"] as const;

export function ThemeToggle() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const setThemeMode = usePreferencesStore((state) => state.setThemeMode);

  const cycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(themeMode);
    const nextTheme = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length];

    setThemeMode(nextTheme);
    void persistPreference("theme_mode", nextTheme);
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={cycleTheme}
      aria-label={`Current theme: ${themeMode}. Change theme`}
    >
      <Monitor aria-hidden="true" className="hidden [html[data-theme-mode=system]_&]:block" />
      <Sun aria-hidden="true" className="hidden dark:block [html[data-theme-mode=system]_&]:hidden" />
      <Moon aria-hidden="true" className="block dark:hidden [html[data-theme-mode=system]_&]:hidden" />
    </Button>
  );
}
