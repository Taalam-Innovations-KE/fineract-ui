"use client";

import { Button } from "@/components/ui/button";

type ViewType = "timeline" | "table";

interface AuditViewToggleProps {
	view: ViewType;
	onViewChange: (view: ViewType) => void;
	className?: string;
}

export function AuditViewToggle({
	view,
	onViewChange,
	className,
}: AuditViewToggleProps) {
	return (
		<div className={`inline-flex rounded-md border ${className}`}>
			<Button
				variant={view === "timeline" ? "default" : "ghost"}
				size="sm"
				onClick={() => onViewChange("timeline")}
				className="rounded-r-none"
			>
				Timeline
			</Button>
			<Button
				variant={view === "table" ? "default" : "ghost"}
				size="sm"
				onClick={() => onViewChange("table")}
				className="rounded-l-none border-l"
			>
				Table
			</Button>
		</div>
	);
}
