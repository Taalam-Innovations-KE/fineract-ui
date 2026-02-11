"use client";

import { useEffect, useState } from "react";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Permission } from "@/lib/fineract/maker-checker";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { useMakerCheckerStore } from "@/store/maker-checker";
import { useTenantStore } from "@/store/tenant";

function toTitleCase(value: string): string {
	return value
		.split(" ")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}

function parsePermissionCode(code: string) {
	const normalized = code.replace(/[._-]+/g, " ").trim();
	const words = normalized.split(" ").filter(Boolean);
	const action = words[0] ? toTitleCase(words[0]) : "Action";
	const resource = words.slice(1).join(" ");

	return {
		label: toTitleCase(normalized || code),
		action,
		resource: resource ? toTitleCase(resource) : "General",
	};
}

export default function TasksPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [bulkSaving, setBulkSaving] = useState(false);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const { tenantId } = useTenantStore();
	const { permissions, setPermissions, updatePermission } =
		useMakerCheckerStore();

	const parseSubmitErrorPayload = async (
		response: Response,
		fallbackMessage: string,
	) =>
		response.json().catch(() => ({
			message: fallbackMessage,
			statusCode: response.status,
		}));

	useEffect(() => {
		async function loadPermissions() {
			try {
				const response = await fetch("/api/maker-checker/permissions", {
					headers: {
						"x-tenant-id": tenantId,
					},
				});
				const perms = await response.json();
				setPermissions(Array.isArray(perms) ? perms : []);
			} catch (error) {
				console.error("Failed to load permissions:", error);
			} finally {
				setLoading(false);
			}
		}
		loadPermissions();
	}, [setPermissions, tenantId]);

	const handleToggle = (code: string, selected: boolean) => {
		updatePermission(code, selected);
	};

	const handleGroupToggle = (group: string, selected: boolean) => {
		const groupPerms = permissions.filter((p) => p.grouping === group);
		groupPerms.forEach((perm) => updatePermission(perm.code, selected));
	};

	const handleBulkEnable = async (codes: string[]) => {
		setBulkSaving(true);
		setSubmitError(null);
		try {
			const updates = codes.map((code) => ({ code, selected: true }));
			const response = await fetch("/api/maker-checker/permissions", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"x-tenant-id": tenantId,
				},
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				throw await parseSubmitErrorPayload(
					response,
					"Failed to bulk enable permissions",
				);
			}

			codes.forEach((code) => updatePermission(code, true));
		} catch (error) {
			setSubmitError(
				toSubmitActionError(error, {
					action: "bulkEnableMakerCheckerPermissions",
					endpoint: "/api/maker-checker/permissions",
					method: "PUT",
					tenantId,
				}),
			);
		} finally {
			setBulkSaving(false);
		}
	};

	const handleBulkDisable = async (codes: string[]) => {
		setBulkSaving(true);
		setSubmitError(null);
		try {
			const updates = codes.map((code) => ({ code, selected: false }));
			const response = await fetch("/api/maker-checker/permissions", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"x-tenant-id": tenantId,
				},
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				throw await parseSubmitErrorPayload(
					response,
					"Failed to bulk disable permissions",
				);
			}

			codes.forEach((code) => updatePermission(code, false));
		} catch (error) {
			setSubmitError(
				toSubmitActionError(error, {
					action: "bulkDisableMakerCheckerPermissions",
					endpoint: "/api/maker-checker/permissions",
					method: "PUT",
					tenantId,
				}),
			);
		} finally {
			setBulkSaving(false);
		}
	};

	const handleSave = async () => {
		setSaving(true);
		setSubmitError(null);
		try {
			const updates = permissions.map((p) => ({
				code: p.code,
				selected: p.selected,
			}));
			const response = await fetch("/api/maker-checker/permissions", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"x-tenant-id": tenantId,
				},
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				throw await parseSubmitErrorPayload(
					response,
					"Failed to update permissions",
				);
			}

			console.log("Permissions updated successfully.");
		} catch (error) {
			setSubmitError(
				toSubmitActionError(error, {
					action: "saveMakerCheckerPermissions",
					endpoint: "/api/maker-checker/permissions",
					method: "PUT",
					tenantId,
				}),
			);
		} finally {
			setSaving(false);
		}
	};

	const groupedPermissions = permissions.reduce(
		(acc, perm) => {
			if (!acc[perm.grouping]) acc[perm.grouping] = [];
			acc[perm.grouping].push(perm);
			return acc;
		},
		{} as Record<string, Permission[]>,
	);

	const getGroupStats = (groupPerms: Permission[]) => {
		const enabled = groupPerms.filter((p) => p.selected).length;
		const total = groupPerms.length;
		return { enabled, total };
	};

	const getAllEnabledCodes = () =>
		permissions.filter((p) => p.selected).map((p) => p.code);
	const getAllDisabledCodes = () =>
		permissions.filter((p) => !p.selected).map((p) => p.code);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<Skeleton className="h-8 w-80" />
					<Skeleton className="h-4 w-[30rem]" />
				</div>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-[26rem]" />
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-4">
							<Skeleton className="h-10 w-44" />
							<Skeleton className="h-10 w-44" />
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-44" />
						<Skeleton className="h-4 w-[28rem]" />
					</CardHeader>
					<CardContent className="space-y-4">
						{Array.from({ length: 4 }).map((_, index) => (
							<div
								key={`maker-checker-group-skeleton-${index}`}
								className="space-y-3 rounded-lg border p-4"
							>
								<div className="flex items-center justify-between gap-3">
									<Skeleton className="h-5 w-52" />
									<Skeleton className="h-8 w-28" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Configure Maker-Checker Tasks</h1>
				<p className="text-muted-foreground">
					Select which operations require maker checker approval.
				</p>
			</div>
			<SubmitErrorAlert
				error={submitError}
				title="Maker-checker task update failed"
			/>

			{/* Bulk Operations */}
			<Card>
				<CardHeader>
					<CardTitle>Bulk Operations</CardTitle>
					<CardDescription>
						Quickly enable or disable maker-checker for multiple permissions.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4 flex-wrap">
						<Button
							variant="outline"
							onClick={() => handleBulkEnable(getAllDisabledCodes())}
							disabled={bulkSaving || getAllDisabledCodes().length === 0}
						>
							Enable All Remaining
						</Button>
						<Button
							variant="outline"
							onClick={() => handleBulkDisable(getAllEnabledCodes())}
							disabled={bulkSaving || getAllEnabledCodes().length === 0}
						>
							Disable All Enabled
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Permission Groups */}
			<Card>
				<CardHeader>
					<CardTitle>Permission Groups</CardTitle>
					<CardDescription>
						Configure maker-checker settings by functional area.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						{Object.entries(groupedPermissions).map(([group, perms]) => {
							const stats = getGroupStats(perms);
							const allSelected = stats.enabled === stats.total;
							const noneSelected = stats.enabled === 0;
							const sortedPerms = [...perms].sort((a, b) =>
								a.code.localeCompare(b.code),
							);

							return (
								<div key={group} className="border rounded-lg p-4">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center space-x-4">
											<Checkbox
												checked={allSelected}
												onCheckedChange={(checked) =>
													handleGroupToggle(group, checked as boolean)
												}
											/>
											{!allSelected && !noneSelected && (
												<span className="text-xs text-muted-foreground ml-1">
													({stats.enabled} selected)
												</span>
											)}
											<h3 className="font-semibold">{group}</h3>
											<Badge variant="secondary">
												{stats.enabled}/{stats.total} enabled
											</Badge>
										</div>
										<div className="flex gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													handleBulkEnable(
														perms.filter((p) => !p.selected).map((p) => p.code),
													)
												}
												disabled={stats.enabled === stats.total}
											>
												Enable All
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													handleBulkDisable(
														perms.filter((p) => p.selected).map((p) => p.code),
													)
												}
												disabled={stats.enabled === 0}
											>
												Disable All
											</Button>
										</div>
									</div>

									<div className="space-y-2">
										{sortedPerms.map((perm) => {
											const parsed = parsePermissionCode(perm.code);
											return (
												<div
													key={perm.code}
													className="flex items-start gap-3 rounded-sm border border-border/60 p-3"
												>
													<Checkbox
														checked={perm.selected}
														onCheckedChange={(checked) =>
															handleToggle(perm.code, checked as boolean)
														}
													/>
													<div className="min-w-0 flex-1 space-y-1">
														<p className="text-sm font-medium leading-5">
															{parsed.label}
														</p>
														<div className="flex flex-wrap items-center gap-1.5">
															<Badge variant="secondary">{parsed.action}</Badge>
															<Badge variant="outline">{parsed.resource}</Badge>
															<Badge
																variant={
																	perm.selected ? "success" : "secondary"
																}
															>
																{perm.selected ? "Enabled" : "Disabled"}
															</Badge>
														</div>
														<p className="break-all font-mono text-xs text-muted-foreground">
															{perm.code}
														</p>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>

					<Separator className="my-4" />

					<div className="flex justify-end">
						<Button onClick={handleSave} disabled={saving}>
							{saving ? "Saving..." : "Save All Changes"}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
