"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportsCatalogSkeletonProps {
	rowCount?: number;
}

export function ReportsCatalogSkeleton({
	rowCount = 10,
}: ReportsCatalogSkeletonProps) {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={`summary-${index}`}>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded-sm" />
								<div className="space-y-2">
									<Skeleton className="h-7 w-16" />
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
						<Skeleton className="h-5 w-32" />
					</CardTitle>
					<CardDescription>
						<Skeleton className="h-4 w-72" />
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<div className="grid gap-4 md:grid-cols-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						<Skeleton className="h-5 w-40" />
					</CardTitle>
					<CardDescription>
						<Skeleton className="h-4 w-56" />
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<Skeleton className="h-10 w-full" />
					{Array.from({ length: rowCount }).map((_, index) => (
						<Skeleton key={`report-row-${index}`} className="h-12 w-full" />
					))}
				</CardContent>
			</Card>
		</div>
	);
}
