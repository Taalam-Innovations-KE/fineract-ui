"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import { toastApiError } from "@/lib/fineract/error-toast";
import type { GetJobsResponse } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchJobs(tenantId: string): Promise<GetJobsResponse[]> {
	const response = await fetch(BFF_ROUTES.jobs, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function runJob(tenantId: string, jobId: number): Promise<unknown> {
	const response = await fetch(
		`${BFF_ROUTES.jobs}/${jobId}?command=executeJob`,
		{
			method: "POST",
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

export default function SchedulerJobsPage() {
	const { tenantId } = useTenantStore();

	const {
		data: jobs,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["jobs", tenantId],
		queryFn: () => fetchJobs(tenantId),
		refetchInterval: 30000, // Refresh every 30 seconds
	});

	const runJobMutation = useMutation({
		mutationFn: (jobId: number) => runJob(tenantId, jobId),
		onSuccess: (_, jobId) => {
			const job = jobs?.find((j) => j.jobId === jobId);
			toast.success(`Job "${job?.displayName}" started successfully`);
			refetch();
		},
		onError: (error) => {
			toastApiError(error);
		},
	});

	const columns = [
		{
			header: "Job Name",
			cell: (job: GetJobsResponse) => (
				<div>
					<div className="font-medium">{job.displayName}</div>
					<div className="text-sm text-muted-foreground">{job.shortName}</div>
				</div>
			),
		},
		{
			header: "Status",
			cell: (job: GetJobsResponse) => (
				<div className="flex items-center gap-2">
					<Badge variant={job.active ? "default" : "secondary"}>
						{job.active ? "Active" : "Inactive"}
					</Badge>
					{job.currentlyRunning && (
						<Badge variant="outline" className="text-orange-600">
							Running
						</Badge>
					)}
				</div>
			),
		},
		{
			header: "Schedule",
			cell: (job: GetJobsResponse) => (
				<div className="text-sm">
					{job.cronExpression ? (
						<code className="bg-muted px-1 py-0.5 rounded text-xs">
							{job.cronExpression}
						</code>
					) : (
						<span className="text-muted-foreground">Manual only</span>
					)}
				</div>
			),
		},
		{
			header: "Next Run",
			cell: (job: GetJobsResponse) => (
				<div className="text-sm">
					{job.nextRunTime ? (
						new Date(job.nextRunTime).toLocaleString()
					) : (
						<span className="text-muted-foreground">-</span>
					)}
				</div>
			),
		},
		{
			header: "Last Run",
			cell: (job: GetJobsResponse) => {
				const lastRun = job.lastRunHistory;
				if (!lastRun)
					return <span className="text-muted-foreground">Never</span>;

				return (
					<div className="text-sm space-y-1">
						<div>
							{lastRun.jobRunStartTime
								? new Date(lastRun.jobRunStartTime).toLocaleString()
								: "-"}
						</div>
						<Badge
							variant={
								lastRun.status === "success"
									? "default"
									: lastRun.status === "failed"
										? "destructive"
										: "secondary"
							}
							className="text-xs"
						>
							{lastRun.status}
						</Badge>
					</div>
				);
			},
		},
		{
			header: "Actions",
			cell: (job: GetJobsResponse) => (
				<Button
					size="sm"
					onClick={() => job.jobId && runJobMutation.mutate(job.jobId)}
					disabled={
						!job.active || job.currentlyRunning || runJobMutation.isPending
					}
				>
					{runJobMutation.isPending &&
					runJobMutation.variables === job.jobId ? (
						<RefreshCw className="mr-2 h-4 w-4" />
					) : (
						<Play className="h-4 w-4 mr-2" />
					)}
					Run Now
				</Button>
			),
		},
	];

	if (isLoading) {
		return (
			<PageShell
				title="Scheduler Jobs"
				subtitle="Manage and monitor automated background jobs and scheduled tasks"
			>
				<div className="space-y-6">
					<div className="grid gap-4 md:grid-cols-3">
						{Array.from({ length: 3 }).map((_, index) => (
							<Card key={`job-summary-skeleton-${index}`}>
								<CardContent className="pt-6">
									<div className="flex items-center justify-between">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-8 w-12" />
									</div>
								</CardContent>
							</Card>
						))}
					</div>
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-32" />
							<Skeleton className="h-4 w-80" />
						</CardHeader>
						<CardContent className="space-y-3">
							<Skeleton className="h-10 w-full" />
							{Array.from({ length: 6 }).map((_, index) => (
								<Skeleton
									key={`job-row-skeleton-${index}`}
									className="h-12 w-full"
								/>
							))}
						</CardContent>
					</Card>
				</div>
			</PageShell>
		);
	}

	if (error) {
		return (
			<PageShell
				title="Scheduler Jobs"
				subtitle="Manage automated background jobs"
			>
				<Alert>
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						Failed to load scheduler jobs. Please try again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	const activeJobs = jobs?.filter((job) => job.active) || [];
	const inactiveJobs = jobs?.filter((job) => !job.active) || [];
	const runningJobs = jobs?.filter((job) => job.currentlyRunning) || [];

	return (
		<PageShell
			title="Scheduler Jobs"
			subtitle="Manage and monitor automated background jobs and scheduled tasks"
		>
			<div className="space-y-6">
				{/* Summary Cards */}
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Total Jobs
								</span>
								<span className="text-2xl font-bold">{jobs?.length || 0}</span>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Active Jobs
								</span>
								<span className="text-2xl font-bold text-green-600">
									{activeJobs.length}
								</span>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Currently Running
								</span>
								<span className="text-2xl font-bold text-orange-600">
									{runningJobs.length}
								</span>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Jobs Table */}
				<Card>
					<CardHeader>
						<CardTitle>All Jobs</CardTitle>
						<CardDescription>
							View and manage all configured scheduler jobs. Jobs automatically
							refresh every 30 seconds.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<DataTable
							columns={columns}
							data={jobs || []}
							getRowId={(job: GetJobsResponse) =>
								job.jobId || job.displayName || "job"
							}
						/>
					</CardContent>
				</Card>

				{/* Job Details */}
				{jobs && jobs.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Job Information</CardTitle>
							<CardDescription>
								Details about job scheduling and execution
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<h4 className="font-medium mb-2">
										Active Jobs ({activeJobs.length})
									</h4>
									<ul className="space-y-1">
										{activeJobs.slice(0, 5).map((job) => (
											<li
												key={job.jobId}
												className="text-sm flex justify-between"
											>
												<span>{job.displayName}</span>
												{job.cronExpression && (
													<code className="text-xs bg-muted px-1 py-0.5 rounded">
														{job.cronExpression}
													</code>
												)}
											</li>
										))}
										{activeJobs.length > 5 && (
											<li className="text-sm text-muted-foreground">
												... and {activeJobs.length - 5} more
											</li>
										)}
									</ul>
								</div>

								<div>
									<h4 className="font-medium mb-2">
										Inactive Jobs ({inactiveJobs.length})
									</h4>
									<ul className="space-y-1">
										{inactiveJobs.slice(0, 5).map((job) => (
											<li key={job.jobId} className="text-sm">
												{job.displayName}
											</li>
										))}
										{inactiveJobs.length > 5 && (
											<li className="text-sm text-muted-foreground">
												... and {inactiveJobs.length - 5} more
											</li>
										)}
									</ul>
								</div>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</PageShell>
	);
}
