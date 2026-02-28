"use client";

import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
	header: string;
	cell: (row: T) => React.ReactNode;
	className?: string;
	headerClassName?: string;
};

interface DataTableProps<T> {
	data: T[];
	columns: DataTableColumn<T>[];
	getRowId: (row: T) => string | number;
	pageSize?: number;
	pageIndex?: number;
	totalRows?: number;
	manualPagination?: boolean;
	onPageChange?: (nextPageIndex: number) => void;
	emptyMessage?: string;
	className?: string;
	onRowClick?: (row: T) => void;
	enableActions?: boolean;
	getViewUrl?: (row: T) => string;
}

export function DataTable<T>({
	data,
	columns,
	getRowId,
	pageSize = 10,
	pageIndex,
	totalRows,
	manualPagination = false,
	onPageChange,
	emptyMessage = "No records found.",
	className,
	onRowClick,
	enableActions,
	getViewUrl,
}: DataTableProps<T>) {
	const [internalPageIndex, setInternalPageIndex] = React.useState(0);
	const resolvedPageIndex = manualPagination
		? Math.max(0, pageIndex ?? 0)
		: internalPageIndex;
	const resolvedTotalRows = manualPagination
		? (totalRows ?? data.length)
		: data.length;
	const pageCount = Math.max(1, Math.ceil(resolvedTotalRows / pageSize));
	const clampedPageIndex = Math.min(resolvedPageIndex, pageCount - 1);

	React.useEffect(() => {
		if (!manualPagination && internalPageIndex !== clampedPageIndex) {
			setInternalPageIndex(clampedPageIndex);
		}
	}, [manualPagination, internalPageIndex, clampedPageIndex]);

	const start = clampedPageIndex * pageSize;
	const pageRows = manualPagination
		? data
		: data.slice(start, start + pageSize);
	const end =
		resolvedTotalRows === 0
			? 0
			: Math.min(start + pageRows.length, resolvedTotalRows);

	const goToPage = (nextPageIndex: number) => {
		if (manualPagination) {
			onPageChange?.(nextPageIndex);
			return;
		}

		setInternalPageIndex(nextPageIndex);
	};

	const columnsWithActions = enableActions
		? [
				...columns,
				{
					header: "Actions",
					cell: (row: T) => (
						<Button variant="outline" size="sm" asChild>
							<Link href={getViewUrl?.(row) || "#"}>
								<Eye className="mr-1 h-3 w-3" />
								View
							</Link>
						</Button>
					),
					className: "text-right",
					headerClassName: "text-right",
				},
			]
		: columns;

	return (
		<div className={cn("space-y-2", className)}>
			<div className="rounded-sm border border-border/60">
				<div className="w-full overflow-x-auto">
					<table className="min-w-max w-full text-left text-sm">
						<thead className="border-b border-border/60 bg-muted/40">
							<tr>
								{columnsWithActions.map((column) => (
									<th
										key={column.header}
										scope="col"
										className={cn(
											"whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
											column.headerClassName,
										)}
									>
										{column.header}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-border/60">
							{pageRows.length === 0 ? (
								<tr>
									<td
										colSpan={columnsWithActions.length}
										className="px-3 py-6 text-center text-sm text-muted-foreground"
									>
										{emptyMessage}
									</td>
								</tr>
							) : (
								pageRows.map((row) => (
									<tr
										key={getRowId(row)}
										className={cn(
											"hover:bg-accent/40",
											onRowClick && "cursor-pointer",
										)}
										onClick={() => onRowClick?.(row)}
									>
										{columnsWithActions.map((column) => (
											<td
												key={column.header}
												className={cn(
													"whitespace-nowrap px-3 py-2 align-middle",
													column.className,
												)}
											>
												{column.cell(row)}
											</td>
										))}
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
				<span>
					Showing {resolvedTotalRows === 0 ? 0 : start + 1}–{end} of{" "}
					{resolvedTotalRows}
				</span>
				<div className="flex flex-wrap items-center gap-2 sm:justify-end">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => goToPage(Math.max(clampedPageIndex - 1, 0))}
						disabled={clampedPageIndex === 0}
					>
						<ChevronLeft className="mr-2 h-4 w-4" />
						Previous
					</Button>
					<span className="min-w-fit">
						Page {clampedPageIndex + 1} of {pageCount}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							goToPage(Math.min(clampedPageIndex + 1, pageCount - 1))
						}
						disabled={clampedPageIndex >= pageCount - 1}
					>
						<ChevronRight className="mr-2 h-4 w-4" />
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
