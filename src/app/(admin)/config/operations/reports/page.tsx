"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Download,
	FileJson,
	FileSpreadsheet,
	FileText,
	Filter,
	Pencil,
	Play,
	Plus,
	RefreshCw,
	Search,
	Trash2,
} from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import {
	createReportDefinition,
	deleteReportDefinition,
	fetchReportById,
	fetchReportAvailableExports,
	fetchReportParameterOptions,
	fetchReports,
	fetchReportsBranchMetadata,
	fetchReportsTemplate,
	getReportParameterMetadata,
	isStructuredReportPayload,
	normalizeResultsetRows,
	type ReportDefinition,
	type ReportExecutionResponse,
	type ReportExportTarget,
	type ReportParameter,
	type ReportParameterMetadata,
	type ReportParameterOption,
	type ReportUpsertPayload,
	runReport,
	updateReportDefinition,
} from "@/lib/fineract/reports";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import {
	getSubmitFieldError,
	toSubmitActionError,
} from "@/lib/fineract/submit-error";
import {
	getErrorMessages,
	normalizeApiError,
} from "@/lib/fineract/ui-api-error";
import { useTenantStore } from "@/store/tenant";

const ALL_FILTER = "__ALL__";
const DEFAULT_EXPORT: ReportExportTarget = "JSON";
const EMPTY_REPORT_TYPES: string[] = [];
const EMPTY_TEMPLATE_PARAMETERS: ReportParameter[] = [];

type VisibilityFilter = "runnable" | "all";

function formatDateInput(date: Date) {
	return date.toISOString().split("T")[0] || "";
}

function getDefaultParameterValue(metadata: ReportParameterMetadata) {
	const today = new Date();

	if (metadata.allowAll && metadata.allValue) {
		return metadata.allValue;
	}

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

function groupReportsByCategory(reports: ReportDefinition[]) {
	const grouped = new Map<string, ReportDefinition[]>();

	for (const report of reports) {
		const category = report.reportCategory?.trim() || "Uncategorized";
		const existing = grouped.get(category) || [];
		existing.push(report);
		grouped.set(category, existing);
	}

	return Array.from(grouped.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([category, items]) => ({
			category,
			items: items.sort((left, right) =>
				(left.reportName || "").localeCompare(right.reportName || ""),
			),
		}));
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

type ReportEditorValues = {
	reportName: string;
	reportType: string;
	reportSubType: string;
	reportCategory: string;
	description: string;
	reportSql: string;
	useReport: boolean;
	reportParameterIds: number[];
};

const REPORT_TYPES_REQUIRING_SQL = new Set(["Table", "Chart"]);
const CHART_SUBTYPES = ["Bar", "Pie"];

function getParameterId(parameter: ReportParameter) {
	if (typeof parameter.parameterId === "number") {
		return parameter.parameterId;
	}

	return typeof parameter.id === "number" ? parameter.id : undefined;
}

function createEmptyReportEditorValues(
	templateReportType?: string,
): ReportEditorValues {
	return {
		reportName: "",
		reportType: templateReportType || "",
		reportSubType: "",
		reportCategory: "",
		description: "",
		reportSql: "",
		useReport: true,
		reportParameterIds: [],
	};
}

function createReportEditorValues(
	report: ReportDefinition | null | undefined,
	defaultReportType?: string,
): ReportEditorValues {
	if (!report) {
		return createEmptyReportEditorValues(defaultReportType);
	}

	return {
		reportName: report.reportName || "",
		reportType: report.reportType || defaultReportType || "",
		reportSubType: report.reportSubType || "",
		reportCategory: report.reportCategory || "",
		description: report.description || "",
		reportSql: report.reportSql || "",
		useReport: report.useReport !== false,
		reportParameterIds: (report.reportParameters || [])
			.map((parameter) => getParameterId(parameter))
			.filter((parameterId): parameterId is number => typeof parameterId === "number"),
	};
}

function buildReportDefinitionPayload(
	values: ReportEditorValues,
	isCoreReport: boolean,
): ReportUpsertPayload {
	if (isCoreReport) {
		return {
			useReport: values.useReport,
		};
	}

	const trimmedReportType = values.reportType.trim();
	const isChartReport = trimmedReportType === "Chart";
	const requiresSql = REPORT_TYPES_REQUIRING_SQL.has(trimmedReportType);

	return {
		reportName: values.reportName.trim(),
		reportType: trimmedReportType || undefined,
		reportSubType: isChartReport
			? values.reportSubType.trim() || undefined
			: undefined,
		reportCategory: values.reportCategory.trim() || undefined,
		description: values.description.trim() || undefined,
		reportSql: requiresSql ? values.reportSql.trim() || undefined : undefined,
		useReport: values.useReport,
		reportParameters: values.reportParameterIds.map((parameterId) => ({
			parameterId,
		})),
	};
}

function ResultsSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Skeleton className="h-5 w-36" />
				</CardTitle>
				<CardDescription>
					<Skeleton className="h-4 w-72" />
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="rounded-sm border border-border/60">
					<div className="grid grid-cols-4 gap-3 border-b border-border/60 bg-muted/40 px-3 py-2">
						{Array.from({ length: 4 }).map((_, index) => (
							<Skeleton key={`header-${index}`} className="h-4 w-20" />
						))}
					</div>
					<div className="divide-y divide-border/60">
						{Array.from({ length: 8 }).map((_, rowIndex) => (
							<div
								key={`row-${rowIndex}`}
								className="grid grid-cols-4 gap-3 px-3 py-3"
							>
								{Array.from({ length: 4 }).map((_, columnIndex) => (
									<Skeleton
										key={`cell-${rowIndex}-${columnIndex}`}
										className="h-4 w-full"
									/>
								))}
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function ReportsPageSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={`summary-${index}`}>
						<CardContent className="pt-6">
							<div className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-8 w-20" />
								<Skeleton className="h-3 w-32" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
				<Card>
					<CardHeader>
						<CardTitle>
							<Skeleton className="h-5 w-36" />
						</CardTitle>
						<CardDescription>
							<Skeleton className="h-4 w-48" />
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						{Array.from({ length: 6 }).map((_, index) => (
							<Card key={`report-${index}`}>
								<CardContent className="space-y-3 pt-4">
									<Skeleton className="h-4 w-48" />
									<Skeleton className="h-3 w-full" />
									<Skeleton className="h-3 w-40" />
								</CardContent>
							</Card>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>
							<Skeleton className="h-5 w-40" />
						</CardTitle>
						<CardDescription>
							<Skeleton className="h-4 w-64" />
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{Array.from({ length: 4 }).map((_, index) => (
							<div key={`field-${index}`} className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-10 w-full" />
							</div>
						))}
						<Skeleton className="h-10 w-40" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default function ReportsPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER);
	const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
	const [visibilityFilter, setVisibilityFilter] =
		useState<VisibilityFilter>("runnable");
	const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
	const [formValues, setFormValues] = useState<Record<string, string>>({});
	const [selectedExport, setSelectedExport] =
		useState<ReportExportTarget>(DEFAULT_EXPORT);
	const [executionResult, setExecutionResult] =
		useState<ReportExecutionResponse | null>(null);
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingReportId, setEditingReportId] = useState<number | null>(null);
	const [reportEditorValues, setReportEditorValues] = useState<ReportEditorValues>(
		createEmptyReportEditorValues(),
	);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(null);
	const deferredSearchTerm = useDeferredValue(searchTerm);

	const reportsQuery = useQuery({
		queryKey: ["reports", tenantId],
		queryFn: () => fetchReports(tenantId),
		enabled: Boolean(tenantId),
	});

	const templateQuery = useQuery({
		queryKey: ["reports-template", tenantId],
		queryFn: () => fetchReportsTemplate(tenantId),
		enabled: Boolean(tenantId),
	});

	const branchQuery = useQuery({
		queryKey: ["reports-branch-metadata", tenantId],
		queryFn: () => fetchReportsBranchMetadata(tenantId),
		enabled: Boolean(tenantId),
	});

	const reports = reportsQuery.data || [];
	const template = templateQuery.data;
	const allowedReportTypes =
		template?.allowedReportTypes ?? EMPTY_REPORT_TYPES;
	const allowedTemplateParameters =
		template?.allowedParameters ?? EMPTY_TEMPLATE_PARAMETERS;

	const editingReportDetailQuery = useQuery({
		queryKey: ["report-detail", tenantId, editingReportId],
		queryFn: () => fetchReportById(tenantId, Number(editingReportId)),
		enabled: Boolean(tenantId && isEditorOpen && editingReportId !== null),
	});

	const selectedReport =
		reports.find((report) => report.id === selectedReportId) || null;
	const selectedParameters = selectedReport?.reportParameters || [];
	const parameterValueMap = buildParameterValueMap(
		selectedParameters,
		formValues,
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
			selectedReport?.id,
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

					const options = await fetchReportParameterOptions(
						tenantId,
						parameterName,
						parameterValueMap,
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
		}) =>
			runReport(tenantId, input.reportName, input.values, input.exportTarget),
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
			toast.success(`${variables.reportName} completed.`);
		},
		onError: (error) => {
			setExecutionResult(null);
			console.error("report-run-error", normalizeApiError(error));
		},
	});

	const createMutation = useMutation({
		mutationFn: (payload: ReportUpsertPayload) =>
			createReportDefinition(tenantId, payload),
		onSuccess: async (result) => {
			await queryClient.invalidateQueries({
				queryKey: ["reports", tenantId],
			});
			await queryClient.invalidateQueries({
				queryKey: ["reports-template", tenantId],
			});
			setSubmitError(null);
			setIsEditorOpen(false);
			if (typeof result.resourceId === "number") {
				setSelectedReportId(result.resourceId);
			}
			toast.success("Report created successfully.");
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "createReport",
					endpoint: BFF_ROUTES.reports,
					method: "POST",
					tenantId,
				}),
			);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (payload: ReportUpsertPayload) =>
			updateReportDefinition(tenantId, Number(editingReportId), payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["reports", tenantId],
			});
			await queryClient.invalidateQueries({
				queryKey: ["report-detail", tenantId, editingReportId],
			});
			setSubmitError(null);
			setIsEditorOpen(false);
			toast.success("Report updated successfully.");
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "updateReport",
					endpoint: BFF_ROUTES.reportById(editingReportId || 0),
					method: "PUT",
					tenantId,
				}),
			);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => deleteReportDefinition(tenantId, Number(editingReportId)),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["reports", tenantId],
			});
			setSubmitError(null);
			setIsDeleteDialogOpen(false);
			setIsEditorOpen(false);
			if (selectedReportId === editingReportId) {
				setSelectedReportId(null);
			}
			toast.success("Report deleted successfully.");
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "deleteReport",
					endpoint: BFF_ROUTES.reportById(editingReportId || 0),
					method: "DELETE",
					tenantId,
				}),
			);
			setIsDeleteDialogOpen(false);
		},
	});

	useEffect(() => {
		if (selectedReportId || reports.length === 0) {
			return;
		}

		const defaultReport =
			reports.find((report) => report.useReport !== false) ||
			reports[0] ||
			null;
		setSelectedReportId(defaultReport?.id || null);
	}, [reports, selectedReportId]);

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
		setExecutionResult(null);
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

	useEffect(() => {
		if (!isEditorOpen || editingReportId === null || !editingReportDetailQuery.data) {
			return;
		}

		setReportEditorValues(
			createReportEditorValues(
				editingReportDetailQuery.data,
				allowedReportTypes[0],
			),
		);
	}, [
		allowedReportTypes,
		editingReportDetailQuery.data,
		editingReportId,
		isEditorOpen,
	]);

	const handleEditorOpenChange = (open: boolean) => {
		setIsEditorOpen(open);
		if (!open) {
			setEditingReportId(null);
			setSubmitError(null);
			setIsDeleteDialogOpen(false);
			setReportEditorValues(createEmptyReportEditorValues(allowedReportTypes[0]));
		}
	};

	const updateEditorField = <Field extends keyof ReportEditorValues>(
		field: Field,
		value: ReportEditorValues[Field],
	) => {
		setReportEditorValues((current) => {
			const next = {
				...current,
				[field]: value,
			};

			if (field === "reportType") {
				const reportType = String(value).trim();
				if (reportType !== "Chart") {
					next.reportSubType = "";
				}
				if (!REPORT_TYPES_REQUIRING_SQL.has(reportType)) {
					next.reportSql = "";
				}
			}

			return next;
		});
	};

	const toggleReportParameter = (parameterId: number, checked: boolean) => {
		setReportEditorValues((current) => ({
			...current,
			reportParameterIds: checked
				? [...new Set([...current.reportParameterIds, parameterId])]
				: current.reportParameterIds.filter((item) => item !== parameterId),
		}));
	};

	const handleOpenCreateEditor = () => {
		setEditingReportId(null);
		setSubmitError(null);
		setIsDeleteDialogOpen(false);
		setReportEditorValues(createEmptyReportEditorValues(allowedReportTypes[0]));
		setIsEditorOpen(true);
	};

	const handleOpenEditEditor = () => {
		if (selectedReport?.id === undefined) {
			return;
		}

		setEditingReportId(selectedReport.id);
		setSubmitError(null);
		setIsDeleteDialogOpen(false);
		setReportEditorValues(
			createReportEditorValues(selectedReport, allowedReportTypes[0]),
		);
		setIsEditorOpen(true);
	};

	const handleSubmitReportDefinition = () => {
		setSubmitError(null);

		const payload = buildReportDefinitionPayload(
			reportEditorValues,
			Boolean(editingReportDetailQuery.data?.coreReport),
		);

		if (editingReportId === null) {
			createMutation.mutate(payload);
			return;
		}

		updateMutation.mutate(payload);
	};

	const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
	const filteredReports = reports.filter((report) => {
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
	});

	const groupedReports = groupReportsByCategory(filteredReports);
	const categories = Array.from(
		new Set(
			reports.map((report) => report.reportCategory?.trim() || "Uncategorized"),
		),
	).sort((left, right) => left.localeCompare(right));
	const reportTypes = Array.from(
		new Set(reports.map((report) => report.reportType?.trim() || "Unknown")),
	).sort((left, right) => left.localeCompare(right));
	const runnableCount = reports.filter(
		(report) => report.useReport !== false,
	).length;
	const parameterizedCount = reports.filter(
		(report) => (report.reportParameters?.length || 0) > 0,
	).length;
	const allowedTypes = template?.allowedReportTypes?.length || 0;
	const parameterCatalogCount = template?.allowedParameters?.length || 0;
	const branchMetadata =
		(branchQuery.data as {
			note?: string;
			legacyOutputTypeSupported?: boolean;
		}) || null;
	const availableExports =
		availableExportsQuery.data && availableExportsQuery.data.length > 0
			? availableExportsQuery.data
			: [DEFAULT_EXPORT];
	const parameterOptions = parameterOptionsQuery.data || {};
	const runError = runMutation.error
		? normalizeApiError(runMutation.error)
		: null;
	const reportLoadError = reportsQuery.error
		? normalizeApiError(reportsQuery.error)
		: null;
	const templateLoadError = templateQuery.error
		? normalizeApiError(templateQuery.error)
		: null;
	const isEditingReport = editingReportId !== null;
	const editingReport = editingReportDetailQuery.data || selectedReport;
	const isCoreEditingReport = Boolean(editingReport?.coreReport);
	const isSavingReport =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending;
	const selectedDefinitionPayload = buildReportDefinitionPayload(
		reportEditorValues,
		isCoreEditingReport,
	);
	const reportNameFieldError = getSubmitFieldError(submitError, "reportName");
	const reportTypeFieldError = getSubmitFieldError(submitError, "reportType");
	const reportSubTypeFieldError = getSubmitFieldError(
		submitError,
		"reportSubType",
	);
	const reportCategoryFieldError = getSubmitFieldError(
		submitError,
		"reportCategory",
	);
	const descriptionFieldError = getSubmitFieldError(submitError, "description");
	const reportSqlFieldError = getSubmitFieldError(submitError, "reportSql");
	const reportParametersFieldError = getSubmitFieldError(
		submitError,
		"reportParameters",
	);

	const executeSelectedReport = () => {
		if (!selectedReport?.reportName) {
			return;
		}

		runMutation.mutate({
			reportName: selectedReport.reportName,
			values: parameterValueMap,
			exportTarget: selectedExport,
		});
	};

	if (
		(reportsQuery.isLoading || templateQuery.isLoading) &&
		reports.length === 0
	) {
		return (
			<PageShell
				title="Reports"
				subtitle="Discover report definitions, fill parameter contracts, and execute exports using the branch-safe datatable report service."
			>
				<ReportsPageSkeleton />
			</PageShell>
		);
	}

	return (
		<PageShell
			title="Reports"
			subtitle="Discover report definitions, fill parameter contracts, and execute exports using the branch-safe datatable report service."
			actions={
				<div className="flex flex-wrap items-center gap-2">
					<Button type="button" onClick={handleOpenCreateEditor}>
						<Plus className="mr-2 h-4 w-4" />
						Create Report
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							reportsQuery.refetch();
							templateQuery.refetch();
							if (selectedReport?.reportName) {
								availableExportsQuery.refetch();
							}
							if (selectedReport?.id) {
								parameterOptionsQuery.refetch();
							}
						}}
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						Refresh Catalog
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
									<div className="text-2xl font-bold">
										{parameterCatalogCount}
									</div>
									<div className="text-sm text-muted-foreground">
										Allowed parameters across {allowedTypes} report types
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{branchMetadata?.legacyOutputTypeSupported === false && (
					<Alert>
						<AlertTitle>Branch export behavior</AlertTitle>
						<AlertDescription>
							{branchMetadata.note ||
								"This branch uses datatable export flags only. JSON is default; PRETTY_JSON maps to pretty=true; CSV, PDF, and optional S3 use their dedicated export flags."}
						</AlertDescription>
					</Alert>
				)}

				{reportLoadError && (
					<Alert variant="destructive">
						<AlertTitle>Unable to load reports</AlertTitle>
						<AlertDescription>{reportLoadError.message}</AlertDescription>
					</Alert>
				)}

				{templateLoadError && (
					<Alert variant="destructive">
						<AlertTitle>Unable to load report template</AlertTitle>
						<AlertDescription>{templateLoadError.message}</AlertDescription>
					</Alert>
				)}

				<div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Filter className="h-5 w-5" />
									Catalog Filters
								</CardTitle>
								<CardDescription>
									Search the report registry by name, category, or delivery
									type.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<Tabs
									value={visibilityFilter}
									onValueChange={(value) =>
										setVisibilityFilter(value as VisibilityFilter)
									}
								>
									<TabsList className="grid w-full grid-cols-2">
										<TabsTrigger value="runnable">Runnable</TabsTrigger>
										<TabsTrigger value="all">All Definitions</TabsTrigger>
									</TabsList>
								</Tabs>

								<div className="space-y-2">
									<Label htmlFor="report-search">Search</Label>
									<div className="relative">
										<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											id="report-search"
											value={searchTerm}
											onChange={(event) => setSearchTerm(event.target.value)}
											placeholder="Search reports, categories, and descriptions"
											className="pl-8"
										/>
									</div>
								</div>

								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label>Category</Label>
										<Select
											value={categoryFilter}
											onValueChange={setCategoryFilter}
										>
											<SelectTrigger>
												<SelectValue placeholder="All categories" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={ALL_FILTER}>
													All categories
												</SelectItem>
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
										<Select value={typeFilter} onValueChange={setTypeFilter}>
											<SelectTrigger>
												<SelectValue placeholder="All report types" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={ALL_FILTER}>
													All report types
												</SelectItem>
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
									{filteredReports.length} reports match the current filters.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{groupedReports.length === 0 ? (
									<div className="rounded-sm border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
										No reports match the current filters.
									</div>
								) : (
									groupedReports.map((group) => (
										<div key={group.category} className="space-y-3">
											<div className="flex items-center justify-between">
												<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
													{group.category}
												</h3>
												<Badge variant="outline">{group.items.length}</Badge>
											</div>
											<div className="space-y-3">
												{group.items.map((report) => {
													const isSelected = report.id === selectedReport?.id;
													return (
														<Card
															key={report.id || report.reportName}
															role="button"
															tabIndex={0}
															onClick={() =>
																setSelectedReportId(report.id || null)
															}
															onKeyDown={(event) => {
																if (
																	event.key === "Enter" ||
																	event.key === " "
																) {
																	event.preventDefault();
																	setSelectedReportId(report.id || null);
																}
															}}
															className={
																isSelected
																	? "border-primary shadow-sm"
																	: "border-border/60"
															}
														>
															<CardContent className="space-y-3 pt-4">
																<div className="flex flex-wrap items-start justify-between gap-3">
																	<div className="space-y-1">
																		<div className="font-medium">
																			{report.reportName || "Unnamed report"}
																		</div>
																		<div className="text-xs text-muted-foreground">
																			ID {report.id || "—"}
																		</div>
																	</div>
																	<div className="flex flex-wrap gap-2">
																		<Badge variant="secondary">
																			{report.reportType || "Unknown"}
																		</Badge>
																		<Badge
																			variant={
																				report.useReport === false
																					? "warning"
																					: "success"
																			}
																		>
																			{report.useReport === false
																				? "Disabled"
																				: "Runnable"}
																		</Badge>
																		{report.coreReport ? (
																			<Badge variant="outline">Core</Badge>
																		) : null}
																	</div>
																</div>

																<div className="text-sm text-muted-foreground">
																	{report.description?.trim()
																		? report.description
																		: "No description provided for this report definition."}
																</div>

																<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
																	<span>
																		Parameters:{" "}
																		{report.reportParameters?.length || 0}
																	</span>
																	{report.reportSubType ? (
																		<span>Subtype: {report.reportSubType}</span>
																	) : null}
																</div>
															</CardContent>
														</Card>
													);
												})}
											</div>
										</div>
									))
								)}
							</CardContent>
						</Card>
					</div>

					<div className="space-y-6">
						{selectedReport ? (
							<>
								<Card>
									<CardHeader>
										<CardTitle>
											{selectedReport.reportName || "Report details"}
										</CardTitle>
										<CardDescription>
											{selectedReport.description?.trim()
												? selectedReport.description
												: "No description provided. Use the parameter contract below to run the report safely."}
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="flex flex-wrap gap-2">
											<Badge variant="secondary">
												{selectedReport.reportType || "Unknown"}
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
													: "Ready to run"}
											</Badge>
										</div>

										<div className="flex flex-wrap items-center justify-end gap-2">
											<Button
												type="button"
												variant="outline"
												onClick={handleOpenEditEditor}
												disabled={selectedReport.id === undefined}
											>
												<Pencil className="mr-2 h-4 w-4" />
												Manage Definition
											</Button>
										</div>

										{selectedReport.reportType === "Pentaho" && (
											<Alert>
												<AlertTitle>Pentaho note</AlertTitle>
												<AlertDescription>
													Legacy `output-type` values are intentionally ignored
													on this branch. This page uses datatable export flags
													only.
												</AlertDescription>
											</Alert>
										)}

										<div className="grid gap-4 md:grid-cols-3">
											<div className="rounded-sm border border-border/60 p-3">
												<div className="text-xs uppercase tracking-wide text-muted-foreground">
													Report ID
												</div>
												<div className="mt-1 text-base font-medium">
													{selectedReport.id || "—"}
												</div>
											</div>
											<div className="rounded-sm border border-border/60 p-3">
												<div className="text-xs uppercase tracking-wide text-muted-foreground">
													Parameters
												</div>
												<div className="mt-1 text-base font-medium">
													{selectedParameters.length}
												</div>
											</div>
											<div className="rounded-sm border border-border/60 p-3">
												<div className="text-xs uppercase tracking-wide text-muted-foreground">
													Available Exports
												</div>
												<div className="mt-1 flex flex-wrap gap-2">
													{availableExports.map((exportTarget) => (
														<Badge key={exportTarget} variant="outline">
															{getExportLabel(exportTarget)}
														</Badge>
													))}
												</div>
											</div>
										</div>

										{selectedReport.reportSql?.trim() ? (
											<div className="space-y-2">
												<div className="text-xs uppercase tracking-wide text-muted-foreground">
													Stored SQL
												</div>
												<pre className="max-h-48 overflow-auto rounded-sm border border-border/60 bg-muted/30 p-3 text-xs leading-5">
													{selectedReport.reportSql}
												</pre>
											</div>
										) : null}

										{selectedReport.coreReport ? (
											<Alert>
												<AlertTitle>Core report protection</AlertTitle>
												<AlertDescription>
													This report is marked as core. Only the
													<code className="mx-1">useReport</code>
													flag can be updated, and deletion is blocked.
												</AlertDescription>
											</Alert>
										) : null}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Run Report</CardTitle>
										<CardDescription>
											Each field maps directly to the report service&apos;s `R_`
											parameter contract.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-6">
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
													{availableExports.map((exportTarget) => (
														<SelectItem key={exportTarget} value={exportTarget}>
															{getExportLabel(exportTarget)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										{selectedParameters.length === 0 ? (
											<div className="rounded-sm border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
												This report does not declare any runtime parameters.
											</div>
										) : (
											<div className="grid gap-4 md:grid-cols-2">
												{selectedParameters.map((parameter) => {
													const parameterName = parameter.parameterName || "";
													const metadata =
														getReportParameterMetadata(parameter);
													const options = parameterOptions[parameterName] || [];
													const showFallbackInput =
														metadata.control === "select" &&
														!parameterOptionsQuery.isLoading &&
														options.length === 0;

													return (
														<div key={parameterName} className="space-y-2">
															<Label htmlFor={parameterName}>
																{metadata.label}
															</Label>

															{metadata.control === "select" &&
															!showFallbackInput ? (
																parameterOptionsQuery.isLoading &&
																metadata.optionSource === "parameterType" ? (
																	<Skeleton className="h-10 w-full" />
																) : (
																	<Select
																		value={formValues[parameterName] || ""}
																		onValueChange={(value) =>
																			setFormValues((current) => ({
																				...current,
																				[parameterName]: value,
																			}))
																		}
																	>
																		<SelectTrigger id={parameterName}>
																			<SelectValue
																				placeholder={`Select ${metadata.label.toLowerCase()}`}
																			/>
																		</SelectTrigger>
																		<SelectContent>
																			{metadata.allowAll &&
																			metadata.allValue ? (
																				<SelectItem value={metadata.allValue}>
																					All
																				</SelectItem>
																			) : null}
																			{options.map((option) => (
																				<SelectItem
																					key={`${parameterName}-${option.value}`}
																					value={option.value}
																				>
																					{option.label}
																				</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																)
															) : (
																<Input
																	id={parameterName}
																	type={
																		metadata.control === "number"
																			? "number"
																			: metadata.control === "date"
																				? "date"
																				: "text"
																	}
																	value={formValues[parameterName] || ""}
																	onChange={(event) =>
																		setFormValues((current) => ({
																			...current,
																			[parameterName]: event.target.value,
																		}))
																	}
																	placeholder={
																		metadata.placeholder || metadata.description
																	}
																/>
															)}

															<div className="text-xs text-muted-foreground">
																{metadata.description}
															</div>
															<div className="text-[11px] text-muted-foreground">
																Request key:{" "}
																<code>R_{metadata.requestKey}</code>
															</div>
														</div>
													);
												})}
											</div>
										)}

										{parameterOptionsQuery.error && (
											<Alert>
												<AlertTitle>Parameter lookup fallback</AlertTitle>
												<AlertDescription>
													Some lookup lists could not be resolved automatically.
													Manual input is still available for affected
													parameters.
												</AlertDescription>
											</Alert>
										)}

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
													selectedReport.useReport === false
												}
											>
												{(() => {
													const ExportIcon = getExportIcon(selectedExport);
													return (
														<>
															{selectedExport === "JSON" ||
															selectedExport === "PRETTY_JSON" ? (
																<Play className="mr-2 h-4 w-4" />
															) : (
																<Download className="mr-2 h-4 w-4" />
															)}
															<ExportIcon className="mr-2 h-4 w-4" />
															{selectedExport === "JSON" ||
															selectedExport === "PRETTY_JSON"
																? "Run Report"
																: `Export ${getExportLabel(selectedExport)}`}
														</>
													);
												})()}
											</Button>
										</div>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Parameter Contract</CardTitle>
										<CardDescription>
											Structured definitions generated from the report template
											and the report-specific parameter mapping.
										</CardDescription>
									</CardHeader>
									<CardContent>
										{selectedParameters.length === 0 ? (
											<div className="rounded-sm border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
												No parameters declared for this report.
											</div>
										) : (
											<div className="rounded-sm border border-border/60">
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Parameter</TableHead>
															<TableHead>Request Key</TableHead>
															<TableHead>Control</TableHead>
															<TableHead>Notes</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{selectedParameters.map((parameter) => {
															const metadata =
																getReportParameterMetadata(parameter);
															return (
																<TableRow
																	key={`definition-${parameter.parameterName}`}
																>
																	<TableCell>
																		<div className="space-y-1">
																			<div className="font-medium">
																				{metadata.label}
																			</div>
																			<div className="text-xs text-muted-foreground">
																				{parameter.parameterName}
																			</div>
																		</div>
																	</TableCell>
																	<TableCell>
																		<code>R_{metadata.requestKey}</code>
																	</TableCell>
																	<TableCell>
																		<Badge variant="outline">
																			{metadata.control}
																		</Badge>
																	</TableCell>
																	<TableCell className="text-sm text-muted-foreground">
																		{metadata.description}
																	</TableCell>
																</TableRow>
															);
														})}
													</TableBody>
												</Table>
											</div>
										)}
									</CardContent>
								</Card>

								{runMutation.isPending ? (
									<ResultsSkeleton />
								) : executionResult ? (
									<Card>
										<CardHeader>
											<CardTitle>Latest Result</CardTitle>
											<CardDescription>
												{selectedExport === "PRETTY_JSON"
													? "Formatted JSON payload returned by the report service."
													: "Most recent successful report response for the current selection."}
											</CardDescription>
										</CardHeader>
										<CardContent>
											{executionResult.kind === "structured" &&
											selectedExport !== "PRETTY_JSON" &&
											isStructuredReportPayload(executionResult.data) &&
											(executionResult.data.columnHeaders?.length || 0) > 0 ? (
												<DataTable
													data={normalizeResultsetRows(executionResult.data)}
													columns={(
														executionResult.data.columnHeaders || []
													).map((header) => ({
														header: header.columnName || "Column",
														cell: (row: {
															id: string;
															values: Record<string, unknown>;
														}) => {
															const key = header.columnName || "Column";
															const value = row.values[key];
															return value === null || value === undefined
																? "—"
																: String(value);
														},
													}))}
													getRowId={(row) => row.id}
													emptyMessage="The report completed successfully but returned no rows."
												/>
											) : (
												<pre className="max-h-[32rem] overflow-auto rounded-sm border border-border/60 bg-muted/30 p-4 text-xs leading-6">
													{executionResult.kind === "structured"
														? executionResult.rawText ||
															JSON.stringify(executionResult.data, null, 2)
														: executionResult.kind === "text"
															? executionResult.text
															: "This export was downloaded and does not have an inline preview."}
												</pre>
											)}
										</CardContent>
									</Card>
								) : null}
							</>
						) : (
							<Card>
								<CardHeader>
									<CardTitle>Select a report</CardTitle>
									<CardDescription>
										Choose a report from the catalog to inspect its parameter
										contract and execute it.
									</CardDescription>
								</CardHeader>
							</Card>
						)}
					</div>
				</div>
			</div>

			<Sheet open={isEditorOpen} onOpenChange={handleEditorOpenChange}>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-2xl"
				>
					<SheetHeader>
						<SheetTitle>
							{isEditingReport ? "Manage Report" : "Create Report"}
						</SheetTitle>
						<SheetDescription>
							Inspect the template contract, bind valid parameters, and persist
							only supported report fields.
						</SheetDescription>
					</SheetHeader>

					{isEditingReport && editingReportDetailQuery.isLoading ? (
						<div className="mt-6 space-y-4">
							{Array.from({ length: 6 }).map((_, index) => (
								<div key={`report-editor-skeleton-${index}`} className="space-y-2">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-10 w-full" />
								</div>
							))}
						</div>
					) : isEditingReport && editingReportDetailQuery.error ? (
						<Alert variant="destructive" className="mt-6">
							<AlertTitle>Unable to load report details</AlertTitle>
							<AlertDescription>
								Open the report again after refreshing the catalog.
							</AlertDescription>
						</Alert>
					) : (
						<div className="mt-6 space-y-6">
							<SubmitErrorAlert
								error={submitError}
								title={
									isEditingReport
										? "Unable to update report"
										: "Unable to create report"
								}
							/>

							{isCoreEditingReport ? (
								<Alert>
									<AlertTitle>Core report</AlertTitle>
									<AlertDescription>
										Fineract only allows
										<code className="mx-1">useReport</code>
										changes for core reports. All other fields are read-only
										here.
									</AlertDescription>
								</Alert>
							) : null}

							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="report-name">
										Report Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id="report-name"
										value={reportEditorValues.reportName}
										onChange={(event) =>
											updateEditorField("reportName", event.target.value)
										}
										disabled={isSavingReport || isCoreEditingReport}
										placeholder="e.g. Branch Collection Summary"
									/>
									{reportNameFieldError ? (
										<p className="text-sm text-destructive">
											{reportNameFieldError}
										</p>
									) : null}
								</div>

								<div className="space-y-2">
									<Label>
										Report Type <span className="text-destructive">*</span>
									</Label>
									<Select
										value={reportEditorValues.reportType}
										onValueChange={(value) =>
											updateEditorField("reportType", value)
										}
										disabled={isSavingReport || isCoreEditingReport}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select report type" />
										</SelectTrigger>
										<SelectContent>
											{allowedReportTypes.map((reportType) => (
												<SelectItem key={reportType} value={reportType}>
													{reportType}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{reportTypeFieldError ? (
										<p className="text-sm text-destructive">
											{reportTypeFieldError}
										</p>
									) : null}
								</div>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="report-sub-type">Report Sub-Type</Label>
									{reportEditorValues.reportType === "Chart" ? (
										<Select
											value={reportEditorValues.reportSubType}
											onValueChange={(value) =>
												updateEditorField("reportSubType", value)
											}
											disabled={isSavingReport || isCoreEditingReport}
										>
											<SelectTrigger id="report-sub-type">
												<SelectValue placeholder="Select chart sub-type" />
											</SelectTrigger>
											<SelectContent>
												{CHART_SUBTYPES.map((subType) => (
													<SelectItem key={subType} value={subType}>
														{subType}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									) : (
										<Input
											id="report-sub-type"
											value={reportEditorValues.reportSubType}
											onChange={(event) =>
												updateEditorField("reportSubType", event.target.value)
											}
											disabled
											placeholder="Only required for chart reports"
										/>
									)}
									{reportSubTypeFieldError ? (
										<p className="text-sm text-destructive">
											{reportSubTypeFieldError}
										</p>
									) : null}
								</div>

								<div className="space-y-2">
									<Label htmlFor="report-category">Category</Label>
									<Input
										id="report-category"
										value={reportEditorValues.reportCategory}
										onChange={(event) =>
											updateEditorField("reportCategory", event.target.value)
										}
										disabled={isSavingReport || isCoreEditingReport}
										placeholder="e.g. Portfolio"
									/>
									{reportCategoryFieldError ? (
										<p className="text-sm text-destructive">
											{reportCategoryFieldError}
										</p>
									) : null}
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="report-description">Description</Label>
								<Textarea
									id="report-description"
									rows={3}
									value={reportEditorValues.description}
									onChange={(event) =>
										updateEditorField("description", event.target.value)
									}
									disabled={isSavingReport || isCoreEditingReport}
									placeholder="Describe how this report should be used"
								/>
								{descriptionFieldError ? (
									<p className="text-sm text-destructive">
										{descriptionFieldError}
									</p>
								) : null}
							</div>

							<div className="space-y-2">
								<Label htmlFor="report-sql">Report SQL</Label>
								<Textarea
									id="report-sql"
									rows={8}
									value={reportEditorValues.reportSql}
									onChange={(event) =>
										updateEditorField("reportSql", event.target.value)
									}
									disabled={
										isSavingReport ||
										isCoreEditingReport ||
										!REPORT_TYPES_REQUIRING_SQL.has(
											reportEditorValues.reportType.trim(),
										)
									}
									placeholder={
										REPORT_TYPES_REQUIRING_SQL.has(
											reportEditorValues.reportType.trim(),
										)
											? "SELECT ... FROM ..."
											: "SQL is only used for Table and Chart report types"
									}
								/>
								{reportSqlFieldError ? (
									<p className="text-sm text-destructive">{reportSqlFieldError}</p>
								) : (
									<p className="text-xs text-muted-foreground">
										Table and Chart reports require SQL. Non-SQL report types
										must leave this blank.
									</p>
								)}
							</div>

							<div className="space-y-3">
								<div className="flex items-center justify-between gap-2">
									<div>
										<Label>Report Parameters</Label>
										<p className="text-xs text-muted-foreground">
											Choose only parameters exposed by the report template.
										</p>
									</div>
									<Badge variant="outline">
										{reportEditorValues.reportParameterIds.length} selected
									</Badge>
								</div>
								<div className="grid max-h-64 gap-2 overflow-y-auto rounded-sm border border-border/60 p-3">
									{allowedTemplateParameters.length === 0 ? (
										<div className="text-sm text-muted-foreground">
											No allowed parameters were returned by the template.
										</div>
									) : (
										allowedTemplateParameters.map((parameter) => {
											const parameterId = getParameterId(parameter);
											if (parameterId === undefined) {
												return null;
											}

											const metadata = getReportParameterMetadata(parameter);
											const fieldId = `report-parameter-${parameterId}`;
											return (
												<label
													key={fieldId}
													htmlFor={fieldId}
													className="flex cursor-pointer items-start gap-3 rounded-sm border border-border/60 p-3"
												>
													<Checkbox
														id={fieldId}
														checked={reportEditorValues.reportParameterIds.includes(
															parameterId,
														)}
														onCheckedChange={(value) =>
															toggleReportParameter(
																parameterId,
																Boolean(value),
															)
														}
														disabled={isSavingReport || isCoreEditingReport}
													/>
													<div className="space-y-1">
														<div className="text-sm font-medium">
															{metadata.label}
														</div>
														<div className="text-xs text-muted-foreground">
															{parameter.parameterName}
														</div>
														<div className="text-xs text-muted-foreground">
															{metadata.description}
														</div>
													</div>
												</label>
											);
										})
									)}
								</div>
								{reportParametersFieldError ? (
									<p className="text-sm text-destructive">
										{reportParametersFieldError}
									</p>
								) : null}
							</div>

							<div className="rounded-sm border border-border/60 p-3">
								<div className="flex items-start gap-3">
									<Checkbox
										id="report-use-report"
										checked={reportEditorValues.useReport}
										onCheckedChange={(value) =>
											updateEditorField("useReport", Boolean(value))
										}
										disabled={isSavingReport}
									/>
									<div className="space-y-1">
										<Label htmlFor="report-use-report">Enable report</Label>
										<p className="text-xs text-muted-foreground">
											Controls whether this definition is available for
											execution.
										</p>
									</div>
								</div>
							</div>

							<div className="rounded-sm border border-border/60 bg-muted/20 p-3">
								<div className="text-xs uppercase tracking-wide text-muted-foreground">
									Payload Preview
								</div>
								<pre className="mt-2 max-h-48 overflow-auto text-xs leading-5">
									{JSON.stringify(selectedDefinitionPayload, null, 2)}
								</pre>
							</div>

							<div className="flex items-center justify-between gap-2 pt-2">
								<div>
									{isEditingReport && !isCoreEditingReport ? (
										<Button
											type="button"
											variant="destructive"
											onClick={() => setIsDeleteDialogOpen(true)}
											disabled={isSavingReport}
										>
											<Trash2 className="mr-2 h-4 w-4" />
											Delete Report
										</Button>
									) : null}
								</div>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => handleEditorOpenChange(false)}
										disabled={isSavingReport}
									>
										Cancel
									</Button>
									<Button
										type="button"
										onClick={handleSubmitReportDefinition}
										disabled={isSavingReport}
									>
										{isEditingReport ? "Save Changes" : "Create Report"}
									</Button>
								</div>
							</div>
						</div>
					)}
				</SheetContent>
			</Sheet>

			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete report definition?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the non-core report and its generated
							<code className="mx-1">READ_{editingReport?.reportName || "report"}</code>
							permission from Fineract.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								event.preventDefault();
								deleteMutation.mutate();
							}}
							disabled={deleteMutation.isPending}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageShell>
	);
}
