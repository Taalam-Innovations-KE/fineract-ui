import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
	extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
	({ className, children, ...props }, ref) => {
		return (
			<div className="relative">
				<select
					className={cn(
						"flex h-10 w-full appearance-none rounded-lg border border-input bg-background/70 px-3.5 py-2 text-sm text-foreground shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
						className,
					)}
					ref={ref}
					{...props}
				>
					{children}
				</select>
				<ChevronDown className="pointer-events-none absolute right-3.5 top-3 h-4 w-4 opacity-50" />
			</div>
		);
	},
);
Select.displayName = "Select";

export { Select };
