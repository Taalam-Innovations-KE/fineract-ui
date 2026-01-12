'use client';

import { ThemeToggle } from '@/components/ui/theme-toggle';

export function TopBar() {
  return (
    <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-12 py-5">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Configuration
          </span>
          <span className="h-1 w-1 rounded-full bg-primary/60" />
          <span className="text-[15px] font-semibold text-foreground">
            Admin Console
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
