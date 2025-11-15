"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isActive = (value: "light" | "dark" | "system") => theme === value;

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-muted px-1 py-1 shadow-sm">
      <Button
        type="button"
        size="icon-sm"
        variant={isActive("light") ? "default" : "ghost"}
        onClick={() => setTheme("light")}
        aria-label="Use light theme"
      >
        <Sun className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={isActive("dark") ? "default" : "ghost"}
        onClick={() => setTheme("dark")}
        aria-label="Use dark theme"
      >
        <Moon className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={isActive("system") ? "default" : "ghost"}
        onClick={() => setTheme("system")}
        aria-label="Use system theme"
      >
        <Monitor className="size-4" />
      </Button>
    </div>
  );
}
