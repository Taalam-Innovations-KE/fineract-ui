import type { ReportDefinition } from "@/lib/fineract/reports";

function decodeRouteId(routeId: string) {
	try {
		return decodeURIComponent(routeId);
	} catch {
		return routeId;
	}
}

export function getReportRouteId(
	report: Pick<ReportDefinition, "id" | "reportName">,
) {
	if (report.id !== undefined && report.id !== null) {
		return String(report.id);
	}

	const reportName = report.reportName?.trim();
	return reportName ? encodeURIComponent(reportName) : "report";
}

export function findReportByRouteId(
	reports: ReportDefinition[],
	routeId: string,
) {
	const decodedRouteId = decodeRouteId(routeId);

	return (
		reports.find((report) => {
			if (
				report.id !== undefined &&
				report.id !== null &&
				String(report.id) === routeId
			) {
				return true;
			}

			return (report.reportName?.trim() || "") === decodedRouteId;
		}) || null
	);
}
