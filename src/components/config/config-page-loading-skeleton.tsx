import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SUMMARY_CARD_SKELETONS = [
	"summary-card-1",
	"summary-card-2",
	"summary-card-3",
] as const;

const TABLE_ROW_SKELETONS = [
	"table-row-1",
	"table-row-2",
	"table-row-3",
	"table-row-4",
	"table-row-5",
	"table-row-6",
	"table-row-7",
	"table-row-8",
] as const;

export function ConfigPageLoadingSkeleton() {
	return (
		<div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-2">
					<Skeleton className="h-8 w-56" />
					<Skeleton className="h-4 w-80 max-w-full" />
				</div>
				<Skeleton className="h-9 w-32" />
			</div>

			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{SUMMARY_CARD_SKELETONS.map((item) => (
						<Card key={item}>
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
							<Skeleton className="h-6 w-48" />
						</CardTitle>
						<Skeleton className="h-4 w-64 max-w-full" />
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="grid grid-cols-4 gap-3 border-b border-border/60 pb-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-4 w-12 justify-self-end" />
							</div>
							{TABLE_ROW_SKELETONS.map((item) => (
								<div
									key={item}
									className="grid grid-cols-4 gap-3 border-b border-border/40 py-2 last:border-b-0"
								>
									<Skeleton className="h-4 w-32 max-w-full" />
									<Skeleton className="h-4 w-24 max-w-full" />
									<Skeleton className="h-4 w-20 max-w-full" />
									<Skeleton className="h-8 w-16 justify-self-end" />
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
