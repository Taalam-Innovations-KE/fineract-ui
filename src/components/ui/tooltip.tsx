import * as React from "react";
import { cn } from "@/lib/utils";

const Tooltip = React.forwardRef<
	HTMLSpanElement,
	React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
	<span
		ref={ref}
		className={cn("relative inline-flex items-center group", className)}
		{...props}
	/>
));
Tooltip.displayName = "Tooltip";

const TooltipTrigger = React.forwardRef<
	HTMLSpanElement,
	React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
	<span
		ref={ref}
		className={cn("inline-flex items-center", className)}
		{...props}
	/>
));
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
	HTMLSpanElement,
	React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
	<span
		ref={ref}
		className={cn(
			"pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100",
			className,
		)}
		{...props}
	/>
));
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent };
