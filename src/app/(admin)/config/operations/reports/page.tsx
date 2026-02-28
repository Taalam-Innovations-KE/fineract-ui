"use client";

import { useQuery } from "@tanstack/react-query";
import {
	FileJson,
	FileText,
	Filter,
	Play,
	RefreshCw,
	Search,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { ReportsCatalogSkeleton } from "@/components/reports/reports-catalog-skeleton";
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
import { getReportRouteId } from "@/lib/fineract/report-route";
import { fetchReports, type ReportDefinition } from "@/lib/fineract/reports";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";
import { useTenantStore } from "@/store/tenant";

const ALL_FILTER = "__ALL__";
const DEFAULT_STALE_TIME = 5 * 60 * 1000;
const REPORTS_PAGE_SIZE = 10;

type VisibilityFilter = "runnable" | "all";

export default function ReportsPage() {
	const { tenantId } = useTenantStore();
	const [searchTerm, setSearchTerm] = useState("");
	const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER);
	const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
	const [visibilityFilter, setVisibilityFilter] =
		useState<VisibilityFilter>("runnable");
	const [pageIndex, setPageIndex] = useState(0);
	const deferredSearchTerm = useDeferredValue(searchTerm);

	const reportsQuery = useQuery({
		queryKey: ["reports", tenantId],
		queryFn: () => fetchReports(tenantId),
		enabled: Boolean(tenantId),
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
	});

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
				header: "Report",
				cell: (report: ReportDefinition) => (
					<div>
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
		],
		[],
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
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						void reportsQuery.refetch();
					}}
				>
					<RefreshCw className="mr-2 h-4 w-4" />
					Refresh Catalog
				</Button>
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
							enableActions={true}
							getViewUrl={(report) =>
								`/config/operations/reports/${getReportRouteId(report)}`
							}
						/>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
