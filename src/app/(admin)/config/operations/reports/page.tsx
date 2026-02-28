"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileBarChart2, Play, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
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
	GetReportsTemplateResponse,
	GetRolesResponse,
	ReportExportType,
	RunReportsResponse,
} from "@/lib/fineract/generated/types.gen";
import {
	discoverTablePentahoPairs,
	normalizeReportName,
	toReportCatalogItems,
} from "@/lib/fineract/report-pairing";
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

function readBooleanField(
	record: Record<string, unknown>,
	keys: readonly string[],
): boolean {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "boolean") {
			return value;
		}
		if (typeof value === "string") {
			const normalized = value.trim().toLowerCase();
			if (normalized === "true") return true;
			if (normalized === "false") return false;
		}
		if (typeof value === "number") {
			if (value === 1) return true;
			if (value === 0) return false;
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

function toOptionValue(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "string" && value.trim()) {
		return value.trim();
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
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
	if (
		normalized.includes("number") ||
		normalized.includes("int") ||
		normalized.includes("decimal") ||
		normalized.includes("long")
	) {
		return "number";
	}
	return "text";
}

function getFieldErrorMap(
	error: SubmitActionError | null,
): Record<string, string> {
	if (!error?.fieldErrors?.length) {
		return {};
	}

	const fieldErrorMap: Record<string, string> = {};
	for (const fieldError of error.fieldErrors) {
		const field = fieldError.field?.trim();
		if (!field || fieldErrorMap[field]) {
			continue;
		}
		fieldErrorMap[field] = fieldError.message;
		const lowerField = field.toLowerCase();
		if (!fieldErrorMap[lowerField]) {
			fieldErrorMap[lowerField] = fieldError.message;
		}
	}

	return fieldErrorMap;
}

function getParameterFieldError(
	field: ReportParameterField,
	fieldErrorMap: Record<string, string>,
): string | undefined {
	const bareQueryKey = field.queryKey.replace(/^R_/, "");
	const bareKey = field.key.replace(/^R_/, "");
	const candidates = [
		field.queryKey,
		field.key,
		bareQueryKey,
		bareKey,
		field.queryKey.toLowerCase(),
		field.key.toLowerCase(),
		bareQueryKey.toLowerCase(),
		bareKey.toLowerCase(),
	];

	for (const candidate of candidates) {
		const message = fieldErrorMap[candidate];
		if (message) {
			return message;
		}
	}

	return undefined;
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

async function fetchReportTemplate(
	tenantId: string,
): Promise<ReportTemplateData | null> {
	const response = await fetch(BFF_ROUTES.reportsTemplate, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch report template metadata");
	}

	const payload = (await response.json()) as GetReportsTemplateResponse;
	return payload as ReportTemplateData;
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
	const queryClient = useQueryClient();
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
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
	const [strictEnforcement, setStrictEnforcement] = useState(true);
	const [verifyRunReports, setVerifyRunReports] = useState(false);
	const [enforcementResult, setEnforcementResult] =
		useState<PentahoEnforcementResponse | null>(null);

	const reportsQuery = useQuery({
		queryKey: ["reports", tenantId],
		queryFn: () => fetchReports(tenantId),
	});
	const rolesQuery = useQuery({
		queryKey: ["roles", tenantId],
		queryFn: () => fetchRoles(tenantId),
	});
	const reportTemplateQuery = useQuery({
		queryKey: ["report-template", tenantId],
		queryFn: () => fetchReportTemplate(tenantId),
		enabled: isRunnerOpen,
		staleTime: 5 * 60 * 1000,
	});

	const availableExportsQuery = useQuery({
		queryKey: ["report-exports", tenantId, selectedReport?.reportName],
		queryFn: () =>
			fetchReportExports(tenantId, selectedReport?.reportName || ""),
		enabled: isRunnerOpen && Boolean(selectedReport?.reportName),
	});

	const applicableReports = useMemo(
		() =>
			(reportsQuery.data || []).filter((report) => {
				const enabled = report.useReport !== false;
				const isMailingReport =
					(report.reportType || "").toLowerCase() === "email";
				return enabled && !isMailingReport;
			}),
		[reportsQuery.data],
	);
	const tablePentahoPairs = useMemo(
		() =>
			discoverTablePentahoPairs(toReportCatalogItems(reportsQuery.data || [])),
		[reportsQuery.data],
	);
	const alreadyDisabledTablePairCount = useMemo(
		() =>
			tablePentahoPairs.filter((pair) => pair.tableReport.useReport === false)
				.length,
		[tablePentahoPairs],
	);
	const roleOptions = useMemo(
		() =>
			(rolesQuery.data || []).filter(
				(role): role is RoleData & { id: number } =>
					typeof role.id === "number" &&
					Number.isInteger(role.id) &&
					role.id > 0,
			),
		[rolesQuery.data],
	);
	const allRoleIds = useMemo(
		() => roleOptions.map((role) => String(role.id)),
		[roleOptions],
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

		for (const [key, value] of additionalParameterEntries) {
			if (value.trim()) {
				providedParameterKeys.add(key);
			}
		}

		return visibleParameterFields.filter(
			(field) => field.required && !providedParameterKeys.has(field.queryKey),
		);
	}, [additionalParameterEntries, parameterValues, visibleParameterFields]);
	const missingRequiredByKey = useMemo(
		() => new Set(missingRequiredFields.map((field) => field.queryKey)),
		[missingRequiredFields],
	);

	const outputOptions = useMemo(
		() => buildOutputOptions(availableExportsQuery.data),
		[availableExportsQuery.data],
	);
	const outputOptionValues = useMemo(
		() => outputOptions.map((option) => option.value),
		[outputOptions],
	);

	useEffect(() => {
		const available = outputOptionValues;
		if (!available.includes(selectedOutput)) {
			setSelectedOutput(available[0] || "JSON");
		}
	}, [outputOptionValues, selectedOutput]);

	const toggleRoleSelection = (roleId: string, checked: boolean) => {
		setSelectedRoleIds((current) => {
			if (checked) {
				if (current.includes(roleId)) {
					return current;
				}
				return [...current, roleId].sort((a, b) => Number(a) - Number(b));
			}
			return current.filter((candidate) => candidate !== roleId);
		});
	};

	const selectAllRoles = () => {
		setSelectedRoleIds(allRoleIds);
	};

	const clearRoleSelection = () => {
		setSelectedRoleIds([]);
	};

	const enforceReportsMutation = useMutation({
		mutationFn: async () => {
			try {
				const roleIds = selectedRoleIds
					.map((value) => Number(value))
					.filter(
						(roleId) => Number.isInteger(roleId) && Number.isFinite(roleId),
					);

				if (roleIds.length === 0) {
					throw toSubmitActionError(
						{
							code: "INVALID_REQUEST",
							message: "Select at least one role to apply report enforcement.",
							status: 400,
							fieldErrors: [
								{
									field: "roleIds",
									message: "At least one role is required.",
								},
							],
						},
						{
							action: "applyPentahoEnforcement",
							endpoint: BFF_ROUTES.reportsPentahoEnforcement,
							method: "POST",
							tenantId,
						},
					);
				}

				return await applyPentahoEnforcement(tenantId, {
					roleIds,
					strictEnforcement,
					verifyRunReports,
				});
			} catch (error) {
				throw toSubmitActionError(error, {
					action: "applyPentahoEnforcement",
					endpoint: BFF_ROUTES.reportsPentahoEnforcement,
					method: "POST",
					tenantId,
				});
			}
		},
		onMutate: () => {
			setEnforcementResult(null);
		},
		onSuccess: (response) => {
			setEnforcementResult(response);
			queryClient.invalidateQueries({ queryKey: ["reports", tenantId] });
		},
	});
	const enforceReportsError =
		enforceReportsMutation.error as SubmitActionError | null;

	const runReportMutation = useMutation({
		mutationFn: async () => {
			try {
				if (!selectedReport?.reportName) {
					throw toSubmitActionError(
						{
							code: "INVALID_REQUEST",
							message: "Report name is missing",
							status: 400,
						},
						{
							action: "runReport",
							endpoint: "/api/fineract/reports/run/[reportName]",
							method: "POST",
							tenantId,
						},
					);
				}

				if (missingRequiredFields.length > 0) {
					const fieldErrors: ValidationFieldError[] = missingRequiredFields.map(
						(field) => ({
							field: field.queryKey,
							message: `${field.label} is required.`,
						}),
					);
					throw toSubmitActionError(
						{
							code: "MISSING_REQUIRED_PARAMETERS",
							message:
								missingRequiredFields.length === 1
									? "A required report parameter is missing."
									: `${missingRequiredFields.length} required report parameters are missing.`,
							status: 400,
							fieldErrors,
						},
						{
							action: "runReport",
							endpoint: "/api/fineract/reports/run/[reportName]",
							method: "POST",
							tenantId,
						},
					);
				}

				const params = new URLSearchParams();

				for (const field of visibleParameterFields) {
					const value = serializeParameterValue(
						field,
						parameterValues[field.queryKey] || "",
					);
					if (value) {
						params.append(field.queryKey, value);
					}
				}

				for (const [key, value] of additionalParameterEntries) {
					params.append(key, value);
				}

				if (selectedOutput !== "JSON") {
					params.set("output-type", selectedOutput);
					if (selectedOutput === "CSV") {
						params.set("exportCSV", "true");
					}
				}

				const endpoint = BFF_ROUTES.runReport(selectedReport.reportName);
				const url = `${endpoint}?${params.toString()}`;
				const response = await fetch(url, {
					headers: {
						"x-tenant-id": tenantId,
					},
				});

				if (!response.ok) {
					const payload = await response
						.json()
						.catch(() => ({ message: "Failed to execute report on backend" }));
					throw toSubmitActionError(
						{
							...(payload as Record<string, unknown>),
							statusCode: response.status,
							statusText: response.statusText,
						},
						{
							action: "runReport",
							endpoint,
							method: "POST",
							tenantId,
						},
					);
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
			} catch (error) {
				throw toSubmitActionError(error, {
					action: "runReport",
					endpoint: "/api/fineract/reports/run/[reportName]",
					method: "POST",
					tenantId,
				});
			}
		},
	});
	const runReportError = runReportMutation.error as SubmitActionError | null;
	const runReportFieldErrors = useMemo(
		() => getFieldErrorMap(runReportError),
		[runReportError],
	);

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

	if (reportsQuery.isLoading) {
		return (
			<PageShell
				title="Backend Reports"
				subtitle="Run report outputs directly from backend report endpoints"
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
						<CardTitle>Table/Pentaho Enforcement</CardTitle>
						<CardDescription>
							Disable Table report variants that have Pentaho counterparts and
							update READ permissions for selected roles.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert>
							<AlertTitle>API-Only Enforcement Flow</AlertTitle>
							<AlertDescription>
								This action discovers report pairs from <code>/v1/reports</code>
								, disables Table entries with <code>useReport=false</code>, then
								updates each selected role through{" "}
								<code>/v1/roles/{`{roleId}`}/permissions</code>.
							</AlertDescription>
						</Alert>

						<div className="grid gap-4 md:grid-cols-3">
							<Card>
								<CardContent className="pt-6">
									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">Pairs</span>
										<span className="text-2xl font-bold">
											{tablePentahoPairs.length.toLocaleString()}
										</span>
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="pt-6">
									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">
											Table Disabled
										</span>
										<span className="text-2xl font-bold">
											{alreadyDisabledTablePairCount.toLocaleString()}
										</span>
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="pt-6">
									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">
											Selected Roles
										</span>
										<span className="text-2xl font-bold">
											{selectedRoleIds.length.toLocaleString()}
										</span>
									</div>
								</CardContent>
							</Card>
						</div>

						<div className="grid gap-4 lg:grid-cols-2">
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label>Target Roles</Label>
									<div className="flex items-center gap-2">
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={selectAllRoles}
											disabled={
												enforceReportsMutation.isPending ||
												roleOptions.length === 0
											}
										>
											Select All
										</Button>
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={clearRoleSelection}
											disabled={
												enforceReportsMutation.isPending ||
												selectedRoleIds.length === 0
											}
										>
											Clear
										</Button>
									</div>
								</div>
								{rolesQuery.isLoading ? (
									<div className="space-y-2 rounded-sm border border-border/60 p-3">
										{Array.from({ length: 5 }).map((_, index) => (
											<div
												key={`role-skeleton-${index}`}
												className="flex items-center gap-2"
											>
												<Skeleton className="h-4 w-4" />
												<Skeleton className="h-4 w-44" />
											</div>
										))}
									</div>
								) : rolesQuery.error ? (
									<Alert variant="destructive">
										<AlertTitle>Failed To Load Roles</AlertTitle>
										<AlertDescription>
											{rolesQuery.error instanceof Error
												? rolesQuery.error.message
												: "Could not fetch roles for permissions updates."}
										</AlertDescription>
									</Alert>
								) : (
									<div className="max-h-56 space-y-2 overflow-y-auto rounded-sm border border-border/60 p-3">
										{roleOptions.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												No roles are available for permission updates.
											</p>
										) : (
											roleOptions.map((role) => {
												const roleId = String(role.id);
												const checked = selectedRoleIds.includes(roleId);

												return (
													<label
														key={roleId}
														className="flex cursor-pointer items-center gap-2 rounded-sm border border-border/40 px-2 py-1.5"
													>
														<Checkbox
															checked={checked}
															onCheckedChange={(value) =>
																toggleRoleSelection(roleId, value === true)
															}
														/>
														<span className="text-sm">
															{role.name || `Role ${roleId}`}
														</span>
														<span className="ml-auto text-xs text-muted-foreground">
															#{roleId}
														</span>
													</label>
												);
											})
										)}
									</div>
								)}
							</div>

							<div className="space-y-2">
								<Label>Enforcement Options</Label>
								<div className="space-y-2 rounded-sm border border-border/60 p-3">
									<label className="flex cursor-pointer items-start gap-2">
										<Checkbox
											checked={strictEnforcement}
											onCheckedChange={(value) =>
												setStrictEnforcement(value === true)
											}
											disabled={enforceReportsMutation.isPending}
										/>
										<div>
											<p className="text-sm font-medium">
												Strict role enforcement
											</p>
											<p className="text-xs text-muted-foreground">
												Also sets ALL_FUNCTIONS, ALL_FUNCTIONS_READ and
												REPORTING_SUPER_USER to false when those permissions
												exist on the role.
											</p>
										</div>
									</label>
									<label className="flex cursor-pointer items-start gap-2">
										<Checkbox
											checked={verifyRunReports}
											onCheckedChange={(value) =>
												setVerifyRunReports(value === true)
											}
											disabled={enforceReportsMutation.isPending}
										/>
										<div>
											<p className="text-sm font-medium">
												Verify with /v1/runreports
											</p>
											<p className="text-xs text-muted-foreground">
												Runs best-effort permission checks after updates.
												Reports requiring parameters may return indeterminate
												results.
											</p>
										</div>
									</label>
								</div>
								<div className="rounded-sm border border-border/60">
									<Table>
										<TableHeader className="bg-muted/40">
											<TableRow>
												<TableHead>Table</TableHead>
												<TableHead>Pentaho</TableHead>
												<TableHead className="text-right">State</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{tablePentahoPairs.slice(0, 6).map((pair, index) => {
												const tableReportName = normalizeReportName(
													pair.tableReport.reportName,
												);
												const pentahoReportName = normalizeReportName(
													pair.pentahoReport.reportName,
												);

												return (
													<TableRow
														key={`${tableReportName}-${pentahoReportName}-${index}`}
													>
														<TableCell className="text-sm">
															{tableReportName || "Unnamed"}
														</TableCell>
														<TableCell className="text-sm">
															{pentahoReportName || "Unnamed"}
														</TableCell>
														<TableCell className="text-right">
															<Badge
																variant={
																	pair.tableReport.useReport === false
																		? "destructive"
																		: "success"
																}
															>
																{pair.tableReport.useReport === false
																	? "Disabled"
																	: "Enabled"}
															</Badge>
														</TableCell>
													</TableRow>
												);
											})}
											{tablePentahoPairs.length === 0 && (
												<TableRow>
													<TableCell
														colSpan={3}
														className="text-center text-sm text-muted-foreground"
													>
														No Table/Pentaho pairs were detected.
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									enforceReportsMutation.reset();
									setEnforcementResult(null);
								}}
								disabled={
									enforceReportsMutation.isPending && enforcementResult === null
								}
							>
								Reset Result
							</Button>
							<Button
								type="button"
								onClick={() => enforceReportsMutation.mutate()}
								disabled={
									enforceReportsMutation.isPending ||
									selectedRoleIds.length === 0 ||
									tablePentahoPairs.length === 0
								}
							>
								{enforceReportsMutation.isPending
									? "Applying..."
									: "Apply Enforcement"}
							</Button>
						</div>

						<SubmitErrorAlert
							error={enforceReportsError}
							title="Report Enforcement Failed"
						/>

						{enforcementResult && (
							<Card className="rounded-sm border border-border/60">
								<CardHeader>
									<CardTitle className="text-base">
										Enforcement Summary
									</CardTitle>
									<CardDescription>
										{enforcementResult.summary.disabledTableCount.toLocaleString()}{" "}
										table reports disabled,{" "}
										{enforcementResult.summary.updatedRoleCount.toLocaleString()}{" "}
										roles updated.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="grid gap-3 md:grid-cols-3">
										<div className="rounded-sm border border-border/50 p-3">
											<div className="text-xs text-muted-foreground">
												Disable Failures
											</div>
											<div className="text-lg font-semibold">
												{enforcementResult.summary.failedTableDisableCount.toLocaleString()}
											</div>
										</div>
										<div className="rounded-sm border border-border/50 p-3">
											<div className="text-xs text-muted-foreground">
												Role Failures
											</div>
											<div className="text-lg font-semibold">
												{enforcementResult.summary.failedRoleCount.toLocaleString()}
											</div>
										</div>
										<div className="rounded-sm border border-border/50 p-3">
											<div className="text-xs text-muted-foreground">
												No Match Roles
											</div>
											<div className="text-lg font-semibold">
												{enforcementResult.summary.roleNoMatchCount.toLocaleString()}
											</div>
										</div>
									</div>
									{enforcementResult.notes &&
										enforcementResult.notes.length > 0 && (
											<div className="space-y-1 rounded-sm border border-border/50 bg-muted/30 p-3">
												{enforcementResult.notes.map((note) => (
													<p
														key={note}
														className="text-xs text-muted-foreground"
													>
														{note}
													</p>
												))}
											</div>
										)}
								</CardContent>
							</Card>
						)}
					</CardContent>
				</Card>

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
										className="pl-8"
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

								<div className="space-y-2">
									<Label>Output</Label>
									<Select
										value={selectedOutput}
										onValueChange={(value) => {
											setSelectedOutput(value as ReportOutputType);
											runReportMutation.reset();
										}}
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
									<div className="flex flex-wrap gap-1">
										{outputOptionValues.map((outputValue) => (
											<Badge
												key={outputValue}
												variant={
													selectedOutput === outputValue
														? "secondary"
														: "outline"
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
										);
									})}

									<div className="space-y-2">
										<Label htmlFor="additional-params">
											Additional Query Parameters
										</Label>
										<Textarea
											id="additional-params"
											value={additionalParams}
											onChange={(event) => {
												setAdditionalParams(event.target.value);
												runReportMutation.reset();
											}}
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
								{missingRequiredFields.length > 0 && (
									<p className="text-right text-xs text-muted-foreground">
										{missingRequiredFields.length.toLocaleString()} required
										parameter
										{missingRequiredFields.length === 1 ? "" : "s"} still
										missing.
									</p>
								)}

								<SubmitErrorAlert
									error={runReportError}
									title="Report Execution Failed"
								/>

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
