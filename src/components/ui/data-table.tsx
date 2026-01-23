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
	pageSize = 8,
	emptyMessage = "No records found.",
	className,
	onRowClick,
	enableActions,
	getViewUrl,
}: DataTableProps<T>) {
	const [pageIndex, setPageIndex] = React.useState(0);
	const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
	const clampedPageIndex = Math.min(pageIndex, pageCount - 1);

	React.useEffect(() => {
		if (pageIndex !== clampedPageIndex) {
			setPageIndex(clampedPageIndex);
		}
	}, [pageIndex, clampedPageIndex]);

	const start = clampedPageIndex * pageSize;
	const end = Math.min(start + pageSize, data.length);
	const pageRows = data.slice(start, start + pageSize);

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
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border/60 bg-muted/40">
						<tr>
							{columnsWithActions.map((column) => (
								<th
									key={column.header}
									scope="col"
									className={cn(
										"px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
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
											className={cn("px-3 py-2 align-middle", column.className)}
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

			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>
					Showing {data.length === 0 ? 0 : start + 1}–{end} of {data.length}
				</span>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
						disabled={clampedPageIndex === 0}
					>
						<ChevronLeft className="w-4 h-4 mr-2" />
						Previous
					</Button>
					<span>
						Page {clampedPageIndex + 1} of {pageCount}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							setPageIndex((prev) => Math.min(prev + 1, pageCount - 1))
						}
						disabled={clampedPageIndex >= pageCount - 1}
					>
						<ChevronRight className="w-4 h-4 mr-2" />
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
