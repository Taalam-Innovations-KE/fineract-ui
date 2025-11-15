"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative inline-flex items-center rounded-full bg-muted px-1 py-1 text-xs font-medium shadow-sm">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-1 w-1/2 rounded-full bg-background shadow-sm transition-transform",
          isDark ? "translate-x-full" : "translate-x-0"
        )}
      />
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "relative z-10 flex items-center gap-1 px-3 py-1",
          !isDark ? "text-foreground" : "text-muted-foreground"
        )}
        aria-pressed={!isDark}
        aria-label="Use light theme"
      >
        <Sun className="size-4" />
        <span>Light</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "relative z-10 flex items-center gap-1 px-3 py-1",
          isDark ? "text-foreground" : "text-muted-foreground"
        )}
        aria-pressed={isDark}
        aria-label="Use dark theme"
      >
        <Moon className="size-4" />
        <span>Dark</span>
      </button>
    </div>
  );
}
