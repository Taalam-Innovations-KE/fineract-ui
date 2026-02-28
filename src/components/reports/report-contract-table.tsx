"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	getReportParameterMetadata,
	type ReportParameter,
} from "@/lib/fineract/reports";

interface ReportContractTableProps {
	parameters: ReportParameter[];
}

interface ReportContractTableSkeletonProps {
	rowCount?: number;
}

export function ReportContractTableSkeleton({
	rowCount = 4,
}: ReportContractTableSkeletonProps) {
	return (
		<div className="rounded-sm border border-border/60">
			<Table>
				<TableHeader>
					<TableRow>
						{Array.from({ length: 4 }).map((_, index) => (
							<TableHead key={`report-contract-header-${index}`}>
								<Skeleton className="h-4 w-24" />
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: rowCount }).map((_, rowIndex) => (
						<TableRow key={`report-contract-row-${rowIndex}`}>
							<TableCell>
								<div className="space-y-1">
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-3 w-20" />
								</div>
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-24" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-5 w-16" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-full" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

export function ReportContractTable({ parameters }: ReportContractTableProps) {
	if (parameters.length === 0) {
		return (
			<div className="rounded-sm border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
				No parameters declared for this report.
			</div>
		);
	}

	return (
		<div className="rounded-sm border border-border/60">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Parameter</TableHead>
						<TableHead>Request Key</TableHead>
						<TableHead>Control</TableHead>
						<TableHead className="w-[32rem] whitespace-normal">Notes</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{parameters.map((parameter) => {
						const metadata = getReportParameterMetadata(parameter);
						return (
							<TableRow key={`definition-${parameter.parameterName}`}>
								<TableCell>
									<div className="space-y-1">
										<div className="font-medium">{metadata.label}</div>
										<div className="text-xs text-muted-foreground">
											{parameter.parameterName}
										</div>
									</div>
								</TableCell>
								<TableCell>
									<code>R_{metadata.requestKey}</code>
								</TableCell>
								<TableCell>
									<Badge variant="outline">{metadata.control}</Badge>
								</TableCell>
								<TableCell className="max-w-[32rem] align-top whitespace-normal break-words text-sm text-muted-foreground">
									{metadata.description}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
