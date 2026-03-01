"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
	isStructuredReportPayload,
	normalizeResultsetRows,
	type ReportExecutionResponse,
	type ReportExportTarget,
} from "@/lib/fineract/reports";

interface ReportResultsPanelProps {
	isPending: boolean;
	result: ReportExecutionResponse | null;
	onDownloadExport?: (
		exportTarget: Exclude<ReportExportTarget, "JSON">,
	) => void;
}

export function ReportResultSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Skeleton className="h-5 w-32" />
				</CardTitle>
				<CardDescription>
					<Skeleton className="h-4 w-64" />
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

export function ReportResultsPanel({
	isPending,
	result,
	onDownloadExport,
}: ReportResultsPanelProps) {
	if (isPending && !result) {
		return <ReportResultSkeleton />;
	}

	if (!result) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No Results Yet</CardTitle>
					<CardDescription>
						Run the report from the Run Report tab to review the latest output
						here.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const structuredPayload =
		result.kind === "structured" &&
		isStructuredReportPayload(result.data) &&
		(result.data.columnHeaders?.length || 0) > 0
			? result.data
			: null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Latest Result</CardTitle>
				<CardDescription>
					Most recent successful report response for the current selection.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{structuredPayload && onDownloadExport ? (
					<div className="flex flex-wrap items-center justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onDownloadExport("CSV")}
							disabled={isPending}
						>
							<Download className="mr-2 h-4 w-4" />
							Download CSV
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onDownloadExport("PDF")}
							disabled={isPending}
						>
							<Download className="mr-2 h-4 w-4" />
							Download PDF
						</Button>
					</div>
				) : null}
				{structuredPayload ? (
					<DataTable
						data={normalizeResultsetRows(structuredPayload)}
						columns={(structuredPayload.columnHeaders || []).map((header) => ({
							header: header.columnName || "Column",
							cell: (row: { id: string; values: Record<string, unknown> }) => {
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
						{result.kind === "structured"
							? result.rawText || JSON.stringify(result.data, null, 2)
							: result.kind === "text"
								? result.text
								: "This export was downloaded and does not have an inline preview."}
					</pre>
				)}
			</CardContent>
		</Card>
	);
}
