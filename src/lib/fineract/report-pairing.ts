import type { GetReportsResponse } from "@/lib/fineract/generated/types.gen";

const PENTAHO_SUFFIX_REGEX = /\s*\(\s*pentaho\s*\)\s*$/i;
const PENTAHO_WORD_REGEX = /\bpentaho\b/i;

export const STRICT_REPORT_PERMISSION_CODES = [
	"ALL_FUNCTIONS",
	"ALL_FUNCTIONS_READ",
	"REPORTING_SUPER_USER",
] as const;

export type StrictReportPermissionCode =
	(typeof STRICT_REPORT_PERMISSION_CODES)[number];

export interface ReportCatalogItem {
	id?: number;
	reportName?: string;
	reportType?: string;
	reportSubType?: string;
	useReport?: boolean;
	coreReport?: boolean;
}

export interface TablePentahoPair {
	baseName: string;
	tableReport: ReportCatalogItem;
	pentahoReport: ReportCatalogItem;
}

function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

export function normalizeReportName(reportName: string | undefined): string {
	if (!reportName) {
		return "";
	}
	return normalizeWhitespace(reportName);
}

export function getReportBaseName(reportName: string | undefined): string {
	const normalized = normalizeReportName(reportName);
	if (!normalized) {
		return "";
	}
	return normalizeWhitespace(normalized.replace(PENTAHO_SUFFIX_REGEX, ""));
}

export function isPentahoReport(report: ReportCatalogItem): boolean {
	const reportName = normalizeReportName(report.reportName);
	const reportType = normalizeReportName(report.reportType);
	const reportSubType = normalizeReportName(report.reportSubType);

	return (
		PENTAHO_SUFFIX_REGEX.test(reportName) ||
		PENTAHO_WORD_REGEX.test(reportType) ||
		PENTAHO_WORD_REGEX.test(reportSubType)
	);
}

function toSortableName(report: ReportCatalogItem): string {
	return normalizeReportName(report.reportName).toLowerCase();
}

function byReportName(a: ReportCatalogItem, b: ReportCatalogItem): number {
	return toSortableName(a).localeCompare(toSortableName(b));
}

function rankPentahoCandidate(
	tableName: string,
	pentahoName: string,
): [number, string] {
	const normalizedTable = normalizeReportName(tableName).toLowerCase();
	const normalizedPentaho = normalizeReportName(pentahoName).toLowerCase();
	const tightMatch = `${normalizedTable}(pentaho)`;
	const spacedMatch = `${normalizedTable} (pentaho)`;

	if (normalizedPentaho === tightMatch || normalizedPentaho === spacedMatch) {
		return [0, normalizedPentaho];
	}

	if (getReportBaseName(normalizedPentaho) === normalizedTable) {
		return [1, normalizedPentaho];
	}

	return [2, normalizedPentaho];
}

function toBestPentahoCandidate(
	tableReport: ReportCatalogItem,
	pentahoReports: ReportCatalogItem[],
): ReportCatalogItem | null {
	const tableName = normalizeReportName(tableReport.reportName);
	if (!tableName || pentahoReports.length === 0) {
		return null;
	}

	let winner: ReportCatalogItem | null = null;
	let winnerRank: [number, string] = [Number.POSITIVE_INFINITY, ""];

	for (const candidate of pentahoReports) {
		const candidateName = normalizeReportName(candidate.reportName);
		if (!candidateName) {
			continue;
		}

		const rank = rankPentahoCandidate(tableName, candidateName);
		if (
			rank[0] < winnerRank[0] ||
			(rank[0] === winnerRank[0] && rank[1].localeCompare(winnerRank[1]) < 0)
		) {
			winner = candidate;
			winnerRank = rank;
		}
	}

	return winner;
}

export function discoverTablePentahoPairs(
	reports: ReportCatalogItem[],
): TablePentahoPair[] {
	const grouped = new Map<
		string,
		{ tableReports: ReportCatalogItem[]; pentahoReports: ReportCatalogItem[] }
	>();

	for (const report of reports) {
		const reportName = normalizeReportName(report.reportName);
		if (!reportName) {
			continue;
		}

		const baseName = getReportBaseName(reportName);
		if (!baseName) {
			continue;
		}

		const group = grouped.get(baseName) || {
			tableReports: [],
			pentahoReports: [],
		};
		if (isPentahoReport(report)) {
			group.pentahoReports.push(report);
		} else {
			group.tableReports.push(report);
		}
		grouped.set(baseName, group);
	}

	const pairs: TablePentahoPair[] = [];
	for (const [baseName, group] of grouped.entries()) {
		if (group.tableReports.length === 0 || group.pentahoReports.length === 0) {
			continue;
		}

		const sortedTables = [...group.tableReports].sort(byReportName);
		const sortedPentahos = [...group.pentahoReports].sort(byReportName);

		for (const tableReport of sortedTables) {
			const pentahoReport =
				toBestPentahoCandidate(tableReport, sortedPentahos) ||
				sortedPentahos[0];
			if (!pentahoReport) {
				continue;
			}

			pairs.push({
				baseName,
				tableReport,
				pentahoReport,
			});
		}
	}

	return pairs.sort((a, b) => a.baseName.localeCompare(b.baseName));
}

export function toReportReadPermissionCode(
	reportName: string | undefined,
): string | null {
	const normalizedName = normalizeReportName(reportName);
	if (!normalizedName) {
		return null;
	}
	return `READ_${normalizedName}`;
}

export function toReportCatalogItems(
	reports: GetReportsResponse[],
): ReportCatalogItem[] {
	return reports.map((report) => ({
		id: report.id,
		reportName: report.reportName,
		reportType: report.reportType,
		reportSubType: report.reportSubType,
		useReport: report.useReport,
		coreReport: report.coreReport,
	}));
}
