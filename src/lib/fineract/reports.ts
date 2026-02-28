import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	DeleteReportsResponse,
	GetReportsResponse,
	GetReportsTemplateResponse,
	PostReportsResponse,
	PostRepostRequest,
	PutReportResponse,
	ResultsetColumnHeaderData,
	RunReportsResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeFailedResponse } from "@/lib/fineract/ui-api-error";

type AnyRecord = Record<string, unknown>;

export type ReportParameter = {
	id?: number;
	parameterId?: number;
	parameterName?: string;
	reportParameterName?: string;
};

export type ReportDefinition = Omit<GetReportsResponse, "reportParameters"> & {
	reportParameters?: Array<ReportParameter>;
};

export type ReportUpsertPayload = Omit<
	PostRepostRequest,
	"reportParameters"
> & {
	reportParameters?: Array<ReportParameter>;
	useReport?: boolean;
};

export type ReportsTemplate = Omit<
	GetReportsTemplateResponse,
	"allowedParameters"
> & {
	allowedParameters?: Array<ReportParameter>;
};

export type ReportExportTarget = "JSON" | "PRETTY_JSON" | "CSV" | "PDF" | "S3";

export type ReportParameterControl = "date" | "number" | "text" | "select";

export type ReportParameterOption = {
	value: string;
	label: string;
	meta?: Record<string, unknown>;
};

export type ReportParameterMetadata = {
	label: string;
	description: string;
	control: ReportParameterControl;
	requestKey: string;
	optionSource?: "parameterType";
	allowAll?: boolean;
	allValue?: string;
	placeholder?: string;
};

export type StructuredReportPayload = {
	columnHeaders?: Array<ResultsetColumnHeaderData>;
	data?: Array<{ row?: Array<Record<string, unknown>> }>;
};

export type ReportExecutionResponse =
	| {
			kind: "structured";
			contentType: string;
			data: unknown;
			rawText?: string;
	  }
	| {
			kind: "text";
			contentType: string;
			text: string;
	  }
	| {
			kind: "file";
			contentType: string;
			blob: Blob;
			filename?: string;
	  };

const EXPORT_TARGETS: ReportExportTarget[] = [
	"JSON",
	"PRETTY_JSON",
	"CSV",
	"PDF",
	"S3",
];

const PARAMETER_METADATA: Record<string, ReportParameterMetadata> = {
	startDateSelect: {
		label: "Start Date",
		description: "Lower bound for date-based report windows.",
		control: "date",
		requestKey: "startDate",
	},
	endDateSelect: {
		label: "End Date",
		description: "Upper bound for date-based report windows.",
		control: "date",
		requestKey: "endDate",
	},
	obligDateTypeSelect: {
		label: "Obligation Date Type",
		description: "Selects the obligation date dimension used by the report.",
		control: "select",
		requestKey: "obligDateType",
		optionSource: "parameterType",
	},
	OfficeIdSelectOne: {
		label: "Office",
		description: "Primary office or branch scope for the report.",
		control: "select",
		requestKey: "officeId",
		optionSource: "parameterType",
	},
	loanOfficerIdSelectAll: {
		label: "Loan Officer",
		description: "Loan officer filter. Defaults to all where supported.",
		control: "select",
		requestKey: "loanOfficerId",
		optionSource: "parameterType",
		allowAll: true,
		allValue: "-1",
	},
	currencyIdSelectAll: {
		label: "Currency",
		description: "Currency filter. Defaults to all currencies where supported.",
		control: "select",
		requestKey: "currencyId",
		optionSource: "parameterType",
		allowAll: true,
		allValue: "-1",
	},
	fundIdSelectAll: {
		label: "Fund",
		description: "Fund filter. Defaults to all funds where supported.",
		control: "select",
		requestKey: "fundId",
		optionSource: "parameterType",
		allowAll: true,
		allValue: "-1",
	},
	loanProductIdSelectAll: {
		label: "Loan Product",
		description:
			"Loan product filter. Defaults to all products where supported.",
		control: "select",
		requestKey: "loanProductId",
		optionSource: "parameterType",
		allowAll: true,
		allValue: "-1",
	},
	loanPurposeIdSelectAll: {
		label: "Loan Purpose",
		description: "Loan purpose filter. Defaults to all values where supported.",
		control: "select",
		requestKey: "loanPurposeId",
		optionSource: "parameterType",
		allowAll: true,
		allValue: "-1",
	},
	parTypeSelect: {
		label: "PAR Type",
		description: "Portfolio-at-risk grouping or aging mode.",
		control: "select",
		requestKey: "parType",
		optionSource: "parameterType",
	},
	selectAccount: {
		label: "Account Number",
		description: "Account identifier used for account-scoped reports.",
		control: "text",
		requestKey: "accountNo",
		placeholder: "Enter the account number",
	},
	savingsProductIdSelectAll: {
		label: "Savings Product",
		description: "Savings product filter for savings reports.",
		control: "select",
		requestKey: "savingsProductId",
		optionSource: "parameterType",
		allowAll: true,
		allValue: "-1",
	},
	transactionId: {
		label: "Transaction ID",
		description: "Specific transaction identifier required by receipt reports.",
		control: "number",
		requestKey: "transactionId",
	},
	selectCenterId: {
		label: "Center ID",
		description: "Center identifier used by center-assignment reports.",
		control: "number",
		requestKey: "centerId",
	},
	SelectGLAccountNO: {
		label: "GL Account",
		description: "General ledger account filter for accounting reports.",
		control: "select",
		requestKey: "GLAccountNO",
		optionSource: "parameterType",
	},
	asOnDate: {
		label: "As On Date",
		description: "Snapshot date for point-in-time balances.",
		control: "date",
		requestKey: "ondate",
	},
	SavingsAccountSubStatus: {
		label: "Savings Sub-Status",
		description: "Dormancy or sub-status filter for savings accounts.",
		control: "select",
		requestKey: "SavingsAccountSubStatus",
		optionSource: "parameterType",
	},
	cycleXSelect: {
		label: "Cycle X",
		description: "Lower cycle threshold used by cycle-based SMS reports.",
		control: "number",
		requestKey: "cycleX",
	},
	cycleYSelect: {
		label: "Cycle Y",
		description: "Upper cycle threshold used by cycle-based SMS reports.",
		control: "number",
		requestKey: "cycleY",
	},
	fromXSelect: {
		label: "From X",
		description: "Lower bound for relative day-range filters.",
		control: "number",
		requestKey: "fromX",
	},
	toYSelect: {
		label: "To Y",
		description: "Upper bound for relative day-range filters.",
		control: "number",
		requestKey: "toY",
	},
	overdueXSelect: {
		label: "Overdue X",
		description: "Lower bound for overdue day filters.",
		control: "number",
		requestKey: "overdueX",
	},
	overdueYSelect: {
		label: "Overdue Y",
		description: "Upper bound for overdue day filters.",
		control: "number",
		requestKey: "overdueY",
	},
	DefaultLoan: {
		label: "Loan ID",
		description:
			"Loan identifier required by loan-triggered notification reports.",
		control: "number",
		requestKey: "loanId",
	},
	DefaultClient: {
		label: "Client ID",
		description: "Client identifier required by client-triggered reports.",
		control: "number",
		requestKey: "clientId",
	},
	DefaultGroup: {
		label: "Group ID",
		description: "Group identifier required by group-triggered reports.",
		control: "number",
		requestKey: "groupId",
	},
	SelectLoanType: {
		label: "Loan Type",
		description:
			"Loan type selector used by triggered loan notification reports.",
		control: "select",
		requestKey: "loanType",
		optionSource: "parameterType",
	},
	DefaultSavings: {
		label: "Savings Account ID",
		description:
			"Savings account identifier required by savings-triggered reports.",
		control: "number",
		requestKey: "savingsId",
	},
	DefaultSavingsTransactionId: {
		label: "Savings Transaction ID",
		description:
			"Savings transaction identifier required by deposit and withdrawal reports.",
		control: "number",
		requestKey: "savingsTransactionId",
	},
};

function isRecord(value: unknown): value is AnyRecord {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function parseJsonSafely(response: Response): Promise<unknown> {
	const raw = await response.text();
	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return raw;
	}
}

function parseFilename(contentDisposition: string | null) {
	if (!contentDisposition) {
		return undefined;
	}

	const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
	if (utf8Match?.[1]) {
		return decodeURIComponent(utf8Match[1]);
	}

	const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
	return plainMatch?.[1];
}

function readCellValue(cell: unknown): unknown {
	if (!isRecord(cell)) {
		return cell;
	}

	if ("value" in cell) {
		return cell.value;
	}

	const values = Object.values(cell);
	return values.length === 1 ? values[0] : cell;
}

export function getReportParameterMetadata(
	parameter: ReportParameter,
): ReportParameterMetadata {
	const parameterName = parameter.parameterName || "";
	const fallbackKey = parameterName.replace(/Select(One|All)$/u, "");
	const base =
		PARAMETER_METADATA[parameterName] ||
		({
			label: parameterName || "Parameter",
			description: "Report-specific parameter.",
			control: "text",
			requestKey:
				parameter.reportParameterName ||
				(fallbackKey
					? fallbackKey.charAt(0).toLowerCase() + fallbackKey.slice(1)
					: "value"),
		} satisfies ReportParameterMetadata);

	return {
		...base,
		requestKey: parameter.reportParameterName || base.requestKey,
	};
}

export function normalizeAvailableExportTargets(
	payload: unknown,
): ReportExportTarget[] {
	let candidates: unknown[] = [];

	if (Array.isArray(payload)) {
		candidates = payload;
	} else if (isRecord(payload) && Array.isArray(payload.availableExports)) {
		candidates = payload.availableExports;
	}

	const resolved = candidates
		.filter(
			(value): value is string =>
				typeof value === "string" && value.trim().length > 0,
		)
		.map((value) => value.toUpperCase())
		.filter((value): value is ReportExportTarget =>
			EXPORT_TARGETS.includes(value as ReportExportTarget),
		);

	if (!resolved.includes("JSON")) {
		resolved.unshift("JSON");
	}

	return [...new Set(resolved)];
}

export function createReportSearchParams(
	values: Record<string, string>,
	exportTarget: ReportExportTarget,
) {
	const params = new URLSearchParams();

	for (const [requestKey, value] of Object.entries(values)) {
		if (value.trim().length === 0) {
			continue;
		}

		params.set(`R_${requestKey}`, value);
	}

	switch (exportTarget) {
		case "JSON":
			params.set("exportJSON", "true");
			break;
		case "PRETTY_JSON":
			params.set("pretty", "true");
			break;
		case "CSV":
			params.set("exportCSV", "true");
			break;
		case "PDF":
			params.set("exportPDF", "true");
			break;
		case "S3":
			params.set("exportS3", "true");
			break;
	}

	return params;
}

export function normalizeResultsetRows(payload: StructuredReportPayload) {
	const columnHeaders = payload.columnHeaders || [];
	const rows = payload.data || [];

	return rows.map((row, rowIndex) => {
		const mapped: Record<string, unknown> = {};
		const values = row.row || [];

		for (const [columnIndex, header] of columnHeaders.entries()) {
			const key = header.columnName || `column_${columnIndex + 1}`;
			mapped[key] = readCellValue(values[columnIndex]);
		}

		return {
			id: String(rowIndex),
			values: mapped,
		};
	});
}

export function normalizeParameterOptions(
	payload: unknown,
): ReportParameterOption[] {
	if (Array.isArray(payload)) {
		return payload.flatMap((item, index) => {
			if (typeof item === "string" || typeof item === "number") {
				return [
					{
						value: String(item),
						label: String(item),
					},
				];
			}

			if (!isRecord(item)) {
				return [];
			}

			const record = item;
			const idValue =
				record.id ??
				record.officeId ??
				record.staffId ??
				record.loanOfficerId ??
				record.value ??
				index;
			const labelValue =
				record.name ??
				record.displayName ??
				record.label ??
				record.code ??
				record.value ??
				idValue;

			return [
				{
					value: String(idValue),
					label: String(labelValue),
					meta: record,
				},
			];
		});
	}

	if (
		isRecord(payload) &&
		Array.isArray(payload.columnHeaders) &&
		Array.isArray(payload.data)
	) {
		const normalizedRows = normalizeResultsetRows(
			payload as StructuredReportPayload,
		);

		return normalizedRows.flatMap((row) => {
			const entries = Object.entries(row.values);
			if (entries.length === 0) {
				return [];
			}

			const [firstEntry, secondEntry] = entries;
			const idValue = firstEntry?.[1];
			const labelValue =
				secondEntry?.[1] ??
				row.values.name ??
				row.values.label ??
				row.values.displayName ??
				idValue;

			if (idValue === undefined || idValue === null) {
				return [];
			}

			return [
				{
					value: String(idValue),
					label: String(labelValue),
					meta: row.values,
				},
			];
		});
	}

	return [];
}

export function isStructuredReportPayload(
	payload: unknown,
): payload is StructuredReportPayload {
	return isRecord(payload) && ("columnHeaders" in payload || "data" in payload);
}

async function parseSubmitResponse<T>(
	response: Response,
): Promise<T> {
	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return (await parseJsonSafely(response)) as T;
}

export async function fetchReports(
	tenantId: string,
): Promise<ReportDefinition[]> {
	const response = await fetch(BFF_ROUTES.reports, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return (await parseJsonSafely(response)) as ReportDefinition[];
}

export async function fetchReportById(
	tenantId: string,
	reportId: number,
	options?: {
		includeTemplate?: boolean;
	},
): Promise<ReportDefinition> {
	const url = options?.includeTemplate
		? `${BFF_ROUTES.reportById(reportId)}?template=true`
		: BFF_ROUTES.reportById(reportId);

	const response = await fetch(url, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return (await parseJsonSafely(response)) as ReportDefinition;
}

export async function createReportDefinition(
	tenantId: string,
	payload: ReportUpsertPayload,
): Promise<PostReportsResponse> {
	const response = await fetch(BFF_ROUTES.reports, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	return parseSubmitResponse<PostReportsResponse>(response);
}

export async function updateReportDefinition(
	tenantId: string,
	reportId: number,
	payload: ReportUpsertPayload,
): Promise<PutReportResponse> {
	const response = await fetch(BFF_ROUTES.reportById(reportId), {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	return parseSubmitResponse<PutReportResponse>(response);
}

export async function deleteReportDefinition(
	tenantId: string,
	reportId: number,
): Promise<DeleteReportsResponse> {
	const response = await fetch(BFF_ROUTES.reportById(reportId), {
		method: "DELETE",
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	return parseSubmitResponse<DeleteReportsResponse>(response);
}

export async function fetchReportsTemplate(
	tenantId: string,
): Promise<ReportsTemplate> {
	const response = await fetch(BFF_ROUTES.reportsTemplate, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return (await parseJsonSafely(response)) as ReportsTemplate;
}

export async function fetchReportsBranchMetadata(tenantId: string) {
	const response = await fetch(BFF_ROUTES.reportsPentahoEnforcement, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return parseJsonSafely(response);
}

export async function fetchReportAvailableExports(
	tenantId: string,
	reportName: string,
): Promise<ReportExportTarget[]> {
	const response = await fetch(BFF_ROUTES.reportAvailableExports(reportName), {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	const payload = await parseJsonSafely(response);
	return normalizeAvailableExportTargets(payload);
}

export async function fetchReportParameterOptions(
	tenantId: string,
	parameterName: string,
	values: Record<string, string>,
): Promise<ReportParameterOption[]> {
	const params = new URLSearchParams();
	params.set("parameterType", "true");
	params.set("exportJSON", "true");

	for (const [requestKey, value] of Object.entries(values)) {
		if (value.trim().length === 0) {
			continue;
		}

		params.set(`R_${requestKey}`, value);
	}

	const response = await fetch(
		`${BFF_ROUTES.runReport(parameterName)}?${params.toString()}`,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	const payload = await parseJsonSafely(response);
	return normalizeParameterOptions(payload);
}

export async function runReport(
	tenantId: string,
	reportName: string,
	values: Record<string, string>,
	exportTarget: ReportExportTarget,
): Promise<ReportExecutionResponse> {
	const params = createReportSearchParams(values, exportTarget);
	const response = await fetch(
		`${BFF_ROUTES.runReport(reportName)}?${params.toString()}`,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	const contentType =
		response.headers.get("content-type") || "application/json";

	if (
		contentType.includes("application/pdf") ||
		contentType.includes("text/csv") ||
		contentType.includes("application/octet-stream")
	) {
		return {
			kind: "file",
			contentType,
			blob: await response.blob(),
			filename: parseFilename(response.headers.get("content-disposition")),
		};
	}

	const raw = await response.text();
	if (!raw) {
		return {
			kind: "text",
			contentType,
			text: "",
		};
	}

	try {
		return {
			kind: "structured",
			contentType,
			data: JSON.parse(raw) as RunReportsResponse,
			rawText: raw,
		};
	} catch {
		return {
			kind: "text",
			contentType,
			text: raw,
		};
	}
}
