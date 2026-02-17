"use client";

import { Button } from "@/components/ui/button";

interface AuditViewToggleOption<T extends string> {
	value: T;
	label: string;
}

interface AuditViewToggleProps<T extends string> {
	view: T;
	onViewChange: (view: T) => void;
	options: readonly [AuditViewToggleOption<T>, AuditViewToggleOption<T>];
	className?: string;
}

export function AuditViewToggle<T extends string>({
	view,
	onViewChange,
	options,
	className,
}: AuditViewToggleProps<T>) {
	const [firstOption, secondOption] = options;

	return (
		<div className={`inline-flex rounded-md border ${className}`}>
			<Button
				variant={view === firstOption.value ? "default" : "ghost"}
				size="sm"
				onClick={() => onViewChange(firstOption.value)}
				className="rounded-r-none"
			>
				{firstOption.label}
			</Button>
			<Button
				variant={view === secondOption.value ? "default" : "ghost"}
				size="sm"
				onClick={() => onViewChange(secondOption.value)}
				className="rounded-l-none border-l"
			>
				{secondOption.label}
			</Button>
		</div>
	);
}
