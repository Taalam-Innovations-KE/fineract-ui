"use client";

import {
	useMutation,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
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
import {
	discoverTablePentahoPairs,
	normalizeReportName,
	toReportCatalogItems,
} from "@/lib/fineract/report-pairing";
import {
	getOptionsEndpointReportName,
	getReportParameterCatalogFields,
	type ReportParameterCatalogSource,
	type ReportParameterCatalogWidget,
} from "@/lib/fineract/report-parameter-catalog";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { useTenantStore } from "@/store/tenant";

type ReportOutputType = "JSON" | "PDF" | "XLS" | "XLSX" | "CSV" | "HTML";

type ReportData = GetReportsResponse & {
	reportParameters?: Array<Record<string, unknown>>;
};

type ReportTemplateData = GetReportsTemplateResponse & {
	allowedParameters?: Array<Record<string, unknown>>;
};

interface ReportParameterOption {
	value: string;
	label: string;
}

interface ReportParameterField {
	key: string;
	queryKey: string;
	label: string;
	required: boolean;
	dataType: string;
	widget: ReportParameterCatalogWidget;
	source: ReportParameterCatalogSource;
	format?: string;
	optionsEndpoint?: string;
	systemSubstitution?: string;
	options: ReportParameterOption[];
}

interface ValidationFieldError {
	field: string;
	message: string;
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

type RoleData = GetRolesResponse;

interface PentahoEnforcementTableDisableResult {
	reportId: number | null;
	reportName: string;
	pentahoReportName: string;
	status: "disabled" | "already-disabled" | "skipped-no-id" | "failed";
	error?: string;
}

interface PentahoEnforcementRoleUpdateResult {
	roleId: number;
	status: "updated" | "no-matching-permissions" | "failed";
	updatedPermissionCodes: string[];
	skippedPermissionCodes: string[];
	error?: string;
}

interface PentahoEnforcementVerificationEntry {
	variant: "table" | "pentaho";
	reportName: string;
	expectation: "denied" | "allowed";
	outcome: "passed" | "failed" | "indeterminate";
	httpStatus: number | null;
	message: string;
}

interface PentahoEnforcementVerificationResult {
	baseName: string;
	entries: PentahoEnforcementVerificationEntry[];
}

interface PentahoEnforcementResponse {
	summary: {
		totalReports: number;
		pairCount: number;
		roleCount: number;
		strictEnforcement: boolean;
		verifyRunReports: boolean;
		disabledTableCount: number;
		alreadyDisabledTableCount: number;
		failedTableDisableCount: number;
		updatedRoleCount: number;
		failedRoleCount: number;
		roleNoMatchCount: number;
		verificationPairCount: number;
	};
	tableDisableResults: PentahoEnforcementTableDisableResult[];
	roleUpdateResults: PentahoEnforcementRoleUpdateResult[];
	runReportVerifications: PentahoEnforcementVerificationResult[];
	notes?: string[];
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
const PARAMETER_OPTIONS_FIELDS = [
	"options",
	"values",
	"selectOptions",
	"allowedValues",
	"valueOptions",
	"columnValues",
	"choices",
	"items",
] as const;
const PARAMETER_OPTION_VALUE_FIELDS = [
	"value",
	"id",
	"code",
	"key",
	"name",
] as const;
const PARAMETER_OPTION_LABEL_FIELDS = [
	"label",
	"displayName",
	"name",
	"description",
	"code",
	"value",
	"id",
] as const;

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

function readArrayField(
	record: Record<string, unknown>,
	keys: readonly string[],
): unknown[] {
	for (const key of keys) {
		const value = record[key];
		if (Array.isArray(value)) {
			return value;
		}
	}
	return [];
}

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
	return null;
}

function getDefaultWidget(
	dataType: string,
	options: ReportParameterOption[],
): ReportParameterCatalogWidget {
	if (options.length > 0) {
		return "dropdown";
	}
	if (getParameterInputType(dataType) === "date") {
		return "datepicker";
	}
	return "textbox";
}

function extractParameterOptions(
	record: Record<string, unknown>,
): ReportParameterOption[] {
	const rawOptions = readArrayField(record, PARAMETER_OPTIONS_FIELDS);
	if (rawOptions.length === 0) {
		return [];
	}

	const parsedOptions: ReportParameterOption[] = [];
	const seenValues = new Set<string>();

	for (const rawOption of rawOptions) {
		if (typeof rawOption === "string" || typeof rawOption === "number") {
			const value = toOptionValue(rawOption);
			if (!value || seenValues.has(value)) {
				continue;
			}
			parsedOptions.push({
				value,
				label: value,
			});
			seenValues.add(value);
			continue;
		}

		const optionRecord = asRecord(rawOption);
		if (!optionRecord) {
			continue;
		}

		const value =
			readStringField(optionRecord, PARAMETER_OPTION_VALUE_FIELDS) ||
			toOptionValue(optionRecord.id) ||
			toOptionValue(optionRecord.value);
		if (!value || seenValues.has(value)) {
			continue;
		}

		const label =
			readStringField(optionRecord, PARAMETER_OPTION_LABEL_FIELDS) || value;
		parsedOptions.push({ value, label });
		seenValues.add(value);
	}

	return parsedOptions;
}

function toParameterField(
	record: Record<string, unknown>,
): ReportParameterField | null {
	const key = readStringField(record, PARAMETER_KEY_FIELDS);
	if (!key) {
		return null;
	}

	const queryKey = toQueryParameterKey(key);
	const label =
		readStringField(record, PARAMETER_LABEL_FIELDS) || toTitleLabel(key);
	const dataType = readStringField(record, PARAMETER_TYPE_FIELDS) || "text";
	const required = readBooleanField(record, PARAMETER_REQUIRED_FIELDS);
	const options = extractParameterOptions(record);

	return {
		key,
		queryKey,
		label,
		dataType,
		required,
		widget: getDefaultWidget(dataType, options),
		source: "user",
		format: undefined,
		optionsEndpoint: undefined,
		systemSubstitution: undefined,
		options,
	};
}

function toCatalogParameterField(
	field: ReturnType<typeof getReportParameterCatalogFields>[number],
): ReportParameterField {
	return {
		key: field.key,
		queryKey: toQueryParameterKey(field.key),
		label: field.label || toTitleLabel(field.key),
		required: field.required,
		dataType: field.type,
		widget: field.widget,
		source: field.source,
		format: field.format,
		optionsEndpoint: field.optionsEndpoint,
		systemSubstitution: field.systemSubstitution,
		options: [],
	};
}

function mergeParameterOptions(
	primary: ReportParameterOption[],
	secondary: ReportParameterOption[],
): ReportParameterOption[] {
	const merged: ReportParameterOption[] = [];
	const seenValues = new Set<string>();

	for (const option of [...primary, ...secondary]) {
		if (seenValues.has(option.value)) {
			continue;
		}
		merged.push(option);
		seenValues.add(option.value);
	}

	return merged;
}

function mergeParameterField(
	reportField: ReportParameterField,
	templateField: ReportParameterField | null,
): ReportParameterField {
	if (!templateField) {
		return reportField;
	}

	const shouldUseTemplateDataType =
		reportField.dataType === "text" && templateField.dataType !== "text";

	return {
		...reportField,
		label:
			reportField.label === toTitleLabel(reportField.key)
				? templateField.label
				: reportField.label,
		dataType: shouldUseTemplateDataType
			? templateField.dataType
			: reportField.dataType,
		required: reportField.required || templateField.required,
		widget:
			reportField.widget === "textbox" && templateField.widget !== "textbox"
				? templateField.widget
				: reportField.widget,
		source:
			reportField.source === "user" ? templateField.source : reportField.source,
		format: reportField.format || templateField.format,
		optionsEndpoint:
			reportField.optionsEndpoint || templateField.optionsEndpoint,
		systemSubstitution:
			reportField.systemSubstitution || templateField.systemSubstitution,
		options: mergeParameterOptions(reportField.options, templateField.options),
	};
}

function applyCatalogParameterField(
	field: ReportParameterField,
	catalogField: ReportParameterField | null,
): ReportParameterField {
	if (!catalogField) {
		return field;
	}

	return {
		...field,
		label: catalogField.label || field.label,
		required: field.required || catalogField.required,
		dataType: catalogField.dataType || field.dataType,
		widget: catalogField.widget || field.widget,
		source: catalogField.source || field.source,
		format: catalogField.format || field.format,
		optionsEndpoint: catalogField.optionsEndpoint || field.optionsEndpoint,
		systemSubstitution:
			catalogField.systemSubstitution || field.systemSubstitution,
		options: mergeParameterOptions(field.options, catalogField.options),
	};
}

function addFieldLookup(
	fieldMap: Map<string, ReportParameterField>,
	field: ReportParameterField,
) {
	fieldMap.set(field.queryKey, field);
	fieldMap.set(field.key, field);
}

function extractReportParameters(
	report: ReportData,
	template: ReportTemplateData | undefined,
): ReportParameterField[] {
	const rawParameters = report.reportParameters || [];
	const templateAllowed = template?.allowedParameters || [];
	const catalogFields = getReportParameterCatalogFields(report.reportName).map(
		toCatalogParameterField,
	);
	const fields: ReportParameterField[] = [];
	const seenKeys = new Set<string>();
	const templateByKey = new Map<string, ReportParameterField>();
	const catalogByKey = new Map<string, ReportParameterField>();

	for (const rawTemplateParameter of templateAllowed) {
		const record = asRecord(rawTemplateParameter);
		if (!record) continue;
		const field = toParameterField(record);
		if (!field) continue;
		addFieldLookup(templateByKey, field);
	}

	for (const catalogField of catalogFields) {
		addFieldLookup(catalogByKey, catalogField);
	}

	for (const rawParameter of rawParameters) {
		const record = asRecord(rawParameter);
		if (!record) continue;
		const reportField = toParameterField(record);
		if (!reportField || seenKeys.has(reportField.queryKey)) continue;

		const templateMatch =
			templateByKey.get(reportField.queryKey) ||
			templateByKey.get(reportField.key);
		const catalogMatch =
			catalogByKey.get(reportField.queryKey) ||
			catalogByKey.get(reportField.key);
		fields.push(
			applyCatalogParameterField(
				mergeParameterField(reportField, templateMatch || null),
				catalogMatch || null,
			),
		);
		seenKeys.add(reportField.queryKey);
	}

	for (const catalogField of catalogFields) {
		if (seenKeys.has(catalogField.queryKey)) {
			continue;
		}

		const templateMatch =
			templateByKey.get(catalogField.queryKey) ||
			templateByKey.get(catalogField.key);
		fields.push(mergeParameterField(catalogField, templateMatch || null));
		seenKeys.add(catalogField.queryKey);
	}

	return fields;
}

function normalizeOutputType(value: string): ReportOutputType | null {
	const upper = value.toUpperCase();
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

function parseOptionRow(row: unknown): ReportParameterOption | null {
	if (typeof row === "string" || typeof row === "number") {
		const value = toOptionValue(row);
		if (!value) {
			return null;
		}
		return { value, label: value };
	}

	if (Array.isArray(row)) {
		const value = toOptionValue(row[0]);
		if (!value) {
			return null;
		}
		return {
			value,
			label: toOptionValue(row[1]) || value,
		};
	}

	const record = asRecord(row);
	if (!record) {
		return null;
	}

	const value =
		readStringField(record, PARAMETER_OPTION_VALUE_FIELDS) ||
		toOptionValue(record.id) ||
		toOptionValue(record.value);
	if (!value) {
		return null;
	}

	return {
		value,
		label:
			readStringField(record, PARAMETER_OPTION_LABEL_FIELDS) ||
			toOptionValue(record.name) ||
			value,
	};
}

function parseDynamicOptionsPayload(payload: unknown): ReportParameterOption[] {
	const payloadRecord = asRecord(payload);
	const rows = Array.isArray(payload)
		? payload
		: Array.isArray(payloadRecord?.data)
			? payloadRecord.data
			: Array.isArray(payloadRecord?.pageItems)
				? payloadRecord.pageItems
				: [];
	if (rows.length === 0) {
		return [];
	}

	const options: ReportParameterOption[] = [];
	const seenValues = new Set<string>();

	for (const row of rows) {
		const option = parseOptionRow(row);
		if (!option || seenValues.has(option.value)) {
			continue;
		}
		options.push(option);
		seenValues.add(option.value);
	}

	return options;
}

function formatDateValueForReport(
	value: string,
	format: string | undefined,
): string {
	if (!value || !format) {
		return value;
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return value;
	}

	const [year, month, day] = value.split("-");
	if (format === "dd-MM-yyyy") {
		return `${day}-${month}-${year}`;
	}
	if (format === "yyyy-MM-dd") {
		return `${year}-${month}-${day}`;
	}

	return value;
}

function serializeParameterValue(
	field: ReportParameterField,
	value: string,
): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return "";
	}

	if (field.widget === "datepicker") {
		return formatDateValueForReport(trimmed, field.format);
	}

	return trimmed;
}

function getParameterInputType(dataType: string): "text" | "number" | "date" {
	const normalized = dataType.trim().toLowerCase();
	if (
		normalized.includes("date") ||
		normalized.includes("localdate") ||
		normalized.includes("datetime")
	) {
		return "date";
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

async function fetchReportParameterOptions(
	tenantId: string,
	optionsEndpoint: string,
): Promise<ReportParameterOption[]> {
	const reportName = getOptionsEndpointReportName(optionsEndpoint);
	if (!reportName) {
		return [];
	}

	const parsedOptionsEndpoint = new URL(
		optionsEndpoint,
		"https://placeholder.local",
	);
	const search = parsedOptionsEndpoint.searchParams.toString();
	const endpoint = BFF_ROUTES.runReport(reportName);
	const response = await fetch(
		search ? `${endpoint}?${search}` : `${endpoint}?parameterType=true`,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw new Error("Failed to fetch report parameter options");
	}

	const payload = await response.json();
	return parseDynamicOptionsPayload(payload);
}

async function fetchRoles(tenantId: string): Promise<RoleData[]> {
	const response = await fetch(BFF_ROUTES.roles, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch roles");
	}

	return response.json();
}

async function applyPentahoEnforcement(
	tenantId: string,
	payload: {
		roleIds: number[];
		strictEnforcement: boolean;
		verifyRunReports: boolean;
	},
): Promise<PentahoEnforcementResponse> {
	const response = await fetch(BFF_ROUTES.reportsPentahoEnforcement, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const errorPayload = await response
			.json()
			.catch(() => ({ message: "Failed to apply Pentaho report enforcement" }));
		throw errorPayload;
	}

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

	const selectedParameterMetadata = useMemo(
		() =>
			selectedReport
				? extractReportParameters(
						selectedReport,
						reportTemplateQuery.data || undefined,
					)
				: [],
		[selectedReport, reportTemplateQuery.data],
	);
	const parameterOptionFields = useMemo(
		() =>
			selectedParameterMetadata.filter(
				(field) =>
					field.source === "user" &&
					field.widget === "dropdown" &&
					field.options.length === 0 &&
					Boolean(field.optionsEndpoint),
			),
		[selectedParameterMetadata],
	);
	const parameterOptionQueries = useQueries({
		queries: parameterOptionFields.map((field) => ({
			queryKey: [
				"report-parameter-options",
				tenantId,
				selectedReport?.reportName,
				field.optionsEndpoint,
			],
			queryFn: () =>
				fetchReportParameterOptions(tenantId, field.optionsEndpoint || ""),
			enabled:
				isRunnerOpen &&
				Boolean(selectedReport?.reportName) &&
				Boolean(field.optionsEndpoint),
			staleTime: 5 * 60 * 1000,
		})),
	});
	const parameterOptionStateByKey = useMemo(() => {
		const state = new Map<
			string,
			{
				isLoading: boolean;
				errorMessage?: string;
				options: ReportParameterOption[];
			}
		>();

		parameterOptionFields.forEach((field, index) => {
			const query = parameterOptionQueries[index];
			state.set(field.queryKey, {
				isLoading: query?.isLoading === true,
				errorMessage:
					query?.error instanceof Error
						? query.error.message
						: query?.error
							? "Could not load options from backend."
							: undefined,
				options: query?.data || [],
			});
		});

		return state;
	}, [parameterOptionFields, parameterOptionQueries]);
	const selectedParameterFields = useMemo(
		() =>
			selectedParameterMetadata.map((field) => {
				const optionState = parameterOptionStateByKey.get(field.queryKey);
				if (!optionState?.options.length) {
					return field;
				}

				return {
					...field,
					options: mergeParameterOptions(optionState.options, field.options),
				};
			}),
		[selectedParameterMetadata, parameterOptionStateByKey],
	);
	const visibleParameterFields = useMemo(
		() =>
			selectedParameterFields.filter(
				(field) => field.source === "user" && field.widget !== "hidden",
			),
		[selectedParameterFields],
	);
	const systemParameterFields = useMemo(
		() =>
			selectedParameterFields.filter(
				(field) => field.source !== "user" || field.widget === "hidden",
			),
		[selectedParameterFields],
	);
	const requiredParameterCount = useMemo(
		() => visibleParameterFields.filter((field) => field.required).length,
		[visibleParameterFields],
	);
	const additionalParameterEntries = useMemo(
		() => parseAdditionalParams(additionalParams),
		[additionalParams],
	);
	const missingRequiredFields = useMemo(() => {
		const providedParameterKeys = new Set<string>();

		for (const field of visibleParameterFields) {
			if (
				serializeParameterValue(field, parameterValues[field.queryKey] || "")
			) {
				providedParameterKeys.add(field.queryKey);
			}
		}

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

		return visibleParameterFields.filter(
			(field) => field.required && !providedParameterKeys.has(field.queryKey),
		);
	}, [additionalParameterEntries, parameterValues, visibleParameterFields]);
	const missingRequiredByKey = useMemo(
		() => new Set(missingRequiredFields.map((field) => field.queryKey)),
		[missingRequiredFields],
	);

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

	const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
	const filteredReports = reports.filter((report) => {
		if (visibilityFilter === "runnable" && report.useReport === false) {
			return false;
		}

				for (const field of visibleParameterFields) {
					const value = serializeParameterValue(
						field,
						parameterValues[field.queryKey] || "",
					);
					if (value) {
						params.append(field.queryKey, value);
					}
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
			cell: (report) => {
				const parameters = extractReportParameters(
					report,
					reportTemplateQuery.data || undefined,
				).filter(
					(parameter) =>
						parameter.source === "user" && parameter.widget !== "hidden",
				);
				const requiredCount = parameters.filter(
					(parameter) => parameter.required,
				).length;
				if (requiredCount === 0) {
					return <span>{parameters.length.toLocaleString()}</span>;
				}

				return (
					<span>
						{requiredCount.toLocaleString()} required /{" "}
						{parameters.length.toLocaleString()} total
					</span>
				);
			},
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
						const fields = extractReportParameters(
							report,
							reportTemplateQuery.data || undefined,
						);
						setSelectedReport(report);
						setParameterValues(
							Object.fromEntries(
								fields
									.filter(
										(field) =>
											field.source === "user" && field.widget !== "hidden",
									)
									.map((field) => [field.queryKey, ""]),
							),
						);
						setAdditionalParams("");
						setSelectedOutput("JSON");
						setRunResult(null);
						runReportMutation.reset();
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

								<div className="rounded-sm border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
									{selectedParameterFields.length === 0 ? (
										<p>
											This report does not publish parameter metadata. Use
											additional query parameters if the backend expects inputs.
										</p>
									) : (
										<div className="space-y-1">
											<p>
												{requiredParameterCount.toLocaleString()} required and{" "}
												{(
													visibleParameterFields.length - requiredParameterCount
												).toLocaleString()}{" "}
												optional user inputs resolved from backend metadata and
												the local report catalog.
											</p>
											{systemParameterFields.length > 0 && (
												<p>
													{systemParameterFields.length.toLocaleString()} system
													parameter
													{systemParameterFields.length === 1 ? "" : "s"} are
													backend-supplied and do not need user input.
												</p>
											)}
										</div>
									)}
								</div>
								{reportTemplateQuery.isLoading && (
									<Skeleton className="h-4 w-64" />
								)}
								{reportTemplateQuery.error && (
									<p className="text-xs text-muted-foreground">
										Could not load backend parameter template metadata. Showing
										report metadata plus local catalog mappings.
									</p>
								)}

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
												{outputValue}
											</Badge>
										))}
									</div>
									<p className="text-xs text-muted-foreground">
										Supported by backend for this report.
									</p>
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
									{visibleParameterFields.map((field) => {
										const fieldHasClientMissingError =
											missingRequiredByKey.has(field.queryKey) &&
											Boolean(runReportError);
										const fieldErrorMessage = getParameterFieldError(
											field,
											runReportFieldErrors,
										);
										const optionState = parameterOptionStateByKey.get(
											field.queryKey,
										);
										const isLoadingOptions = optionState?.isLoading === true;
										const optionErrorMessage = optionState?.errorMessage;
										const hasResolvedOptions = field.options.length > 0;
										const shouldRenderSelect = field.widget === "dropdown";

										return (
											<div key={field.queryKey} className="space-y-2">
												<Label htmlFor={`param-${field.queryKey}`}>
													{field.label}
													{field.required ? " *" : ""}
												</Label>
												{shouldRenderSelect && hasResolvedOptions ? (
													<Select
														value={
															parameterValues[field.queryKey] ||
															(field.required ? undefined : "__empty__")
														}
														onValueChange={(value) => {
															setParameterValues((previous) => ({
																...previous,
																[field.queryKey]:
																	value === "__empty__" ? "" : value,
															}));
															runReportMutation.reset();
														}}
													>
														<SelectTrigger id={`param-${field.queryKey}`}>
															<SelectValue
																placeholder={`Select ${field.label.toLowerCase()}`}
															/>
														</SelectTrigger>
														<SelectContent>
															{!field.required && (
																<SelectItem value="__empty__">Any</SelectItem>
															)}
															{field.options.map((option) => (
																<SelectItem
																	key={option.value}
																	value={option.value}
																>
																	{option.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : shouldRenderSelect && isLoadingOptions ? (
													<div className="space-y-2">
														<Select disabled={true}>
															<SelectTrigger id={`param-${field.queryKey}`}>
																<SelectValue placeholder="Loading options..." />
															</SelectTrigger>
														</Select>
														<Skeleton className="h-4 w-32" />
													</div>
												) : (
													<Input
														id={`param-${field.queryKey}`}
														type={
															field.widget === "datepicker"
																? "date"
																: getParameterInputType(field.dataType)
														}
														value={parameterValues[field.queryKey] || ""}
														onChange={(event) => {
															setParameterValues((previous) => ({
																...previous,
																[field.queryKey]: event.target.value,
															}));
															runReportMutation.reset();
														}}
														placeholder={
															shouldRenderSelect && !hasResolvedOptions
																? `Enter ${field.label.toLowerCase()}`
																: `${field.queryKey} (${field.dataType})`
														}
													/>
												)}
												{!fieldErrorMessage && optionErrorMessage && (
													<p className="text-xs text-muted-foreground">
														{optionErrorMessage} Enter a raw value instead.
													</p>
												)}
												{fieldErrorMessage && (
													<p className="text-xs text-destructive">
														{fieldErrorMessage}
													</p>
												)}
												{!fieldErrorMessage && fieldHasClientMissingError && (
													<p className="text-xs text-destructive">
														{field.label} is required.
													</p>
												)}
												{field.key !== field.queryKey && (
													<p className="text-xs text-muted-foreground">
														Source key: {field.key}
													</p>
												)}
												{field.format && (
													<p className="text-xs text-muted-foreground">
														Backend format: {field.format}
													</p>
												)}
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
														: executionResult.text}
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
		</PageShell>
	);
}
