"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
	ArrowLeft,
	Download,
	FileJson,
	FileSpreadsheet,
	FileText,
	Play,
	RefreshCw,
	Settings2,
	TableProperties,
} from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/config/page-shell";
import { ReportContractTable } from "@/components/reports/report-contract-table";
import { ReportDetailSkeleton } from "@/components/reports/report-detail-skeleton";
import { ReportParameterFields } from "@/components/reports/report-parameter-fields";
import { ReportResultsPanel } from "@/components/reports/report-results-panel";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { findReportByRouteId } from "@/lib/fineract/report-route";
import {
	fetchReportAvailableExports,
	fetchReportParameterOptions,
	fetchReports,
	fetchReportsBranchMetadata,
	getMissingReportParameterDependencies,
	getReportParameterMetadata,
	type ReportExecutionResponse,
	type ReportExportTarget,
	type ReportParameter,
	type ReportParameterMetadata,
	type ReportParameterOption,
	runReport,
} from "@/lib/fineract/reports";
import {
	getErrorMessages,
	normalizeApiError,
} from "@/lib/fineract/ui-api-error";
import { useTenantStore } from "@/store/tenant";

const DEFAULT_EXPORT: ReportExportTarget = "JSON";

type ReportTabValue = "overview" | "run" | "contract" | "results";

interface ReportDetailPageProps {
	params: Promise<{ reportId: string }>;
}

function formatDateInput(date: Date) {
	return date.toISOString().split("T")[0] || "";
}

function getDefaultParameterValue(metadata: ReportParameterMetadata) {
	const today = new Date();

	if (metadata.requestKey === "endDate" || metadata.requestKey === "toDate") {
		return formatDateInput(today);
	}

	if (
		metadata.requestKey === "startDate" ||
		metadata.requestKey === "fromDate"
	) {
		const start = new Date(today);
		start.setDate(start.getDate() - 30);
		return formatDateInput(start);
	}

	if (metadata.requestKey === "ondate") {
		return formatDateInput(today);
	}

	return "";
}

function getExportLabel(exportTarget: ReportExportTarget) {
	switch (exportTarget) {
		case "JSON":
			return "JSON";
		case "PRETTY_JSON":
			return "Pretty JSON";
		case "CSV":
			return "CSV";
		case "PDF":
			return "PDF";
		case "S3":
			return "S3";
	}
}

function getExportIcon(exportTarget: ReportExportTarget) {
	switch (exportTarget) {
		case "JSON":
		case "PRETTY_JSON":
			return FileJson;
		case "CSV":
			return FileSpreadsheet;
		case "PDF":
		case "S3":
			return FileText;
	}
}

function buildParameterValueMap(
	parameters: ReportParameter[],
	formValues: Record<string, string>,
) {
	const values: Record<string, string> = {};

	for (const parameter of parameters) {
		const parameterName = parameter.parameterName || "";
		if (!parameterName) {
			continue;
		}

		const metadata = getReportParameterMetadata(parameter);
		values[metadata.requestKey] = formValues[parameterName] || "";
	}

	return values;
}

function getRequiredParameterGaps(
	parameters: ReportParameter[],
	formValues: Record<string, string>,
) {
	return parameters.flatMap((parameter) => {
		const parameterName = parameter.parameterName || "";
		if (!parameterName) {
			return [];
		}

		const value = formValues[parameterName] || "";
		if (value.trim().length > 0) {
			return [];
		}

		const metadata = getReportParameterMetadata(parameter);
		return [
			{
				parameterName,
				label: metadata.label,
			},
		];
	});
}

function triggerBrowserDownload(
	result: Extract<ReportExecutionResponse, { kind: "file" }>,
	reportName: string,
	exportTarget: ReportExportTarget,
) {
	const extension =
		exportTarget === "CSV" ? "csv" : exportTarget === "PDF" ? "pdf" : "bin";
	const fallbackName = `${reportName.replaceAll(/\s+/gu, "-").toLowerCase()}.${extension}`;
	const url = URL.createObjectURL(result.blob);
	const link = document.createElement("a");

	link.href = url;
	link.download = result.filename || fallbackName;
	document.body.append(link);
	link.click();
	link.remove();

	window.setTimeout(() => {
		URL.revokeObjectURL(url);
	}, 0);
}

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
	const { reportId } = use(params);
	const { tenantId } = useTenantStore();
	const [activeTab, setActiveTab] = useState<ReportTabValue>("overview");
	const [formValues, setFormValues] = useState<Record<string, string>>({});
	const [selectedExport, setSelectedExport] =
		useState<ReportExportTarget>(DEFAULT_EXPORT);
	const [executionResult, setExecutionResult] =
		useState<ReportExecutionResponse | null>(null);

	const reportsQuery = useQuery({
		queryKey: ["reports", tenantId],
		queryFn: () => fetchReports(tenantId),
		enabled: Boolean(tenantId),
		refetchOnWindowFocus: false,
	});

	const branchQuery = useQuery({
		queryKey: ["reports-branch-metadata", tenantId],
		queryFn: () => fetchReportsBranchMetadata(tenantId),
		enabled: Boolean(tenantId),
		refetchOnWindowFocus: false,
	});

	const reports = reportsQuery.data || [];
	const selectedReport = useMemo(
		() => findReportByRouteId(reports, reportId),
		[reports, reportId],
	);
	const selectedParameters = selectedReport?.reportParameters || [];

	const parameterValueMap = useMemo(
		() => buildParameterValueMap(selectedParameters, formValues),
		[selectedParameters, formValues],
	);

	const availableExportsQuery = useQuery({
		queryKey: [
			"report-available-exports",
			tenantId,
			selectedReport?.reportName,
		],
		queryFn: () =>
			fetchReportAvailableExports(tenantId, selectedReport?.reportName || ""),
		enabled: Boolean(tenantId && selectedReport?.reportName),
	});

	const parameterOptionsQuery = useQuery({
		queryKey: [
			"report-parameter-options",
			tenantId,
			selectedReport?.id ?? selectedReport?.reportName ?? null,
			parameterValueMap,
		],
		queryFn: async () => {
			const optionEntries = await Promise.all(
				selectedParameters.map(async (parameter) => {
					const parameterName = parameter.parameterName || "";
					const metadata = getReportParameterMetadata(parameter);

					if (!parameterName || metadata.optionSource !== "parameterType") {
						return [parameterName, []] as const;
					}

					if (
						getMissingReportParameterDependencies(metadata, parameterValueMap)
							.length > 0
					) {
						return [parameterName, []] as const;
					}

					const options = await fetchReportParameterOptions(
						tenantId,
						parameterName,
						parameterValueMap,
						{
							excludeRequestKey: metadata.requestKey,
						},
					);

					return [parameterName, options] as const;
				}),
			);

			return Object.fromEntries(optionEntries) as Record<
				string,
				ReportParameterOption[]
			>;
		},
		enabled: Boolean(
			tenantId &&
				selectedReport &&
				selectedParameters.some(
					(parameter) =>
						getReportParameterMetadata(parameter).optionSource ===
						"parameterType",
				),
		),
	});

	const runMutation = useMutation({
		mutationFn: (input: {
			reportName: string;
			values: Record<string, string>;
			exportTarget: ReportExportTarget;
			includeLocale?: boolean;
		}) =>
			runReport(tenantId, input.reportName, input.values, input.exportTarget, {
				includeLocale: input.includeLocale,
			}),
		onSuccess: (result, variables) => {
			if (result.kind === "file") {
				triggerBrowserDownload(
					result,
					variables.reportName,
					variables.exportTarget,
				);
				setExecutionResult(null);
				toast.success(
					`${variables.reportName} exported as ${getExportLabel(variables.exportTarget)}.`,
				);
				return;
			}

			setExecutionResult(result);
			setActiveTab("results");
			toast.success(`${variables.reportName} completed.`);
		},
		onError: (error) => {
			setExecutionResult(null);
			setActiveTab("run");
			console.error("report-run-error", normalizeApiError(error));
		},
	});

	useEffect(() => {
		if (!selectedReport) {
			return;
		}

		const defaults: Record<string, string> = {};

		for (const parameter of selectedParameters) {
			const parameterName = parameter.parameterName || "";
			if (!parameterName) {
				continue;
			}

			defaults[parameterName] = getDefaultParameterValue(
				getReportParameterMetadata(parameter),
			);
		}

		setFormValues(defaults);
		setSelectedExport(DEFAULT_EXPORT);
		setExecutionResult(null);
		setActiveTab("overview");
	}, [selectedReport, selectedParameters]);

	useEffect(() => {
		const allowedExports = availableExportsQuery.data;
		if (!allowedExports || allowedExports.length === 0) {
			setSelectedExport(DEFAULT_EXPORT);
			return;
		}

		if (!allowedExports.includes(selectedExport)) {
			setSelectedExport(allowedExports[0] || DEFAULT_EXPORT);
		}
	}, [availableExportsQuery.data, selectedExport]);

	const availableExports =
		availableExportsQuery.data && availableExportsQuery.data.length > 0
			? availableExportsQuery.data
			: [DEFAULT_EXPORT];
	const parameterOptions = parameterOptionsQuery.data || {};
	const missingRequiredParameters = getRequiredParameterGaps(
		selectedParameters,
		formValues,
	);
	const reportLoadError = reportsQuery.error
		? normalizeApiError(reportsQuery.error)
		: null;
	const runError = runMutation.error
		? normalizeApiError(runMutation.error)
		: null;
	const branchMetadata =
		(branchQuery.data as {
			note?: string;
			legacyOutputTypeSupported?: boolean;
		}) || null;
	const reportNotFound =
		!reportsQuery.isLoading &&
		!reportLoadError &&
		reports.length > 0 &&
		selectedReport === null;

	const executeSelectedReport = () => {
		if (!selectedReport?.reportName) {
			return;
		}

		if (missingRequiredParameters.length > 0) {
			setActiveTab("run");
			return;
		}

		runMutation.mutate({
			reportName: selectedReport.reportName,
			values: parameterValueMap,
			exportTarget: selectedExport,
			includeLocale: selectedReport.reportType?.trim() === "Pentaho",
		});
	};

	if (reportsQuery.isLoading && reports.length === 0) {
		return (
			<PageShell
				title="Report Details"
				subtitle="Inspect the report definition, run exports, and review the latest result."
				actions={
					<Button variant="outline" asChild>
						<Link href="/config/operations/reports">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Reports
						</Link>
					</Button>
				}
			>
				<ReportDetailSkeleton />
			</PageShell>
		);
	}

	return (
		<PageShell
			title={selectedReport?.reportName || "Report Details"}
			subtitle="Inspect the report definition, run exports, and review the latest result."
			actions={
				<Button variant="outline" asChild>
					<Link href="/config/operations/reports">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Reports
					</Link>
				</Button>
			}
		>
			<div className="space-y-6">
				{reportLoadError ? (
					<Alert variant="destructive">
						<AlertTitle>Unable to load reports</AlertTitle>
						<AlertDescription>{reportLoadError.message}</AlertDescription>
					</Alert>
				) : null}

				{reportNotFound ? (
					<Alert variant="destructive">
						<AlertTitle>Report not found</AlertTitle>
						<AlertDescription>
							The selected report definition is not available in the current
							tenant catalog.
						</AlertDescription>
					</Alert>
				) : null}

				{selectedReport ? (
					<>
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
							<Card>
								<CardContent className="pt-6">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
											<FileText className="h-5 w-5 text-primary" />
										</div>
										<div>
											<div className="text-2xl font-bold">
												{selectedReport.id || "—"}
											</div>
											<div className="text-sm text-muted-foreground">
												Report ID
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="pt-6">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-success/10">
											<Settings2 className="h-5 w-5 text-success" />
										</div>
										<div>
											<div className="text-2xl font-bold">
												{selectedParameters.length}
											</div>
											<div className="text-sm text-muted-foreground">
												Runtime parameters
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="pt-6">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-info/10">
											<TableProperties className="h-5 w-5 text-info" />
										</div>
										<div>
											<div className="text-2xl font-bold">
												{availableExports.length}
											</div>
											<div className="text-sm text-muted-foreground">
												Available exports
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="pt-6">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-warning/10">
											<Play className="h-5 w-5 text-warning" />
										</div>
										<div>
											<div className="text-sm font-semibold">
												{selectedReport.useReport === false
													? "Disabled"
													: "Ready to run"}
											</div>
											<div className="text-sm text-muted-foreground">
												Service availability
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						<Tabs
							value={activeTab}
							onValueChange={(value) => setActiveTab(value as ReportTabValue)}
						>
							<TabsList className="grid w-full grid-cols-4">
								<TabsTrigger value="overview">Overview</TabsTrigger>
								<TabsTrigger value="run">Run Report</TabsTrigger>
								<TabsTrigger value="contract">Contract</TabsTrigger>
								<TabsTrigger value="results">Results</TabsTrigger>
							</TabsList>

							<TabsContent value="overview" className="mt-6">
								<Card>
									<CardHeader>
										<CardTitle>Report Overview</CardTitle>
										<CardDescription>
											Review the catalog metadata before you execute the report.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-6">
										<div className="flex flex-wrap gap-2">
											<Badge variant="secondary">
												{selectedReport.reportType?.trim() || "Unknown"}
											</Badge>
											<Badge variant="outline">
												{selectedReport.reportCategory?.trim() ||
													"Uncategorized"}
											</Badge>
											{selectedReport.reportSubType ? (
												<Badge variant="outline">
													{selectedReport.reportSubType}
												</Badge>
											) : null}
											<Badge
												variant={
													selectedReport.useReport === false
														? "warning"
														: "success"
												}
											>
												{selectedReport.useReport === false
													? "Disabled in service"
													: "Runnable"}
											</Badge>
											{selectedReport.coreReport ? (
												<Badge variant="outline">Core report</Badge>
											) : null}
										</div>

										<div className="rounded-sm border border-border/60 p-4 text-sm text-muted-foreground">
											{selectedReport.description?.trim()
												? selectedReport.description
												: "No description was provided for this report definition."}
										</div>

										<div className="grid gap-4 md:grid-cols-2">
											<div className="rounded-sm border border-border/60 p-4">
												<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Category
												</div>
												<div className="mt-2 text-sm font-medium">
													{selectedReport.reportCategory?.trim() ||
														"Uncategorized"}
												</div>
											</div>
											<div className="rounded-sm border border-border/60 p-4">
												<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Report Type
												</div>
												<div className="mt-2 text-sm font-medium">
													{selectedReport.reportType?.trim() || "Unknown"}
												</div>
											</div>
										</div>

										{selectedReport.reportType === "Pentaho" &&
										branchMetadata?.legacyOutputTypeSupported === false ? (
											<Alert>
												<AlertTitle>Pentaho export behavior</AlertTitle>
												<AlertDescription>
													{branchMetadata.note ||
														"This branch ignores legacy output-type values and relies on dedicated export flags only."}
												</AlertDescription>
											</Alert>
										) : null}
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="run" className="mt-6">
								<Card>
									<CardHeader>
										<CardTitle>Run Report</CardTitle>
										<CardDescription>
											Each field maps directly to the report service&apos;s `R_`
											parameter contract. All runtime parameters are required.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-6">
										<div className="flex flex-wrap items-center justify-end gap-2">
											<Button
												type="button"
												variant="outline"
												onClick={() => {
													if (selectedReport.reportName) {
														void availableExportsQuery.refetch();
													}
													void parameterOptionsQuery.refetch();
												}}
											>
												<RefreshCw className="mr-2 h-4 w-4" />
												Refresh Lookups
											</Button>
										</div>

										<div className="space-y-2">
											<Label>Export target</Label>
											<Select
												value={selectedExport}
												onValueChange={(value) =>
													setSelectedExport(value as ReportExportTarget)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select export target" />
												</SelectTrigger>
												<SelectContent>
													{availableExports.map((exportTarget) => {
														const ExportIcon = getExportIcon(exportTarget);
														return (
															<SelectItem
																key={exportTarget}
																value={exportTarget}
															>
																<div className="flex items-center gap-2">
																	<ExportIcon className="h-4 w-4" />
																	<span>{getExportLabel(exportTarget)}</span>
																</div>
															</SelectItem>
														);
													})}
												</SelectContent>
											</Select>
										</div>

										{selectedReport.useReport === false ? (
											<Alert>
												<AlertTitle>Report is disabled</AlertTitle>
												<AlertDescription>
													This definition is present in the catalog but is not
													runnable in the report service.
												</AlertDescription>
											</Alert>
										) : null}

										{selectedParameters.length === 0 ? (
											<div className="rounded-sm border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
												This report does not declare any runtime parameters.
											</div>
										) : (
											<ReportParameterFields
												parameters={selectedParameters}
												formValues={formValues}
												requestValues={parameterValueMap}
												onValueChange={(parameterName, value) =>
													setFormValues((current) => ({
														...current,
														[parameterName]: value,
													}))
												}
												parameterOptions={parameterOptions}
												isLoadingOptions={parameterOptionsQuery.isLoading}
											/>
										)}

										{missingRequiredParameters.length > 0 ? (
											<Alert>
												<AlertTitle>Required parameters missing</AlertTitle>
												<AlertDescription className="space-y-2">
													<div>
														Complete every runtime parameter before running this
														report.
													</div>
													<ul className="list-disc pl-5 text-sm">
														{missingRequiredParameters.map((parameter) => (
															<li key={parameter.parameterName}>
																{parameter.label}
															</li>
														))}
													</ul>
												</AlertDescription>
											</Alert>
										) : null}

										{parameterOptionsQuery.error ? (
											<Alert>
												<AlertTitle>Parameter lookup fallback</AlertTitle>
												<AlertDescription>
													Some lookup lists could not be resolved automatically.
													Manual input is still available for affected
													parameters.
												</AlertDescription>
											</Alert>
										) : null}

										{runError ? (
											<Alert variant="destructive">
												<AlertTitle>Report execution failed</AlertTitle>
												<AlertDescription className="space-y-2">
													<div>{runError.message}</div>
													{getErrorMessages(runError).length > 0 ? (
														<ul className="list-disc pl-5 text-sm">
															{getErrorMessages(runError).map((message) => (
																<li key={message}>{message}</li>
															))}
														</ul>
													) : null}
												</AlertDescription>
											</Alert>
										) : null}

										<div className="flex flex-wrap items-center justify-end gap-2">
											<Button
												type="button"
												variant="outline"
												onClick={() => {
													const resetValues: Record<string, string> = {};

													for (const parameter of selectedParameters) {
														const parameterName = parameter.parameterName || "";
														if (!parameterName) {
															continue;
														}

														resetValues[parameterName] =
															getDefaultParameterValue(
																getReportParameterMetadata(parameter),
															);
													}

													setFormValues(resetValues);
													setExecutionResult(null);
												}}
											>
												Reset Parameters
											</Button>
											<Button
												type="button"
												onClick={executeSelectedReport}
												disabled={
													runMutation.isPending ||
													selectedReport.useReport === false ||
													missingRequiredParameters.length > 0
												}
											>
												{selectedExport === "JSON" ||
												selectedExport === "PRETTY_JSON" ? (
													<Play className="mr-2 h-4 w-4" />
												) : (
													<Download className="mr-2 h-4 w-4" />
												)}
												{selectedExport === "JSON" ||
												selectedExport === "PRETTY_JSON"
													? "Run Report"
													: `Export ${getExportLabel(selectedExport)}`}
											</Button>
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="contract" className="mt-6">
								<Card>
									<CardHeader>
										<CardTitle>Parameter Contract</CardTitle>
										<CardDescription>
											Structured definitions generated from the report metadata
											and parameter mapping.
										</CardDescription>
									</CardHeader>
									<CardContent>
										<ReportContractTable parameters={selectedParameters} />
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="results" className="mt-6">
								<ReportResultsPanel
									isPending={runMutation.isPending}
									result={executionResult}
									selectedExport={selectedExport}
								/>
							</TabsContent>
						</Tabs>
					</>
				) : null}
			</div>
		</PageShell>
	);
}
