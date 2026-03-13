import { z } from "zod";
import type {
	ReportDefinition,
	ReportParameter,
	ReportUpsertPayload,
} from "@/lib/fineract/reports";
import {
	getReportParameterMetadata,
	getReportParameterRuntimeName,
	type ReportParameterCatalogEntry,
} from "@/lib/fineract/reports";

export const REPORT_SQL_SYSTEM_PLACEHOLDERS = [
	"currentUserHierarchy",
	"currentUserId",
	"isSelfServiceUser",
	"currentDate",
] as const;

const REPORT_PARAMETER_ALIAS_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/u;
const SQL_PLACEHOLDER_PATTERN = /\$\{([A-Za-z0-9_]+)\}/gu;

const reportParameterLinkSchema = z.object({
	id: z.number().int().positive().optional(),
	parameterId: z.number().int().positive("Select a report parameter."),
	parameterName: z.string().trim().min(1).optional(),
	reportParameterName: z
		.string()
		.trim()
		.refine(
			(value) =>
				value.length === 0 || REPORT_PARAMETER_ALIAS_PATTERN.test(value),
			"Alias must start with a letter and only use letters, numbers, or underscores.",
		),
});

const reportUpsertSchemaBase = z.object({
	reportName: z.string().trim().min(1, "Report name is required."),
	reportType: z.string().trim().min(1, "Report type is required."),
	reportSubType: z.string().trim(),
	reportCategory: z.string().trim(),
	description: z.string().trim(),
	reportSql: z.string(),
	useReport: z.boolean(),
	reportParameters: z.array(reportParameterLinkSchema),
});

export type ReportParameterFormValue = z.infer<
	typeof reportParameterLinkSchema
>;
export type ReportUpsertFormValues = z.infer<typeof reportUpsertSchemaBase>;

export type ReportValidationParameterDefinition = {
	parameterId: number;
	parameterName?: string;
	runtimeName: string;
	label: string;
};

type CreateReportUpsertSchemaOptions = {
	allowedReportTypes?: string[];
	allowedChartSubTypes?: string[];
	parameterDefinitions?: ReportValidationParameterDefinition[];
};

function normalizeValue(value?: string) {
	return value?.trim() || undefined;
}

function normalizeParameterLinks(
	parameters?: ReportDefinition["reportParameters"],
): ReportParameterFormValue[] {
	const normalized: ReportParameterFormValue[] = [];

	for (const parameter of parameters || []) {
		const parameterId = parameter.parameterId ?? parameter.id;
		if (!parameterId) {
			continue;
		}

		normalized.push({
			id: parameter.id,
			parameterId,
			parameterName: parameter.parameterName?.trim() || undefined,
			reportParameterName: parameter.reportParameterName?.trim() || "",
		});
	}

	return normalized;
}

export function buildReportUpsertFormValues(
	report?: ReportDefinition,
): ReportUpsertFormValues {
	return {
		reportName: report?.reportName?.trim() || "",
		reportType: report?.reportType?.trim() || "",
		reportSubType: report?.reportSubType?.trim() || "",
		reportCategory: report?.reportCategory?.trim() || "",
		description: report?.description?.trim() || "",
		reportSql: report?.reportSql?.trim() || "",
		useReport: report?.useReport !== false,
		reportParameters: normalizeParameterLinks(report?.reportParameters),
	};
}

export function buildReportValidationDefinitions(
	parameters: ReportParameter[],
	catalogEntries: ReportParameterCatalogEntry[],
): ReportValidationParameterDefinition[] {
	const byId = new Map<number, ReportParameterCatalogEntry>();
	const byName = new Map<string, ReportParameterCatalogEntry>();

	for (const entry of catalogEntries) {
		if (entry.id !== undefined) {
			byId.set(entry.id, entry);
		}
		byName.set(entry.parameterName.toLowerCase(), entry);
	}

	return parameters.flatMap((parameter) => {
		const parameterId = parameter.parameterId ?? parameter.id;
		if (!parameterId) {
			return [];
		}

		const entry =
			byId.get(parameterId) ||
			(parameter.parameterName
				? byName.get(parameter.parameterName.toLowerCase())
				: undefined);
		const fallback = getReportParameterMetadata(parameter);

		return [
			{
				parameterId,
				parameterName: parameter.parameterName,
				runtimeName: getReportParameterRuntimeName(parameter, entry),
				label: entry?.parameterLabel || fallback.label,
			},
		];
	});
}

export function createReportUpsertSchema({
	allowedReportTypes = [],
	allowedChartSubTypes = ["Bar", "Pie"],
	parameterDefinitions = [],
}: CreateReportUpsertSchemaOptions = {}) {
	const reportTypeSet = new Set(
		allowedReportTypes
			.map((value) => value.trim())
			.filter((value) => value.length > 0),
	);
	const chartSubtypeSet = new Set(
		allowedChartSubTypes
			.map((value) => value.trim())
			.filter((value) => value.length > 0),
	);
	const parameterDefinitionMap = new Map(
		parameterDefinitions.map((parameter) => [parameter.parameterId, parameter]),
	);
	const reservedPlaceholders = new Set(
		REPORT_SQL_SYSTEM_PLACEHOLDERS.map((value) => value.toLowerCase()),
	);

	return reportUpsertSchemaBase.superRefine((data, context) => {
		const reportType = data.reportType.trim();
		const reportSubType = data.reportSubType.trim();
		const reportSql = data.reportSql.trim();

		if (reportTypeSet.size > 0 && !reportTypeSet.has(reportType)) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["reportType"],
				message: "Select a supported report type.",
			});
		}

		if (reportType === "Chart") {
			if (!reportSubType) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["reportSubType"],
					message: "Chart reports require a sub-type.",
				});
			} else if (
				chartSubtypeSet.size > 0 &&
				!chartSubtypeSet.has(reportSubType)
			) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["reportSubType"],
					message: "Select a supported chart sub-type.",
				});
			}
		}

		if ((reportType === "Table" || reportType === "Chart") && !reportSql) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["reportSql"],
				message: "Table and Chart reports require report SQL.",
			});
		}

		const runtimeNames = new Map<string, number>();
		for (const [index, parameter] of data.reportParameters.entries()) {
			const definition = parameterDefinitionMap.get(parameter.parameterId);
			const runtimeName =
				normalizeValue(parameter.reportParameterName) ||
				definition?.runtimeName;

			if (!runtimeName) {
				continue;
			}

			const normalizedRuntimeName = runtimeName.toLowerCase();
			if (reservedPlaceholders.has(normalizedRuntimeName)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["reportParameters", index, "reportParameterName"],
					message:
						"Alias conflicts with a reserved system placeholder. Choose another alias.",
				});
			}

			const duplicateIndex = runtimeNames.get(normalizedRuntimeName);
			if (duplicateIndex !== undefined) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["reportParameters", index, "reportParameterName"],
					message:
						"Each selected report parameter must resolve to a unique runtime key.",
				});
			} else {
				runtimeNames.set(normalizedRuntimeName, index);
			}
		}

		if (reportSql) {
			const placeholders = [...reportSql.matchAll(SQL_PLACEHOLDER_PATTERN)].map(
				(match) => match[1],
			);
			const availableRuntimeNames = new Set(runtimeNames.keys());
			const unresolved = [...new Set(placeholders)]
				.filter(Boolean)
				.filter(
					(placeholder) =>
						!reservedPlaceholders.has(placeholder.toLowerCase()) &&
						!availableRuntimeNames.has(placeholder.toLowerCase()),
				);

			if (unresolved.length > 0) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["reportSql"],
					message: `SQL placeholders must match selected report parameters or supported system placeholders. Missing: ${unresolved.join(", ")}.`,
				});
			}
		}
	});
}

export function reportUpsertFormValuesToPayload(
	values: ReportUpsertFormValues,
): ReportUpsertPayload {
	return {
		reportName: values.reportName.trim(),
		reportType: normalizeValue(values.reportType),
		reportSubType: normalizeValue(values.reportSubType),
		reportCategory: normalizeValue(values.reportCategory),
		description: normalizeValue(values.description),
		reportSql: normalizeValue(values.reportSql),
		useReport: values.useReport,
		reportParameters: values.reportParameters.map((parameter) => ({
			id: parameter.id,
			parameterId: parameter.parameterId,
			reportParameterName: normalizeValue(parameter.reportParameterName),
		})),
	};
}
