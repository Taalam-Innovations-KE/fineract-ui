"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Eye,
	FileJson,
	FileText,
	Filter,
	Play,
	Plus,
	Power,
	PowerOff,
	RefreshCw,
	Search,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/config/page-shell";
import { ReportUpsertSheet } from "@/components/reports/report-upsert-sheet";
import { ReportsCatalogSkeleton } from "@/components/reports/reports-catalog-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import { getReportRouteId } from "@/lib/fineract/report-route";
import {
	deleteReportDefinition,
	fetchReports,
	type ReportDefinition,
	updateReportDefinition,
} from "@/lib/fineract/reports";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";
import { useTenantStore } from "@/store/tenant";

const ALL_FILTER = "__ALL__";
const DEFAULT_STALE_TIME = 5 * 60 * 1000;
const REPORTS_PAGE_SIZE = 10;

type VisibilityFilter = "runnable" | "all";

export default function ReportsPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER);
	const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
	const [visibilityFilter, setVisibilityFilter] =
		useState<VisibilityFilter>("runnable");
	const [pageIndex, setPageIndex] = useState(0);
	const deferredSearchTerm = useDeferredValue(searchTerm);
	const [showCreateSheet, setShowCreateSheet] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<ReportDefinition | null>(
		null,
	);
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

	const reportsQuery = useQuery({
		queryKey: ["reports", tenantId],
		queryFn: () => fetchReports(tenantId),
		enabled: Boolean(tenantId),
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const toggleMutation = useMutation({
		mutationFn: (report: ReportDefinition) =>
			updateReportDefinition(tenantId, report.id!, {
				reportName: report.reportName,
				reportType: report.reportType,
				reportSubType: report.reportSubType,
				reportCategory: report.reportCategory,
				description: report.description,
				reportSql: report.reportSql,
				reportParameters: report.reportParameters,
				useReport: !report.useReport,
			}),
		onSuccess: (_, report) => {
			void queryClient.invalidateQueries({
				queryKey: ["reports", tenantId],
			});
			toast.success(
				report.useReport
					? `"${report.reportName}" disabled.`
					: `"${report.reportName}" enabled.`,
			);
		},
		onError: (error, report) => {
			console.error(
				"submit-error",
				toSubmitActionError(error, {
					action: "toggleReport",
					endpoint: BFF_ROUTES.reportById(report.id!),
					method: "PUT",
					tenantId,
				}),
			);
			toast.error("Failed to update report availability.");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (report: ReportDefinition) =>
			deleteReportDefinition(tenantId, report.id!),
		onSuccess: (_, report) => {
			void queryClient.invalidateQueries({
				queryKey: ["reports", tenantId],
			});
			toast.success(`"${report.reportName}" deleted.`);
			setDeleteTarget(null);
		},
		onError: (error, report) => {
			console.error(
				"submit-error",
				toSubmitActionError(error, {
					action: "deleteReport",
					endpoint: BFF_ROUTES.reportById(report.id!),
					method: "DELETE",
					tenantId,
				}),
			);
			toast.error("Failed to delete report.");
			setDeleteTarget(null);
		},
	});

	const batchToggleMutation = useMutation({
		mutationFn: ({
			targets,
			enable,
		}: {
			targets: ReportDefinition[];
			enable: boolean;
		}) =>
			Promise.all(
				targets.map((report) =>
					updateReportDefinition(tenantId, report.id!, {
						reportName: report.reportName,
						reportType: report.reportType,
						reportSubType: report.reportSubType,
						reportCategory: report.reportCategory,
						description: report.description,
						reportSql: report.reportSql,
						reportParameters: report.reportParameters,
						useReport: enable,
					}),
				),
			),
		onSuccess: (_, { targets, enable }) => {
			void queryClient.invalidateQueries({ queryKey: ["reports", tenantId] });
			setSelectedIds(new Set());
			toast.success(
				`${targets.length} report${targets.length === 1 ? "" : "s"} ${enable ? "enabled" : "disabled"}.`,
			);
		},
		onError: () => {
			toast.error("Batch update failed. Some reports may not have changed.");
		},
	});

	const toggleRowSelection = useCallback((id: number) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const reports = reportsQuery.data || [];
	const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

	const filteredReports = useMemo(
		() =>
			reports.filter((report) => {
				if (visibilityFilter === "runnable" && report.useReport === false) {
					return false;
				}

				if (
					categoryFilter !== ALL_FILTER &&
					(report.reportCategory?.trim() || "Uncategorized") !== categoryFilter
				) {
					return false;
				}

				if (
					typeFilter !== ALL_FILTER &&
					(report.reportType?.trim() || "Unknown") !== typeFilter
				) {
					return false;
				}

				if (!normalizedSearch) {
					return true;
				}

				const haystack = [
					report.reportName,
					report.reportCategory,
					report.reportType,
					report.reportSubType,
					report.description,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				return haystack.includes(normalizedSearch);
			}),
		[reports, visibilityFilter, categoryFilter, typeFilter, normalizedSearch],
	);

	const categories = useMemo(
		() =>
			Array.from(
				new Set(
					reports.map(
						(report) => report.reportCategory?.trim() || "Uncategorized",
					),
				),
			).sort((left, right) => left.localeCompare(right)),
		[reports],
	);

	const reportTypes = useMemo(
		() =>
			Array.from(
				new Set(
					reports.map((report) => report.reportType?.trim() || "Unknown"),
				),
			).sort((left, right) => left.localeCompare(right)),
		[reports],
	);

	const pagedReports = useMemo(() => {
		const start = pageIndex * REPORTS_PAGE_SIZE;
		return filteredReports.slice(start, start + REPORTS_PAGE_SIZE);
	}, [filteredReports, pageIndex]);

	const runnableCount = reports.filter(
		(report) => report.useReport !== false,
	).length;
	const parameterizedCount = reports.filter(
		(report) => (report.reportParameters?.length || 0) > 0,
	).length;
	const categoryCount = categories.length;
	const reportLoadError = reportsQuery.error
		? normalizeApiError(reportsQuery.error)
		: null;
	const emptyMessage =
		reports.length === 0
			? "No reports are available for this tenant."
			: "No reports match the current filters.";

	const reportColumns = useMemo(
		() => [
			{
				header: "",
				className: "w-px align-middle",
				cell: (report: ReportDefinition) =>
					report.id != null ? (
						<Checkbox
							checked={selectedIds.has(report.id)}
							onCheckedChange={() => toggleRowSelection(report.id!)}
							aria-label={`Select ${report.reportName}`}
							onClick={(e) => e.stopPropagation()}
						/>
					) : null,
			},
			{
				header: "Report",
				className: "align-top whitespace-normal",
				cell: (report: ReportDefinition) => (
					<div className="max-w-[32rem] break-words">
						<div className="font-medium">
							{report.reportName || "Unnamed report"}
						</div>
						<div className="text-xs text-muted-foreground">
							{report.description?.trim()
								? report.description
								: `ID ${report.id || "—"}`}
						</div>
					</div>
				),
			},
			{
				header: "Category",
				cell: (report: ReportDefinition) => (
					<span>{report.reportCategory?.trim() || "Uncategorized"}</span>
				),
			},
			{
				header: "Type",
				cell: (report: ReportDefinition) => (
					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary">
							{report.reportType?.trim() || "Unknown"}
						</Badge>
						{report.reportSubType ? (
							<Badge variant="outline">{report.reportSubType}</Badge>
						) : null}
					</div>
				),
			},
			{
				header: "Parameters",
				cell: (report: ReportDefinition) => (
					<Badge variant="outline">
						{report.reportParameters?.length || 0}
					</Badge>
				),
			},
			{
				header: "Status",
				cell: (report: ReportDefinition) => (
					<div className="flex flex-wrap gap-2">
						<Badge variant={report.useReport === false ? "warning" : "success"}>
							{report.useReport === false ? "Disabled" : "Runnable"}
						</Badge>
						{report.coreReport ? <Badge variant="outline">Core</Badge> : null}
					</div>
				),
			},
			{
				header: "Actions",
				headerClassName: "text-right",
				className: "text-right",
				cell: (report: ReportDefinition) => (
					<div className="flex items-center justify-end gap-1.5">
						<Button variant="outline" size="sm" asChild>
							<Link
								href={`/config/operations/reports/${getReportRouteId(report)}`}
							>
								<Eye className="mr-1 h-3 w-3" />
								View
							</Link>
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								if (report.id != null) {
									toggleMutation.mutate(report);
								}
							}}
							disabled={report.id == null || toggleMutation.isPending}
							title={
								report.useReport === false ? "Enable report" : "Disable report"
							}
						>
							{report.useReport === false ? (
								<Power className="h-3.5 w-3.5" />
							) : (
								<PowerOff className="h-3.5 w-3.5" />
							)}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setDeleteTarget(report)}
							disabled={report.id == null}
							title="Delete report"
						>
							<Trash2 className="h-3.5 w-3.5 text-destructive" />
						</Button>
					</div>
				),
			},
		],
		[toggleMutation, selectedIds, toggleRowSelection],
	);

	if (reportsQuery.isLoading && reports.length === 0) {
		return (
			<PageShell
				title="Reports"
				subtitle="Browse report definitions and open dedicated detail pages for execution and output review."
			>
				<ReportsCatalogSkeleton rowCount={REPORTS_PAGE_SIZE} />
			</PageShell>
		);
	}

	return (
		<PageShell
			title="Reports"
			subtitle="Browse report definitions and open dedicated detail pages for execution and output review."
			actions={
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							void reportsQuery.refetch();
						}}
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						Refresh
					</Button>
					<Button type="button" onClick={() => setShowCreateSheet(true)}>
						<Plus className="mr-2 h-4 w-4" />
						New Report
					</Button>
				</div>
			}
		>
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<FileText className="h-5 w-5 text-primary" />
								</div>
								<div>
									<div className="text-2xl font-bold">{reports.length}</div>
									<div className="text-sm text-muted-foreground">
										Report definitions
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-success/10">
									<Play className="h-5 w-5 text-success" />
								</div>
								<div>
									<div className="text-2xl font-bold">{runnableCount}</div>
									<div className="text-sm text-muted-foreground">
										Runnable reports
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-info/10">
									<Filter className="h-5 w-5 text-info" />
								</div>
								<div>
									<div className="text-2xl font-bold">{parameterizedCount}</div>
									<div className="text-sm text-muted-foreground">
										Parameterized reports
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-warning/10">
									<FileJson className="h-5 w-5 text-warning" />
								</div>
								<div>
									<div className="text-2xl font-bold">{categoryCount}</div>
									<div className="text-sm text-muted-foreground">
										Report categories
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{reportLoadError ? (
					<Alert variant="destructive">
						<AlertTitle>Unable to load reports</AlertTitle>
						<AlertDescription>{reportLoadError.message}</AlertDescription>
					</Alert>
				) : null}

				<Card>
					<CardHeader>
						<CardTitle>Catalog Filters</CardTitle>
						<CardDescription>
							Trim the registry, then open a report detail page to inspect its
							contract and run it.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="report-search">Search</Label>
							<div className="relative">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="report-search"
									value={searchTerm}
									onChange={(event) => {
										setSearchTerm(event.target.value);
										setPageIndex(0);
									}}
									placeholder="Search reports, categories, and descriptions"
									className="pl-8"
								/>
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-3">
							<div className="space-y-2">
								<Label>Visibility</Label>
								<Select
									value={visibilityFilter}
									onValueChange={(value) => {
										setVisibilityFilter(value as VisibilityFilter);
										setPageIndex(0);
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select visibility" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="runnable">Runnable only</SelectItem>
										<SelectItem value="all">All definitions</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Category</Label>
								<Select
									value={categoryFilter}
									onValueChange={(value) => {
										setCategoryFilter(value);
										setPageIndex(0);
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="All categories" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={ALL_FILTER}>All categories</SelectItem>
										{categories.map((category) => (
											<SelectItem key={category} value={category}>
												{category}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Report Type</Label>
								<Select
									value={typeFilter}
									onValueChange={(value) => {
										setTypeFilter(value);
										setPageIndex(0);
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="All report types" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={ALL_FILTER}>All report types</SelectItem>
										{reportTypes.map((reportType) => (
											<SelectItem key={reportType} value={reportType}>
												{reportType}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</Card>

				{selectedIds.size > 0 ? (
					<div className="flex flex-wrap items-center gap-2 rounded-sm border border-border/60 bg-muted/40 px-4 py-3">
						<span className="text-sm font-medium">
							{selectedIds.size} report{selectedIds.size === 1 ? "" : "s"}{" "}
							selected
						</span>
						<div className="ml-auto flex flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									const pageIds = pagedReports
										.map((r) => r.id)
										.filter((id): id is number => id != null);
									setSelectedIds((prev) => {
										const next = new Set(prev);
										pageIds.forEach((id) => next.add(id));
										return next;
									});
								}}
							>
								Select page
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setSelectedIds(new Set())}
							>
								Clear
							</Button>
							<Button
								type="button"
								size="sm"
								onClick={() => {
									const targets = reports.filter(
										(r) => r.id != null && selectedIds.has(r.id),
									);
									batchToggleMutation.mutate({ targets, enable: true });
								}}
								disabled={batchToggleMutation.isPending}
							>
								<Power className="mr-1.5 h-3.5 w-3.5" />
								Enable
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									const targets = reports.filter(
										(r) => r.id != null && selectedIds.has(r.id),
									);
									batchToggleMutation.mutate({ targets, enable: false });
								}}
								disabled={batchToggleMutation.isPending}
							>
								<PowerOff className="mr-1.5 h-3.5 w-3.5" />
								Disable
							</Button>
						</div>
					</div>
				) : null}

				<Card>
					<CardHeader>
						<CardTitle>Report Catalog</CardTitle>
						<CardDescription>
							{filteredReports.length} report
							{filteredReports.length === 1 ? "" : "s"} match the current
							filters.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<DataTable
							data={pagedReports}
							columns={reportColumns}
							manualPagination={true}
							pageSize={REPORTS_PAGE_SIZE}
							pageIndex={pageIndex}
							totalRows={filteredReports.length}
							onPageChange={setPageIndex}
							getRowId={(report) =>
								String(report.id ?? report.reportName ?? "report-row")
							}
							emptyMessage={emptyMessage}
						/>
					</CardContent>
				</Card>
			</div>

			<ReportUpsertSheet
				mode="create"
				open={showCreateSheet}
				onOpenChange={setShowCreateSheet}
			/>

			<AlertDialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete report?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently remove{" "}
							<strong>{deleteTarget?.reportName}</strong> from the catalog. This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (deleteTarget) {
									deleteMutation.mutate(deleteTarget);
								}
							}}
							disabled={deleteMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? "Deleting…" : "Delete Report"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageShell>
	);
}
