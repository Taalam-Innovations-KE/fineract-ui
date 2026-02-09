"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileBarChart2, Play, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetReportsResponse,
	ReportExportType,
	RunReportsResponse,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

type ReportOutputType = "JSON" | "PDF" | "XLS" | "XLSX" | "CSV" | "HTML";

type ReportData = GetReportsResponse & {
	reportParameters?: Array<Record<string, unknown>>;
};

interface ReportParameterField {
	key: string;
	queryKey: string;
	label: string;
	required: boolean;
	dataType: string;
}

interface OutputOption {
	label: string;
	value: ReportOutputType;
}

interface RunResult {
	columnHeaders?: Array<{ columnName?: string }>;
	data?: Array<unknown>;
	[key: string]: unknown;
}

const PARAMETER_KEY_FIELDS = [
	"reportParameterName",
	"parameterName",
	"name",
	"paramName",
	"code",
] as const;

const PARAMETER_LABEL_FIELDS = ["label", "displayName", "name"] as const;
const PARAMETER_TYPE_FIELDS = ["type", "dataType", "parameterType"] as const;
const PARAMETER_REQUIRED_FIELDS = ["required", "mandatory"] as const;

const PARAMETER_KEY_OVERRIDES: Record<string, string> = {
	OfficeIdSelectOne: "R_officeId",
	loanOfficerIdSelectAll: "R_loanOfficerId",
	currencyIdSelectAll: "R_currencyId",
	fundIdSelectAll: "R_fundId",
	loanProductIdSelectAll: "R_loanProductId",
	loanPurposeIdSelectAll: "R_loanPurposeId",
	savingsProductIdSelectAll: "R_savingsProductId",
	startDateSelect: "R_startDate",
	endDateSelect: "R_endDate",
	obligDateTypeSelect: "R_obligDateType",
};

const OUTPUT_LABELS: Record<ReportOutputType, string> = {
	JSON: "JSON Preview",
	PDF: "PDF",
	XLS: "XLS",
	XLSX: "XLSX",
	CSV: "CSV",
	HTML: "HTML",
};

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

function readStringField(
	record: Record<string, unknown>,
	keys: readonly string[],
): string | null {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}
	return null;
}

function readBooleanField(
	record: Record<string, unknown>,
	keys: readonly string[],
): boolean {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "boolean") {
			return value;
		}
	}
	return false;
}

function toTitleLabel(value: string): string {
	const clean = value
		.replace(/^R_/, "")
		.replace(/[_\-]+/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.trim();
	if (!clean) return value;
	return clean
		.split(" ")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function toQueryParameterKey(rawKey: string): string {
	const key = rawKey.trim();
	if (!key) return rawKey;
	if (key.startsWith("R_")) return key;

	const override = PARAMETER_KEY_OVERRIDES[key];
	if (override) {
		return override;
	}

	const stripped = key
		.replace(/Select(All|One)?$/i, "")
		.replace(/^Select/i, "");
	const normalized = stripped.charAt(0).toLowerCase() + stripped.slice(1);
	return `R_${normalized}`;
}

function extractReportParameters(report: ReportData): ReportParameterField[] {
	const rawParameters = report.reportParameters || [];
	const fields: ReportParameterField[] = [];
	const seenKeys = new Set<string>();

	for (const rawParameter of rawParameters) {
		const record = asRecord(rawParameter);
		if (!record) continue;

		const key = readStringField(record, PARAMETER_KEY_FIELDS);
		if (!key) continue;
		const queryKey = toQueryParameterKey(key);
		if (seenKeys.has(queryKey)) continue;

		const label =
			readStringField(record, PARAMETER_LABEL_FIELDS) || toTitleLabel(key);
		const dataType = readStringField(record, PARAMETER_TYPE_FIELDS) || "text";
		const required = readBooleanField(record, PARAMETER_REQUIRED_FIELDS);

		fields.push({
			key,
			queryKey,
			label,
			dataType,
			required,
		});
		seenKeys.add(queryKey);
	}

	return fields;
}

function normalizeOutputType(value: string): ReportOutputType | null {
	const upper = value.toUpperCase();
	if (
		upper === "PDF" ||
		upper === "XLS" ||
		upper === "XLSX" ||
		upper === "CSV" ||
		upper === "HTML"
	) {
		return upper as ReportOutputType;
	}
	return null;
}

function inferOutputFromText(
	value: string | undefined,
): ReportOutputType | null {
	if (!value) return null;
	const upper = value.toUpperCase();
	if (upper.includes("XLSX")) return "XLSX";
	if (upper.includes("XLS")) return "XLS";
	if (upper.includes("CSV")) return "CSV";
	if (upper.includes("PDF")) return "PDF";
	if (upper.includes("HTML")) return "HTML";
	return null;
}

function outputFromExport(
	exportType: ReportExportType,
): ReportOutputType | null {
	const outputFromKey = inferOutputFromText(exportType.key);

	const query = (exportType.queryParameter || "").trim();
	if (!query) return outputFromKey;

	const search = new URLSearchParams(
		query.startsWith("?") ? query.slice(1) : query,
	);
	const explicitOutput = search.get("output-type");
	if (explicitOutput) {
		return normalizeOutputType(explicitOutput) || outputFromKey;
	}
	if (search.get("exportCSV")?.toLowerCase() === "true") {
		return "CSV";
	}

	return outputFromKey;
}

function buildOutputOptions(
	exports: ReportExportType[] | undefined,
): OutputOption[] {
	const options: OutputOption[] = [
		{
			value: "JSON",
			label: OUTPUT_LABELS.JSON,
		},
	];
	const seen = new Set<ReportOutputType>(["JSON"]);

	for (const exportType of exports || []) {
		const value = outputFromExport(exportType);
		if (!value || seen.has(value)) continue;
		options.push({ value, label: OUTPUT_LABELS[value] });
		seen.add(value);
	}

	return options;
}

function parseAdditionalParams(input: string): Array<[string, string]> {
	const entries: Array<[string, string]> = [];
	for (const token of input.split(/[\n&]/)) {
		const cleaned = token.trim();
		if (!cleaned) continue;
		const equalIndex = cleaned.indexOf("=");
		if (equalIndex <= 0) continue;

		const key = cleaned.slice(0, equalIndex).trim();
		const value = cleaned.slice(equalIndex + 1).trim();
		if (key) {
			entries.push([key, value]);
		}
	}
	return entries;
}

function getFilenameFromContentDisposition(
	contentDisposition: string | null,
	fallback: string,
): string {
	if (!contentDisposition) return fallback;
	const match = contentDisposition.match(
		/filename\*?=(?:UTF-8'')?"?([^\";]+)"?/i,
	);
	if (!match?.[1]) return fallback;
	return decodeURIComponent(match[1]);
}

function getPreviewColumns(result: RunResult | null): string[] {
	if (!result) return [];

	const headers = Array.isArray(result.columnHeaders)
		? result.columnHeaders
				.map((header) => header?.columnName?.trim())
				.filter((header): header is string => Boolean(header))
		: [];
	if (headers.length > 0) return headers;

	const firstRow = Array.isArray(result.data) ? result.data[0] : null;
	if (Array.isArray(firstRow)) {
		return firstRow.map((_, index) => `Column ${index + 1}`);
	}

	const firstRecord = asRecord(firstRow);
	if (firstRecord) {
		return Object.keys(firstRecord);
	}

	return [];
}

function formatPreviewValue(value: unknown): string {
	if (value === undefined || value === null) return "—";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return JSON.stringify(value);
}

function getPreviewCellValue(
	row: unknown,
	column: string,
	columnIndex: number,
): string {
	if (Array.isArray(row)) {
		return formatPreviewValue(row[columnIndex]);
	}
	const record = asRecord(row);
	if (!record) return "—";
	return formatPreviewValue(record[column]);
}

async function fetchReports(tenantId: string): Promise<ReportData[]> {
	const response = await fetch(BFF_ROUTES.reports, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch reports");
	}

	return response.json();
}

async function fetchReportExports(
	tenantId: string,
	reportName: string,
): Promise<ReportExportType[]> {
	const response = await fetch(
		BFF_ROUTES.runReportAvailableExports(reportName),
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		if (response.status === 400 || response.status === 404) {
			return [];
		}
		throw new Error("Failed to fetch available report exports");
	}

	return response.json();
}

function ReportsTableSkeleton() {
	return (
		<div className="space-y-2">
			<Card className="rounded-sm border border-border/60">
				<Table>
					<TableHeader className="border-b border-border/60 bg-muted/40">
						<TableRow>
							{[
								"Report",
								"Category",
								"Type",
								"Parameters",
								"Status",
								"Run",
							].map((key) => (
								<TableHead key={key} className="px-3 py-2">
									<Skeleton className="h-4 w-20" />
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: 8 }).map((_, index) => (
							<TableRow key={index}>
								<TableCell className="px-3 py-2">
									<Skeleton className="h-4 w-40" />
								</TableCell>
								<TableCell className="px-3 py-2">
									<Skeleton className="h-4 w-20" />
								</TableCell>
								<TableCell className="px-3 py-2">
									<Skeleton className="h-4 w-16" />
								</TableCell>
								<TableCell className="px-3 py-2">
									<Skeleton className="h-4 w-10" />
								</TableCell>
								<TableCell className="px-3 py-2">
									<Skeleton className="h-6 w-24" />
								</TableCell>
								<TableCell className="px-3 py-2">
									<Skeleton className="h-8 w-20" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

export default function ReportsPage() {
	const { tenantId } = useTenantStore();
	const [searchTerm, setSearchTerm] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
	const [isRunnerOpen, setIsRunnerOpen] = useState(false);
	const [parameterValues, setParameterValues] = useState<
		Record<string, string>
	>({});
	const [additionalParams, setAdditionalParams] = useState("");
	const [selectedOutput, setSelectedOutput] =
		useState<ReportOutputType>("JSON");
	const [runResult, setRunResult] = useState<RunResult | null>(null);

	const reportsQuery = useQuery({
		queryKey: ["reports", tenantId],
		queryFn: () => fetchReports(tenantId),
	});

	const availableExportsQuery = useQuery({
		queryKey: ["report-exports", tenantId, selectedReport?.reportName],
		queryFn: () =>
			fetchReportExports(tenantId, selectedReport?.reportName || ""),
		enabled: isRunnerOpen && Boolean(selectedReport?.reportName),
	});

	const applicableReports = useMemo(
		() =>
			(reportsQuery.data || []).filter((report) => report.useReport !== false),
		[reportsQuery.data],
	);

	const categories = useMemo(() => {
		const values = new Set<string>();
		for (const report of applicableReports) {
			if (report.reportCategory) {
				values.add(report.reportCategory);
			}
		}
		return Array.from(values).sort((a, b) => a.localeCompare(b));
	}, [applicableReports]);

	const filteredReports = useMemo(() => {
		const searchLower = searchTerm.trim().toLowerCase();
		return applicableReports.filter((report) => {
			const matchesCategory =
				categoryFilter === "all" || report.reportCategory === categoryFilter;
			const matchesSearch =
				!searchLower ||
				report.reportName?.toLowerCase().includes(searchLower) ||
				report.reportCategory?.toLowerCase().includes(searchLower) ||
				report.description?.toLowerCase().includes(searchLower);
			return matchesCategory && matchesSearch;
		});
	}, [applicableReports, categoryFilter, searchTerm]);

	const selectedParameterFields = useMemo(
		() => (selectedReport ? extractReportParameters(selectedReport) : []),
		[selectedReport],
	);

	const outputOptions = useMemo(
		() => buildOutputOptions(availableExportsQuery.data),
		[availableExportsQuery.data],
	);

	useEffect(() => {
		const available = outputOptions.map((option) => option.value);
		if (!available.includes(selectedOutput)) {
			setSelectedOutput(available[0] || "JSON");
		}
	}, [outputOptions, selectedOutput]);

	const runReportMutation = useMutation({
		mutationFn: async () => {
			if (!selectedReport?.reportName) {
				throw new Error("Report name is missing");
			}

			const params = new URLSearchParams();

			for (const field of selectedParameterFields) {
				const value = (parameterValues[field.queryKey] || "").trim();
				if (value) {
					params.append(field.queryKey, value);
				}
			}

			for (const [key, value] of parseAdditionalParams(additionalParams)) {
				params.append(key, value);
			}

			if (selectedOutput !== "JSON") {
				params.set("output-type", selectedOutput);
				if (selectedOutput === "CSV") {
					params.set("exportCSV", "true");
				}
			}

			const url = `${BFF_ROUTES.runReport(selectedReport.reportName)}?${params.toString()}`;
			const response = await fetch(url, {
				headers: {
					"x-tenant-id": tenantId,
				},
			});

			if (!response.ok) {
				const payload = await response.json();
				const message =
					payload.message ||
					payload.error ||
					"Failed to execute report on backend";
				throw new Error(message);
			}

			if (selectedOutput === "JSON") {
				const payload = (await response.json()) as RunReportsResponse;
				setRunResult(payload);
				return;
			}

			const blob = await response.blob();
			const blobUrl = window.URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = blobUrl;
			anchor.download = getFilenameFromContentDisposition(
				response.headers.get("Content-Disposition"),
				`${selectedReport.reportName}_${Date.now()}.${selectedOutput.toLowerCase()}`,
			);
			document.body.appendChild(anchor);
			anchor.click();
			window.URL.revokeObjectURL(blobUrl);
			document.body.removeChild(anchor);
		},
	});

	const previewColumns = useMemo(
		() => getPreviewColumns(runResult),
		[runResult],
	);
	const previewRows = Array.isArray(runResult?.data) ? runResult.data : [];

	const reportColumns: DataTableColumn<ReportData>[] = [
		{
			header: "Report",
			cell: (report) => (
				<div>
					<div className="font-medium">
						{report.reportName || "Unnamed Report"}
					</div>
					<div className="text-xs text-muted-foreground line-clamp-1">
						{report.description || "No description"}
					</div>
				</div>
			),
		},
		{
			header: "Category",
			cell: (report) => <span>{report.reportCategory || "Uncategorized"}</span>,
		},
		{
			header: "Type",
			cell: (report) => (
				<Badge variant="secondary">{report.reportType || "Unknown"}</Badge>
			),
		},
		{
			header: "Parameters",
			cell: (report) => (
				<span>{extractReportParameters(report).length.toLocaleString()}</span>
			),
		},
		{
			header: "Status",
			cell: (report) => (
				<div className="flex items-center gap-2">
					<Badge variant={report.coreReport ? "outline" : "secondary"}>
						{report.coreReport ? "Core" : "Custom"}
					</Badge>
					<Badge
						variant={report.useReport === false ? "destructive" : "success"}
					>
						{report.useReport === false ? "Disabled" : "Enabled"}
					</Badge>
				</div>
			),
		},
		{
			header: "Run",
			cell: (report) => (
				<Button
					size="sm"
					onClick={() => {
						const fields = extractReportParameters(report);
						setSelectedReport(report);
						setParameterValues(
							Object.fromEntries(fields.map((field) => [field.queryKey, ""])),
						);
						setAdditionalParams("");
						setSelectedOutput("JSON");
						setRunResult(null);
						setIsRunnerOpen(true);
					}}
				>
					<Play className="mr-2 h-4 w-4" />
					Run
				</Button>
			),
			className: "text-right",
			headerClassName: "text-right",
		},
	];

	if (reportsQuery.isLoading) {
		return (
			<PageShell
				title="Backend Reports"
				subtitle="Loading available backend report definitions..."
			>
				<ReportsTableSkeleton />
			</PageShell>
		);
	}

	if (reportsQuery.error) {
		return (
			<PageShell
				title="Backend Reports"
				subtitle="Run report outputs directly from backend report endpoints"
			>
				<Alert>
					<AlertTitle>Failed To Load Reports</AlertTitle>
					<AlertDescription>
						{reportsQuery.error instanceof Error
							? reportsQuery.error.message
							: "Could not fetch reports from backend"}
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	return (
		<PageShell
			title="Backend Reports"
			subtitle="Run report outputs directly from backend report endpoints"
		>
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Applicable Reports
								</span>
								<span className="text-2xl font-bold">
									{applicableReports.length.toLocaleString()}
								</span>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Categories
								</span>
								<span className="text-2xl font-bold">
									{categories.length.toLocaleString()}
								</span>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Filtered</span>
								<span className="text-2xl font-bold">
									{filteredReports.length.toLocaleString()}
								</span>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileBarChart2 className="h-5 w-5" />
							Report Catalog
						</CardTitle>
						<CardDescription>
							Select a report and execute it through backend report endpoints.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="report-search">Search Reports</Label>
								<div className="relative">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										id="report-search"
										placeholder="Search by name or category..."
										value={searchTerm}
										onChange={(event) => setSearchTerm(event.target.value)}
										className="pl-9"
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="category-filter">Category</Label>
								<Select
									value={categoryFilter}
									onValueChange={setCategoryFilter}
								>
									<SelectTrigger id="category-filter">
										<SelectValue placeholder="All Categories" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Categories</SelectItem>
										{categories.map((category) => (
											<SelectItem key={category} value={category}>
												{category}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<DataTable
							data={filteredReports}
							columns={reportColumns}
							getRowId={(report) =>
								String(
									report.id ||
										`${report.reportCategory || "report"}-${report.reportType || "type"}-${report.reportName || "name"}`,
								)
							}
							emptyMessage="No applicable backend reports found."
						/>
					</CardContent>
				</Card>
			</div>

			<Sheet open={isRunnerOpen} onOpenChange={setIsRunnerOpen}>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-2xl"
				>
					{selectedReport && (
						<div className="space-y-6">
							<SheetHeader>
								<SheetTitle>{selectedReport.reportName}</SheetTitle>
								<SheetDescription>
									Execute report output directly from backend endpoint.
								</SheetDescription>
							</SheetHeader>

							<div className="space-y-4">
								<div className="grid gap-3 rounded-sm border border-border/60 p-3 text-sm md:grid-cols-2">
									<div>
										<div className="text-xs text-muted-foreground">
											Category
										</div>
										<div className="font-medium">
											{selectedReport.reportCategory || "Uncategorized"}
										</div>
									</div>
									<div>
										<div className="text-xs text-muted-foreground">Type</div>
										<div className="font-medium">
											{selectedReport.reportType || "Unknown"}
										</div>
									</div>
								</div>

								<div className="space-y-2">
									<Label>Output</Label>
									<Select
										value={selectedOutput}
										onValueChange={(value) =>
											setSelectedOutput(value as ReportOutputType)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select output type" />
										</SelectTrigger>
										<SelectContent>
											{outputOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{availableExportsQuery.isLoading && (
										<Skeleton className="h-4 w-56" />
									)}
									{availableExportsQuery.error && (
										<p className="text-xs text-muted-foreground">
											Could not resolve export options from backend. JSON
											preview remains available.
										</p>
									)}
								</div>

								<div className="space-y-4">
									{selectedParameterFields.map((field) => (
										<div key={field.queryKey} className="space-y-2">
											<Label htmlFor={`param-${field.queryKey}`}>
												{field.label}
												{field.required ? " *" : ""}
											</Label>
											<Input
												id={`param-${field.queryKey}`}
												value={parameterValues[field.queryKey] || ""}
												onChange={(event) =>
													setParameterValues((previous) => ({
														...previous,
														[field.queryKey]: event.target.value,
													}))
												}
												placeholder={`${field.queryKey} (${field.dataType})`}
											/>
											{field.key !== field.queryKey && (
												<p className="text-xs text-muted-foreground">
													Source key: {field.key}
												</p>
											)}
										</div>
									))}

									<div className="space-y-2">
										<Label htmlFor="additional-params">
											Additional Query Parameters
										</Label>
										<Textarea
											id="additional-params"
											value={additionalParams}
											onChange={(event) =>
												setAdditionalParams(event.target.value)
											}
											placeholder="R_officeId=1&#10;R_fromDate=2026-01-01&#10;R_toDate=2026-01-31"
											className="min-h-28"
										/>
										<p className="text-xs text-muted-foreground">
											Use one key=value pair per line for parameters that are
											not listed in report metadata.
										</p>
									</div>
								</div>

								<div className="flex items-center justify-end gap-2 pt-2">
									<Button
										variant="outline"
										onClick={() => setIsRunnerOpen(false)}
										disabled={runReportMutation.isPending}
									>
										Cancel
									</Button>
									<Button
										onClick={() => runReportMutation.mutate()}
										disabled={runReportMutation.isPending}
									>
										{selectedOutput === "JSON" ? (
											<Play className="mr-2 h-4 w-4" />
										) : (
											<Download className="mr-2 h-4 w-4" />
										)}
										{runReportMutation.isPending
											? "Running..."
											: selectedOutput === "JSON"
												? "Run Preview"
												: "Run & Download"}
									</Button>
								</div>

								{runReportMutation.error && (
									<Alert variant="destructive">
										<AlertTitle>Report Execution Failed</AlertTitle>
										<AlertDescription>
											{runReportMutation.error instanceof Error
												? runReportMutation.error.message
												: "Unexpected error while running report"}
										</AlertDescription>
									</Alert>
								)}

								{selectedOutput === "JSON" && runResult && (
									<Card>
										<CardHeader>
											<CardTitle className="text-base">JSON Preview</CardTitle>
											<CardDescription>
												{previewRows.length.toLocaleString()} rows
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-3">
											{previewColumns.length === 0 ? (
												<pre className="max-h-72 overflow-auto rounded-sm border border-border/60 bg-muted/30 p-3 text-xs">
													{JSON.stringify(runResult, null, 2)}
												</pre>
											) : (
												<div className="rounded-sm border border-border/60">
													<Table>
														<TableHeader className="bg-muted/40">
															<TableRow>
																{previewColumns.map((column) => (
																	<TableHead key={column}>{column}</TableHead>
																))}
															</TableRow>
														</TableHeader>
														<TableBody>
															{previewRows.map((row, rowIndex) => (
																<TableRow key={`${rowIndex}`}>
																	{previewColumns.map((column, columnIndex) => (
																		<TableCell key={`${column}-${rowIndex}`}>
																			{getPreviewCellValue(
																				row,
																				column,
																				columnIndex,
																			)}
																		</TableCell>
																	))}
																</TableRow>
															))}
														</TableBody>
													</Table>
												</div>
											)}
										</CardContent>
									</Card>
								)}
							</div>
						</div>
					)}
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
