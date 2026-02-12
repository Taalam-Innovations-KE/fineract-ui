"use client";

import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Copy,
	DollarSign,
	Info,
	Pencil,
	Plus,
	Undo2,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	type AuditEvent,
	formatAuditTimestamp,
} from "@/lib/fineract/audit-utils";
import { cn } from "@/lib/utils";

interface LoanAuditTimelineProps {
	events: AuditEvent[];
	className?: string;
}

type GroupedAuditEvents = {
	dateKey: string;
	dateLabel: string;
	events: AuditEvent[];
};

function getStatusBadgeVariant(
	status: AuditEvent["status"],
): "default" | "warning" | "destructive" | "info" {
	switch (status) {
		case "success":
			return "default";
		case "warning":
			return "warning";
		case "error":
			return "destructive";
		default:
			return "info";
	}
}

function getStatusAccentClasses(status: AuditEvent["status"]): string {
	switch (status) {
		case "success":
			return "border-l-success bg-success/5";
		case "warning":
			return "border-l-warning bg-warning/5";
		case "error":
			return "border-l-destructive bg-destructive/5";
		default:
			return "border-l-info bg-info/5";
	}
}

function getStatusNodeClasses(status: AuditEvent["status"]): string {
	switch (status) {
		case "success":
			return "border-success/40 bg-success/10 text-success";
		case "warning":
			return "border-warning/40 bg-warning/10 text-warning";
		case "error":
			return "border-destructive/40 bg-destructive/10 text-destructive";
		default:
			return "border-info/40 bg-info/10 text-info";
	}
}

function getEventIcon(event: AuditEvent) {
	switch (event.icon) {
		case "CheckCircle":
			return CheckCircle2;
		case "AlertTriangle":
			return AlertTriangle;
		case "X":
			return XCircle;
		case "DollarSign":
			return DollarSign;
		case "Undo":
			return Undo2;
		case "Plus":
			return Plus;
		case "Edit":
			return Pencil;
		default:
			if (event.status === "success") return CheckCircle2;
			if (event.status === "warning") return AlertTriangle;
			if (event.status === "error") return XCircle;
			return Info;
	}
}

function toDayKey(timestamp: string): string {
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return "unknown";
	return date.toISOString().split("T")[0];
}

function toDayLabel(dayKey: string): string {
	if (dayKey === "unknown") return "Unknown date";
	const date = new Date(`${dayKey}T00:00:00`);
	if (Number.isNaN(date.getTime())) return "Unknown date";
	return date.toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function toDetailValue(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return value
			.map((entry) => toDetailValue(entry))
			.filter(Boolean)
			.join(", ");
	}
	if (typeof value === "object") {
		const record = value as Record<string, unknown>;
		if (typeof record.username === "string") return record.username;
		if (typeof record.displayName === "string") return record.displayName;
	}
	return undefined;
}

function extractChangeItems(
	details: Record<string, unknown> | undefined,
): Array<{ field: string; value: string }> {
	if (
		!details ||
		typeof details.changes !== "object" ||
		details.changes === null
	) {
		return [];
	}

	const changes = details.changes as Record<string, unknown>;
	return Object.entries(changes)
		.slice(0, 8)
		.map(([field, value]) => ({
			field,
			value: toDetailValue(value) ?? "updated",
		}));
}

function buildGroupedEvents(events: AuditEvent[]): GroupedAuditEvents[] {
	const groups = new Map<string, AuditEvent[]>();

	for (const event of events) {
		const dateKey = toDayKey(event.timestamp);
		const dateEvents = groups.get(dateKey);
		if (dateEvents) {
			dateEvents.push(event);
		} else {
			groups.set(dateKey, [event]);
		}
	}

	return Array.from(groups.entries()).map(([dateKey, dateEvents]) => ({
		dateKey,
		dateLabel: toDayLabel(dateKey),
		events: dateEvents,
	}));
}

export function LoanAuditTimeline({
	events,
	className,
}: LoanAuditTimelineProps) {
	const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const groupedEvents = useMemo(() => buildGroupedEvents(events), [events]);

	const toggleExpanded = (eventId: string) => {
		const next = new Set(expandedEvents);
		if (next.has(eventId)) {
			next.delete(eventId);
		} else {
			next.add(eventId);
		}
		setExpandedEvents(next);
	};

	const copyEventPayload = async (
		eventId: string,
		payload: Record<string, unknown> | undefined,
	) => {
		if (!payload || !navigator?.clipboard) return;
		try {
			await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
			setCopiedId(eventId);
			setTimeout(() => setCopiedId(null), 1500);
		} catch {
			// Clipboard permissions can be denied by the browser.
		}
	};

	if (events.length === 0) {
		return (
			<div className="py-8 text-center text-muted-foreground">
				No audit events found.
			</div>
		);
	}

	return (
		<div className={cn("space-y-4", className)}>
			{groupedEvents.map((group) => (
				<div key={group.dateKey} className="space-y-3">
					<div className="sticky top-0 z-10 bg-background/95 py-1 backdrop-blur">
						<Badge variant="outline" className="rounded-sm">
							{group.dateLabel}
						</Badge>
					</div>

					<div className="space-y-3">
						{group.events.map((event, index) => {
							const EventIcon = getEventIcon(event);
							const isExpanded = expandedEvents.has(event.id);
							const changeItems = extractChangeItems(event.details);
							const details = event.details;
							const detailFacts = [
								{ label: "Entity", value: event.entity },
								{
									label: "Resource",
									value: event.resourceId ? `#${event.resourceId}` : undefined,
								},
								{
									label: "Processing",
									value: event.processingResult,
								},
								{
									label: "Maker",
									value: toDetailValue(details?.maker),
								},
								{
									label: "Checker",
									value: toDetailValue(details?.checker),
								},
								{
									label: "Office",
									value: toDetailValue(details?.officeName),
								},
							].filter((fact) => Boolean(fact.value));

							return (
								<div key={event.id} className="grid grid-cols-[auto_1fr] gap-3">
									<div className="flex flex-col items-center">
										<div
											className={cn(
												"flex h-8 w-8 items-center justify-center rounded-full border",
												getStatusNodeClasses(event.status),
											)}
										>
											<EventIcon className="h-4 w-4" />
										</div>
										{index < group.events.length - 1 && (
											<div className="mt-1 h-full w-px bg-border" />
										)}
									</div>

									<Card
										className={cn(
											"border-l-4",
											getStatusAccentClasses(event.status),
										)}
									>
										<CardContent className="space-y-3 pt-4">
											<div className="flex items-start justify-between gap-2">
												<div className="space-y-1">
													<div className="flex flex-wrap items-center gap-2">
														<p className="text-sm font-semibold">
															{event.action}
														</p>
														<Badge
															variant={getStatusBadgeVariant(event.status)}
															className="rounded-sm"
														>
															{event.status}
														</Badge>
														{event.entity && (
															<Badge variant="outline" className="rounded-sm">
																{event.entity}
															</Badge>
														)}
														{event.changeCount && (
															<Badge variant="info" className="rounded-sm">
																{event.changeCount} field
																{event.changeCount === 1 ? "" : "s"} changed
															</Badge>
														)}
													</div>
													<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
														<span>{formatAuditTimestamp(event.timestamp)}</span>
														<span>by {event.user}</span>
														{event.resourceId && (
															<span>resource #{event.resourceId}</span>
														)}
													</div>
												</div>

												<Button
													variant="ghost"
													size="sm"
													className="h-8 px-2"
													onClick={() => toggleExpanded(event.id)}
												>
													{isExpanded ? (
														<ChevronDown className="h-4 w-4" />
													) : (
														<ChevronRight className="h-4 w-4" />
													)}
												</Button>
											</div>

											{isExpanded && (
												<div className="space-y-3 border-t pt-3">
													{detailFacts.length > 0 && (
														<div className="grid gap-2 md:grid-cols-2">
															{detailFacts.map((fact) => (
																<div
																	key={fact.label}
																	className="rounded-sm border bg-background p-2"
																>
																	<p className="text-[11px] uppercase tracking-wide text-muted-foreground">
																		{fact.label}
																	</p>
																	<p className="text-sm font-medium">
																		{fact.value}
																	</p>
																</div>
															))}
														</div>
													)}

													{changeItems.length > 0 && (
														<div className="space-y-2">
															<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
																Changed fields
															</p>
															<div className="flex flex-wrap gap-2">
																{changeItems.map((change) => (
																	<div
																		key={`${event.id}-${change.field}`}
																		className="max-w-full rounded-sm border bg-background px-2 py-1 text-xs"
																	>
																		<span className="font-medium">
																			{change.field}
																		</span>
																		<span className="text-muted-foreground">
																			{" "}
																			→ {change.value}
																		</span>
																	</div>
																))}
															</div>
														</div>
													)}

													{details && (
														<div className="space-y-2">
															<div className="flex items-center justify-between">
																<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
																	Raw payload
																</p>
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-7 px-2 text-xs"
																	onClick={() =>
																		copyEventPayload(event.id, details)
																	}
																>
																	<Copy className="mr-1 h-3.5 w-3.5" />
																	{copiedId === event.id ? "Copied" : "Copy"}
																</Button>
															</div>
															<pre className="max-h-64 overflow-auto rounded-sm bg-muted p-3 text-xs">
																{JSON.stringify(details, null, 2)}
															</pre>
														</div>
													)}
												</div>
											)}
										</CardContent>
									</Card>
								</div>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
