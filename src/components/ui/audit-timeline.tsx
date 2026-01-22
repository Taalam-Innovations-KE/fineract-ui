"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuditEvent, formatAuditTimestamp } from "@/lib/fineract/audit-utils";

interface AuditTimelineProps {
	events: AuditEvent[];
	className?: string;
}

export function AuditTimeline({ events, className }: AuditTimelineProps) {
	const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

	const toggleExpanded = (eventId: string) => {
		const newExpanded = new Set(expandedEvents);
		if (newExpanded.has(eventId)) {
			newExpanded.delete(eventId);
		} else {
			newExpanded.add(eventId);
		}
		setExpandedEvents(newExpanded);
	};

	if (events.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				No audit events found.
			</div>
		);
	}

	const getStatusBadgeVariant = (status: AuditEvent["status"]) => {
		switch (status) {
			case "success":
				return "default";
			case "warning":
				return "secondary";
			case "error":
				return "destructive";
			default:
				return "outline";
		}
	};

	return (
		<div className={className}>
			<div className="space-y-4">
				{events.map((event, index) => (
					<div key={event.id} className="flex gap-4">
						{/* Timeline connector */}
						<div className="flex flex-col items-center">
							<div className="w-3 h-3 bg-primary rounded-full flex-shrink-0" />
							{index < events.length - 1 && (
								<div className="w-px h-full bg-border mt-2" />
							)}
						</div>

						{/* Event content */}
						<Card className="flex-1">
							<CardContent className="pt-4">
								<div className="flex items-start justify-between">
									<div className="space-y-2 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<h4 className="font-medium text-sm">{event.action}</h4>
											<Badge
												variant={getStatusBadgeVariant(event.status)}
												className="text-xs"
											>
												{event.status}
											</Badge>
										</div>
										<div className="flex items-center gap-4 text-xs text-muted-foreground">
											<span>by {event.user}</span>
											<span>on {formatAuditTimestamp(event.timestamp)}</span>
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="ml-2"
										onClick={() => toggleExpanded(event.id)}
									>
										{expandedEvents.has(event.id) ? (
											<ChevronDown className="w-4 h-4" />
										) : (
											<ChevronRight className="w-4 h-4" />
										)}
									</Button>
								</div>

								{expandedEvents.has(event.id) && (
									<div className="mt-4 pt-4 border-t">
										<h5 className="text-sm font-medium mb-2">Event Details</h5>
										<pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
											{JSON.stringify(event.details, null, 2)}
										</pre>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				))}
			</div>
		</div>
	);
}
