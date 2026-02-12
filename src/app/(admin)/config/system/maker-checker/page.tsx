"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Workflow } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type MakerCheckerImpact = {
	totalPermissions: number;
	enabledPermissions: number;
	totalUsers: number;
	superCheckerUsers: number;
	pendingApprovals: number;
};

type GlobalConfig = {
	enabled: boolean;
};

async function fetchImpact(): Promise<MakerCheckerImpact> {
	const response = await fetch("/api/maker-checker/impact", {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch maker checker impact");
	}

	return response.json();
}

async function fetchGlobalConfig(): Promise<GlobalConfig> {
	const response = await fetch("/api/maker-checker/global", {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch maker checker global configuration");
	}

	return response.json();
}

function OverviewSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={`maker-checker-metric-skeleton-${index}`}>
						<CardContent className="pt-6">
							<div className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-8 w-16" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<Card key={`maker-checker-link-skeleton-${index}`}>
						<CardHeader>
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-4 w-full" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-9 w-44" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

export default function MakerCheckerPage() {
	const {
		data: impact,
		isLoading: impactLoading,
		error: impactError,
	} = useQuery({
		queryKey: ["maker-checker-impact"],
		queryFn: fetchImpact,
	});

	const {
		data: globalConfig,
		isLoading: globalLoading,
		error: globalError,
	} = useQuery({
		queryKey: ["maker-checker-global"],
		queryFn: fetchGlobalConfig,
	});

	const isLoading = impactLoading || globalLoading;
	const hasError = impactError || globalError;

	return (
		<PageShell
			title="Maker Checker"
			subtitle="Control approval workflows, maker-checker permissions, and pending approvals."
		>
			{isLoading ? (
				<OverviewSkeleton />
			) : hasError ? (
				<Alert variant="destructive">
					<AlertTitle>Unable to load maker checker dashboard</AlertTitle>
					<AlertDescription>
						Refresh the page and try again. If the issue persists, check API
						connectivity and your permissions.
					</AlertDescription>
				</Alert>
			) : (
				<div className="space-y-6">
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="text-sm text-muted-foreground">
											Global Status
										</p>
										<p className="text-2xl font-bold">
											{globalConfig?.enabled ? "Enabled" : "Disabled"}
										</p>
									</div>
									<Badge
										variant={globalConfig?.enabled ? "success" : "secondary"}
									>
										{globalConfig?.enabled ? "Live" : "Off"}
									</Badge>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="pt-6">
								<div className="space-y-1">
									<p className="text-sm text-muted-foreground">
										Pending Approvals
									</p>
									<p className="text-2xl font-bold">
										{impact?.pendingApprovals ?? 0}
									</p>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="pt-6">
								<div className="space-y-1">
									<p className="text-sm text-muted-foreground">
										Enabled Permissions
									</p>
									<p className="text-2xl font-bold">
										{impact?.enabledPermissions ?? 0}
										<span className="text-sm font-medium text-muted-foreground">
											{" "}
											/ {impact?.totalPermissions ?? 0}
										</span>
									</p>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="pt-6">
								<div className="space-y-1">
									<p className="text-sm text-muted-foreground">
										Super Checkers
									</p>
									<p className="text-2xl font-bold">
										{impact?.superCheckerUsers ?? 0}
										<span className="text-sm font-medium text-muted-foreground">
											{" "}
											/ {impact?.totalUsers ?? 0}
										</span>
									</p>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<Card>
							<CardHeader className="space-y-1.5">
								<CardTitle className="text-base">Global Settings</CardTitle>
								<p className="text-sm text-muted-foreground">
									Enable or disable maker-checker for the entire platform.
								</p>
							</CardHeader>
							<CardContent>
								<Button asChild variant="outline">
									<Link href="/config/system/maker-checker/global">
										Manage Global Settings
										<ArrowRight className="h-4 w-4" />
									</Link>
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="space-y-1.5">
								<CardTitle className="text-base">Permission Matrix</CardTitle>
								<p className="text-sm text-muted-foreground">
									Control which operations require checker approval before
									execution.
								</p>
							</CardHeader>
							<CardContent>
								<Button asChild variant="outline">
									<Link href="/config/system/maker-checker/tasks">
										Manage Task Permissions
										<ShieldCheck className="h-4 w-4" />
									</Link>
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="space-y-1.5">
								<CardTitle className="text-base">Approval Workspace</CardTitle>
								<p className="text-sm text-muted-foreground">
									Triage pending approvals and monitor your own submitted maker
									requests.
								</p>
							</CardHeader>
							<CardContent>
								<Button asChild>
									<Link href="/config/system/maker-checker/inbox">
										Open Inbox
										<Workflow className="h-4 w-4" />
									</Link>
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			)}
		</PageShell>
	);
}
