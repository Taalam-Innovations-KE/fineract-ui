"use client";

import { useMemo, useState } from "react";
import { AuditTimeline } from "@/components/ui/audit-timeline";
import { AuditViewToggle } from "@/components/ui/audit-view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	AuditEvent,
	formatAuditTimestamp,
	transformAuditData,
} from "@/lib/fineract/audit-utils";

type ViewType = "timeline" | "table";

interface AuditTrailViewerProps {
	events: unknown[];
	isLoading?: boolean;
	error?: Error | null;
	className?: string;
}

export function AuditTrailViewer({
	events,
	isLoading,
	error,
	className,
}: AuditTrailViewerProps) {
	const [view, setView] = useState<ViewType>("timeline");

	const transformedEvents = useMemo(() => {
		return transformAuditData(events);
	}, [events]);

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

	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						Audit Trail
						<AuditViewToggle view={view} onViewChange={setView} />
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{Array.from({ length: 3 }).map((_, index) => (
						<div key={`audit-trail-skeleton-${index}`} className="flex gap-4">
							<Skeleton className="h-3 w-3 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-1/3" />
								<Skeleton className="h-3 w-1/4" />
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle>Audit Trail</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-8">
						<p className="text-red-600 mb-4">
							Failed to load audit trail: {error.message}
						</p>
						<Button variant="outline" onClick={() => window.location.reload()}>
							Retry
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					Audit Trail
					<AuditViewToggle view={view} onViewChange={setView} />
				</CardTitle>
			</CardHeader>
			<CardContent>
				{view === "timeline" ? (
					<AuditTimeline events={transformedEvents} />
				) : (
					// Simple table view for now
					<div className="space-y-2">
						{transformedEvents.length === 0 ? (
							<p className="text-center py-8 text-muted-foreground">
								No audit events found.
							</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full border-collapse">
									<thead>
										<tr className="border-b">
											<th className="text-left p-2 font-medium">Timestamp</th>
											<th className="text-left p-2 font-medium">Action</th>
											<th className="text-left p-2 font-medium">User</th>
											<th className="text-left p-2 font-medium">Status</th>
										</tr>
									</thead>
									<tbody>
										{transformedEvents.map((event) => (
											<tr key={event.id} className="border-b hover:bg-muted/50">
												<td className="p-2 text-sm">
													{formatAuditTimestamp(event.timestamp)}
												</td>
												<td className="p-2 text-sm font-medium">
													{event.action}
												</td>
												<td className="p-2 text-sm">{event.user}</td>
												<td className="p-2">
													<Badge
														variant={getStatusBadgeVariant(event.status)}
														className="text-xs"
													>
														{event.status}
													</Badge>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
