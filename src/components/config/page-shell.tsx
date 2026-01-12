import { cn } from '@/lib/utils';

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard page shell for configuration pages
 * Provides consistent title, subtitle, and action areas
 */
export function PageShell({
  title,
  subtitle,
  children,
  actions,
  className,
}: PageShellProps) {
  return (
    <div className={cn('flex flex-col gap-10', className)}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
