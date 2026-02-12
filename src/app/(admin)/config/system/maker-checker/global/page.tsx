"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";

type GlobalConfig = {
	enabled: boolean;
};

async function fetchGlobalConfig(): Promise<GlobalConfig> {
	const response = await fetch("/api/maker-checker/global", {
		cache: "no-store",
	});

	if (!response.ok) {
		const errorPayload = await response
			.json()
			.catch(() => ({ message: "Failed to load global configuration" }));
		throw errorPayload;
	}

	return response.json();
}

async function updateGlobalConfig(enabled: boolean): Promise<void> {
	const response = await fetch("/api/maker-checker/global", {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ enabled }),
	});

	if (!response.ok) {
		const errorPayload = await response
			.json()
			.catch(() => ({ message: "Failed to update global configuration" }));
		throw errorPayload;
	}
}

function GlobalPageSkeleton() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-56" />
					<Skeleton className="h-4 w-[34rem]" />
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2">
						<Skeleton className="h-4 w-4 rounded-sm" />
						<Skeleton className="h-4 w-56" />
					</div>
					<Skeleton className="h-16 w-full" />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
				</CardHeader>
				<CardContent className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-[26rem]" />
				</CardContent>
			</Card>
		</div>
	);
}

export default function GlobalPage() {
	const queryClient = useQueryClient();
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const { data, isLoading, error } = useQuery({
		queryKey: ["maker-checker-global"],
		queryFn: fetchGlobalConfig,
	});

	const updateMutation = useMutation({
		mutationFn: (enabled: boolean) => updateGlobalConfig(enabled),
		onSuccess: (_, enabled) => {
			setSubmitError(null);
			queryClient.setQueryData<GlobalConfig>(["maker-checker-global"], {
				enabled,
			});
			queryClient.invalidateQueries({ queryKey: ["maker-checker-impact"] });
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "updateMakerCheckerGlobalConfig",
					endpoint: "/api/maker-checker/global",
					method: "PUT",
				}),
			);
		},
	});

	const enabled = data?.enabled ?? false;

	return (
		<PageShell
			title="Global Maker Checker Settings"
			subtitle="Enable maker-checker platform-wide. Task-level permissions still determine which operations require approval."
			actions={
				<Button variant="outline" asChild>
					<Link href="/config/system/maker-checker">
						<ArrowLeft className="h-4 w-4" />
						Back to Maker Checker
					</Link>
				</Button>
			}
		>
			{isLoading ? (
				<GlobalPageSkeleton />
			) : error ? (
				<Alert variant="destructive">
					<AlertTitle>Unable to load global configuration</AlertTitle>
					<AlertDescription>
						Refresh and try again. If this persists, confirm your permissions
						and API availability.
					</AlertDescription>
				</Alert>
			) : (
				<div className="space-y-6">
					<Card>
						<CardHeader className="space-y-1.5">
							<div className="flex items-center justify-between gap-3">
								<CardTitle>Maker Checker System</CardTitle>
								<Badge variant={enabled ? "success" : "secondary"}>
									{enabled ? "Enabled" : "Disabled"}
								</Badge>
							</div>
							<p className="text-sm text-muted-foreground">
								When enabled, operations configured for maker-checker will move
								to checker approval instead of executing immediately.
							</p>
						</CardHeader>
						<CardContent className="space-y-4">
							<SubmitErrorAlert
								error={submitError}
								title="Failed to update global configuration"
							/>

							<div className="flex items-center gap-2">
								<Checkbox
									id="maker-checker-global-toggle"
									checked={enabled}
									onCheckedChange={(checked) =>
										updateMutation.mutate(checked === true)
									}
									disabled={updateMutation.isPending}
								/>
								<label
									htmlFor="maker-checker-global-toggle"
									className="text-sm font-medium"
								>
									Enable Maker Checker Globally
								</label>
							</div>

							<Alert>
								<AlertTitle>Operational impact</AlertTitle>
								<AlertDescription>
									{enabled
										? "Maker-checker is active. Users can submit maker actions and checkers can approve or reject from inbox."
										: "Maker-checker is disabled. Transactions execute directly even if maker-checker permissions are marked."}
								</AlertDescription>
							</Alert>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="space-y-1.5">
							<CardTitle>Next Step</CardTitle>
						</CardHeader>
						<CardContent>
							<Button variant="outline" asChild>
								<Link href="/config/system/maker-checker/tasks">
									Configure Task Permissions
									<ArrowRight className="h-4 w-4" />
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			)}
		</PageShell>
	);
}
