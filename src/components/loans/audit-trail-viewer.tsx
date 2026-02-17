"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { LoanAuditTimeline } from "@/components/loans/loan-audit-timeline";
import { AuditViewToggle } from "@/components/ui/audit-view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type AuditEvent,
	formatAuditTimestamp,
	getAuditFilterOptions,
	transformAuditData,
} from "@/lib/fineract/audit-utils";

type ViewType = "timeline" | "table";
type StatusFilter = "all" | AuditEvent["status"];
const AUDIT_VIEW_OPTIONS = [
	{ value: "timeline", label: "Timeline" },
	{ value: "table", label: "Table" },
] as const;

interface AuditTrailViewerProps {
	events: unknown[];
	isLoading?: boolean;
	error?: Error | null;
	className?: string;
}

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

function StatCard({
	label,
	value,
	variant = "outline",
}: {
	label: string;
	value: number;
	variant?: "outline" | "default" | "warning" | "destructive" | "info";
}) {
	return (
		<div className="rounded-sm border bg-card p-3">
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs uppercase tracking-wide text-muted-foreground">
					{label}
				</p>
				<Badge variant={variant} className="rounded-sm text-[10px]">
					{value}
				</Badge>
			</div>
		</div>
	);
}

export function AuditTrailViewer({
	events,
	isLoading,
	error,
	className,
}: AuditTrailViewerProps) {
	const [view, setView] = useState<ViewType>("timeline");
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [actorFilter, setActorFilter] = useState("all");
	const [actionFilter, setActionFilter] = useState("all");

	const transformedEvents = useMemo(() => transformAuditData(events), [events]);
	const filterOptions = useMemo(
		() => getAuditFilterOptions(transformedEvents),
		[transformedEvents],
	);

	const filteredEvents = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return transformedEvents.filter((event) => {
			if (statusFilter !== "all" && event.status !== statusFilter) return false;
			if (actorFilter !== "all" && event.user !== actorFilter) return false;
			if (actionFilter !== "all" && event.action !== actionFilter) return false;

			if (!normalizedQuery) return true;

			const searchable = [
				event.action,
				event.user,
				event.entity ?? "",
				event.resourceId ?? "",
				event.processingResult ?? "",
			]
				.join(" ")
				.toLowerCase();

			return searchable.includes(normalizedQuery);
		});
	}, [transformedEvents, statusFilter, actorFilter, actionFilter, query]);

	const summary = useMemo(() => {
		return {
			total: filteredEvents.length,
			success: filteredEvents.filter((event) => event.status === "success")
				.length,
			warning: filteredEvents.filter((event) => event.status === "warning")
				.length,
			error: filteredEvents.filter((event) => event.status === "error").length,
			info: filteredEvents.filter((event) => event.status === "info").length,
			actors: new Set(filteredEvents.map((event) => event.user)).size,
		};
	}, [filteredEvents]);

	const resetFilters = () => {
		setQuery("");
		setStatusFilter("all");
		setActorFilter("all");
		setActionFilter("all");
	};

	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle>Audit Trail</CardTitle>
					<CardDescription>
						Loading timeline, actors, and audit metadata
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
						{Array.from({ length: 4 }).map((_, index) => (
							<Skeleton
								key={`audit-stat-skeleton-${index}`}
								className="h-16 w-full"
							/>
						))}
					</div>
					<div className="grid gap-3 md:grid-cols-3">
						<Skeleton className="h-9 w-full md:col-span-2" />
						<Skeleton className="h-9 w-full" />
					</div>
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton
							key={`audit-row-skeleton-${index}`}
							className="h-24 w-full rounded-sm"
						/>
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
					<div className="py-6 text-center">
						<p className="mb-4 text-destructive">
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
			<CardHeader className="space-y-3">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1">
						<CardTitle>Audit Trail</CardTitle>
						<CardDescription>
							Showing {filteredEvents.length} of {transformedEvents.length}{" "}
							events
						</CardDescription>
					</div>
					<AuditViewToggle
						view={view}
						onViewChange={setView}
						options={AUDIT_VIEW_OPTIONS}
					/>
				</div>

				<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
					<StatCard label="Total" value={summary.total} variant="outline" />
					<StatCard
						label="Successful"
						value={summary.success}
						variant="default"
					/>
					<StatCard
						label="Warnings"
						value={summary.warning}
						variant="warning"
					/>
					<StatCard
						label="Errors"
						value={summary.error}
						variant="destructive"
					/>
					<StatCard label="Info" value={summary.info} variant="info" />
					<StatCard label="Actors" value={summary.actors} variant="outline" />
				</div>

				<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
					<div className="relative md:col-span-2 lg:col-span-5">
						<Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							className="pl-8"
							placeholder="Search action, actor, entity, resource..."
						/>
					</div>

					<div className="lg:col-span-2">
						<Select
							value={statusFilter}
							onValueChange={(value) => setStatusFilter(value as StatusFilter)}
						>
							<SelectTrigger>
								<SelectValue placeholder="All statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								<SelectItem value="success">Success</SelectItem>
								<SelectItem value="warning">Warning</SelectItem>
								<SelectItem value="error">Error</SelectItem>
								<SelectItem value="info">Info</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="lg:col-span-2">
						<Select value={actorFilter} onValueChange={setActorFilter}>
							<SelectTrigger>
								<SelectValue placeholder="All actors" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All actors</SelectItem>
								{filterOptions.users.map((user) => (
									<SelectItem key={`audit-user-${user}`} value={user}>
										{user}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="lg:col-span-2">
						<Select value={actionFilter} onValueChange={setActionFilter}>
							<SelectTrigger>
								<SelectValue placeholder="All actions" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All actions</SelectItem>
								{filterOptions.actions.map((action) => (
									<SelectItem key={`audit-action-${action}`} value={action}>
										{action}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="lg:col-span-1">
						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={resetFilters}
						>
							Reset
						</Button>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{filteredEvents.length === 0 ? (
					<div className="py-8 text-center text-muted-foreground">
						No audit events match the current filters.
					</div>
				) : view === "timeline" ? (
					<LoanAuditTimeline events={filteredEvents} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Timestamp</TableHead>
								<TableHead>Activity</TableHead>
								<TableHead>Actor</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Resource</TableHead>
								<TableHead className="text-right">Changes</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredEvents.map((event) => (
								<TableRow key={event.id}>
									<TableCell className="align-top text-xs text-muted-foreground">
										{formatAuditTimestamp(event.timestamp)}
									</TableCell>
									<TableCell className="align-top">
										<div className="space-y-1">
											<p className="text-sm font-medium">{event.action}</p>
											{event.entity && (
												<Badge variant="outline" className="rounded-sm">
													{event.entity}
												</Badge>
											)}
										</div>
									</TableCell>
									<TableCell className="align-top text-sm">
										{event.user}
									</TableCell>
									<TableCell className="align-top">
										<Badge
											variant={getStatusBadgeVariant(event.status)}
											className="rounded-sm"
										>
											{event.status}
										</Badge>
									</TableCell>
									<TableCell className="align-top text-sm text-muted-foreground">
										{event.resourceId ? `#${event.resourceId}` : "—"}
									</TableCell>
									<TableCell className="text-right align-top">
										<Badge variant="info" className="rounded-sm">
											{event.changeCount ?? 0}
										</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
