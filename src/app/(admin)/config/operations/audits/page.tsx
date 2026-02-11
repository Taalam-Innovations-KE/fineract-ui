"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Search } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import { useTenantStore } from "@/store/tenant";

interface AuditEntry {
	id?: number;
	actionName?: string;
	entityName?: string;
	resourceId?: string;
	madeOnDate?: string;
	maker?: string;
	processingResult?: string;
	officeName?: string;
	clientName?: string;
	checkedOnDate?: string;
	checker?: string;
	commandAsJson?: string;
}

async function fetchAudits(
	tenantId: string,
	params?: {
		actionName?: string;
		entityName?: string;
		officeId?: number;
		makerDateTimeFrom?: string;
		makerDateTimeTo?: string;
		processingResult?: string;
		offset?: number;
		limit?: number;
	},
): Promise<{ pageItems: AuditEntry[]; totalFilteredRecords: number }> {
	const queryParams = new URLSearchParams();

	if (params?.actionName) queryParams.append("actionName", params.actionName);
	if (params?.entityName) queryParams.append("entityName", params.entityName);
	if (params?.officeId)
		queryParams.append("officeId", params.officeId.toString());
	if (params?.makerDateTimeFrom)
		queryParams.append("makerDateTimeFrom", params.makerDateTimeFrom);
	if (params?.makerDateTimeTo)
		queryParams.append("makerDateTimeTo", params.makerDateTimeTo);
	if (params?.processingResult)
		queryParams.append("processingResult", params.processingResult);
	if (params?.offset !== undefined)
		queryParams.append("offset", params.offset.toString());
	if (params?.limit !== undefined)
		queryParams.append("limit", params.limit.toString());

	const url = `${BFF_ROUTES.audits}?${queryParams.toString()}`;

	const response = await fetch(url, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch audit logs");
	}

	return response.json();
}

async function fetchAuditSearchTemplate(tenantId: string): Promise<{
	actionNames?: string[];
	entityNames?: string[];
	appUsers?: Array<{ id: number; username: string }>;
	statuses?: Array<{ code: string; description: string }>;
}> {
	const response = await fetch(`${BFF_ROUTES.audits}/searchtemplate`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch audit search template");
	}

	return response.json();
}

export default function AuditLogsPage() {
	const { tenantId } = useTenantStore();

	const [filters, setFilters] = useState({
		actionName: "",
		entityName: "",
		officeId: "",
		processingResult: "",
		makerDateTimeFrom: "",
		makerDateTimeTo: "",
	});

	const {
		data: auditsData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["audits", tenantId, filters],
		queryFn: () =>
			fetchAudits(tenantId, {
				actionName: filters.actionName || undefined,
				entityName: filters.entityName || undefined,
				officeId: filters.officeId ? parseInt(filters.officeId) : undefined,
				processingResult: filters.processingResult || undefined,
				makerDateTimeFrom: filters.makerDateTimeFrom || undefined,
				makerDateTimeTo: filters.makerDateTimeTo || undefined,
				limit: 50,
			}),
	});

	const { data: searchTemplate } = useQuery({
		queryKey: ["audit-search-template", tenantId],
		queryFn: () => fetchAuditSearchTemplate(tenantId),
	});

	const audits = auditsData?.pageItems || [];
	const totalRecords = auditsData?.totalFilteredRecords || 0;

	const columns: DataTableColumn<AuditEntry>[] = [
		{
			header: "Date & Time",
			cell: (audit: AuditEntry) => (
				<div className="text-sm">
					{audit.madeOnDate ? new Date(audit.madeOnDate).toLocaleString() : "-"}
				</div>
			),
		},
		{
			header: "Action",
			cell: (audit: AuditEntry) => (
				<div>
					<div className="font-medium">{audit.actionName}</div>
					<div className="text-sm text-muted-foreground">
						{audit.entityName}
					</div>
				</div>
			),
		},
		{
			header: "Resource",
			cell: (audit: AuditEntry) => (
				<div className="text-sm">
					{audit.resourceId ? `ID: ${audit.resourceId}` : "-"}
				</div>
			),
		},
		{
			header: "User",
			cell: (audit: AuditEntry) => (
				<div className="text-sm">{audit.maker || "System"}</div>
			),
		},
		{
			header: "Status",
			cell: (audit: AuditEntry) => {
				const status = audit.processingResult;
				return (
					<Badge
						variant={
							status === "processed"
								? "default"
								: status === "error"
									? "destructive"
									: "secondary"
						}
					>
						{status || "Unknown"}
					</Badge>
				);
			},
		},
		{
			header: "Office",
			cell: (audit: AuditEntry) => (
				<div className="text-sm">{audit.officeName || "All Offices"}</div>
			),
		},
	];

	if (isLoading) {
		return (
			<PageShell
				title="Audit Trail"
				subtitle="Monitor system activity, configuration changes, and user actions"
			>
				<div className="space-y-6">
					<div className="grid gap-4 md:grid-cols-2">
						{Array.from({ length: 2 }).map((_, index) => (
							<Card key={`audit-summary-skeleton-${index}`}>
								<CardContent className="pt-6">
									<div className="flex items-center justify-between">
										<Skeleton className="h-4 w-28" />
										<Skeleton className="h-8 w-16" />
									</div>
								</CardContent>
							</Card>
						))}
					</div>
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-44" />
							<Skeleton className="h-4 w-80" />
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{Array.from({ length: 6 }).map((_, index) => (
									<div
										key={`audit-filter-skeleton-${index}`}
										className="space-y-2"
									>
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-10 w-full" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-4 w-64" />
						</CardHeader>
						<CardContent className="space-y-3">
							<Skeleton className="h-10 w-full" />
							{Array.from({ length: 6 }).map((_, index) => (
								<Skeleton
									key={`audit-row-skeleton-${index}`}
									className="h-10 w-full"
								/>
							))}
						</CardContent>
					</Card>
				</div>
			</PageShell>
		);
	}

	if (error) {
		return (
			<PageShell
				title="Audit Trail"
				subtitle="Monitor system activity and changes"
			>
				<Alert>
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						Failed to load audit logs. Please try again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	return (
		<PageShell
			title="Audit Trail"
			subtitle="Monitor system activity, configuration changes, and user actions"
		>
			<div className="space-y-6">
				{/* Summary */}
				<div className="grid gap-4 md:grid-cols-2">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Total Audit Entries
								</span>
								<span className="text-2xl font-bold">
									{totalRecords.toLocaleString()}
								</span>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Entries Shown
								</span>
								<span className="text-2xl font-bold">{audits.length}</span>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Filters */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Search className="h-5 w-5" />
							Filter Audit Logs
						</CardTitle>
						<CardDescription>
							Search and filter audit entries by various criteria
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							<div className="space-y-2">
								<Label htmlFor="action-filter">Action</Label>
								<Select
									value={filters.actionName}
									onValueChange={(value) =>
										setFilters({ ...filters, actionName: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="All Actions" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">All Actions</SelectItem>
										{searchTemplate?.actionNames?.map((action) => (
											<SelectItem key={action} value={action}>
												{action}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="entity-filter">Entity</Label>
								<Select
									value={filters.entityName}
									onValueChange={(value) =>
										setFilters({ ...filters, entityName: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="All Entities" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">All Entities</SelectItem>
										{searchTemplate?.entityNames?.map((entity) => (
											<SelectItem key={entity} value={entity}>
												{entity}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="status-filter">Processing Result</Label>
								<Select
									value={filters.processingResult}
									onValueChange={(value) =>
										setFilters({ ...filters, processingResult: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="All Results" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">All Results</SelectItem>
										<SelectItem value="processed">Processed</SelectItem>
										<SelectItem value="error">Error</SelectItem>
										<SelectItem value="rejected">Rejected</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="from-date">From Date</Label>
								<Input
									id="from-date"
									type="datetime-local"
									value={filters.makerDateTimeFrom}
									onChange={(e) =>
										setFilters({
											...filters,
											makerDateTimeFrom: e.target.value,
										})
									}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="to-date">To Date</Label>
								<Input
									id="to-date"
									type="datetime-local"
									value={filters.makerDateTimeTo}
									onChange={(e) =>
										setFilters({ ...filters, makerDateTimeTo: e.target.value })
									}
								/>
							</div>

							<div className="flex items-end">
								<Button
									onClick={() =>
										setFilters({
											actionName: "",
											entityName: "",
											officeId: "",
											processingResult: "",
											makerDateTimeFrom: "",
											makerDateTimeTo: "",
										})
									}
									variant="outline"
									className="w-full"
								>
									Clear Filters
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Audit Table */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Audit Entries
						</CardTitle>
						<CardDescription>
							Detailed log of all system activities and changes
						</CardDescription>
					</CardHeader>
					<CardContent>
						<DataTable
							columns={columns}
							data={audits}
							getRowId={(audit: AuditEntry) =>
								audit.id?.toString() || `audit-${Math.random()}`
							}
							emptyMessage="No audit entries found matching the current filters."
						/>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
