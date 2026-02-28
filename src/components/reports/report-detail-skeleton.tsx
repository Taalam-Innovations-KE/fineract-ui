"use client";

import { ReportParameterFieldsSkeleton } from "@/components/reports/report-parameter-fields";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ReportDetailSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={`summary-${index}`}>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded-sm" />
								<div className="space-y-2">
									<Skeleton className="h-7 w-14" />
									<Skeleton className="h-4 w-28" />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>
						<Skeleton className="h-5 w-48" />
					</CardTitle>
					<CardDescription>
						<Skeleton className="h-4 w-72" />
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<ReportParameterFieldsSkeleton />
					<div className="flex justify-end gap-2">
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-36" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
