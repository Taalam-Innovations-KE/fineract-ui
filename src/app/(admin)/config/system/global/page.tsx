"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	ArrowLeft,
	BadgeCheck,
	CalendarClock,
	RefreshCw,
	Save,
	Search,
	ShieldAlert,
	SlidersHorizontal,
	ToggleLeft,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import {
	FINERACT_DATE_FORMAT,
	formatDateStringToFormat,
	getFineractDateConfig,
	parseFineractDate,
} from "@/lib/date-utils";
import { BFF_ROUTES, FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { getFieldError, mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetGlobalConfigurationsResponse,
	GlobalConfigurationPropertyData,
	PutGlobalConfigurationsRequest,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { useTenantStore } from "@/store/tenant";

type ConfigType = "toggle" | "numeric" | "text" | "date" | "mixed" | "other";
type StatusFilter = "all" | "enabled" | "disabled";
type TypeFilter = "all" | ConfigType;

async function fetchConfigurations(
	tenantId: string,
): Promise<GetGlobalConfigurationsResponse> {
	const response = await fetch(BFF_ROUTES.configurations, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function updateConfiguration(
	tenantId: string,
	configId: number,
	updates: PutGlobalConfigurationsRequest,
): Promise<void> {
	const response = await fetch(`${BFF_ROUTES.configurations}/${configId}`, {
		method: "PUT",
		headers: {
			"x-tenant-id": tenantId,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(updates),
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}
}

function getConfigurationType(
	config: GlobalConfigurationPropertyData,
): ConfigType {
	const signalCount = [
		config.enabled !== undefined,
		config.value !== undefined,
		config.stringValue !== undefined,
		config.dateValue !== undefined,
	].filter(Boolean).length;

	if (signalCount > 1) {
		return "mixed";
	}

	if (config.enabled !== undefined) {
		return "toggle";
	}
	if (config.value !== undefined) {
		return "numeric";
	}
	if (config.stringValue !== undefined) {
		return "text";
	}
	if (config.dateValue !== undefined) {
		return "date";
	}
	return "other";
}

function getTypeBadgeVariant(
	type: ConfigType,
): "default" | "secondary" | "warning" | "info" {
	if (type === "toggle") return "default";
	if (type === "numeric") return "secondary";
	if (type === "date") return "warning";
	return "info";
}

function getConfigurationValue(
	config: GlobalConfigurationPropertyData,
): string {
	if (config.stringValue !== undefined) {
		return config.stringValue || "Empty";
	}
	if (config.value !== undefined) {
		return String(config.value);
	}
	if (config.dateValue !== undefined) {
		return config.dateValue || "Empty";
	}
	if (config.enabled !== undefined) {
		return config.enabled ? "Enabled" : "Disabled";
	}
	return "Not configured";
}

function normalizeDateForInput(dateValue?: string): string {
	if (!dateValue) {
		return "";
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
		return dateValue;
	}

	try {
		return format(parseFineractDate(dateValue), "yyyy-MM-dd");
	} catch {
		return "";
	}
}

function hasDraftChanges(
	base: GlobalConfigurationPropertyData,
	draft: GlobalConfigurationPropertyData,
): boolean {
	return (
		base.enabled !== draft.enabled ||
		base.value !== draft.value ||
		base.stringValue !== draft.stringValue ||
		base.dateValue !== draft.dateValue
	);
}

function buildUpdatePayload(
	base: GlobalConfigurationPropertyData,
	draft: GlobalConfigurationPropertyData,
): PutGlobalConfigurationsRequest {
	const updates: PutGlobalConfigurationsRequest = {};

	if (base.enabled !== draft.enabled && draft.enabled !== undefined) {
		updates.enabled = draft.enabled;
	}

	if (base.value !== draft.value && draft.value !== undefined) {
		updates.value = draft.value;
	}

	if (
		base.stringValue !== draft.stringValue &&
		draft.stringValue !== undefined
	) {
		updates.stringValue = draft.stringValue;
	}

	if (base.dateValue !== draft.dateValue && draft.dateValue) {
		updates.dateValue = formatDateStringToFormat(
			draft.dateValue,
			FINERACT_DATE_FORMAT,
		);
		Object.assign(updates, getFineractDateConfig());
	}

	return updates;
}

export default function GlobalConfigurationPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
	const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
	const [draftConfig, setDraftConfig] =
		useState<GlobalConfigurationPropertyData | null>(null);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

	const {
		data: configResponse,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["global-configurations", tenantId],
		queryFn: () => fetchConfigurations(tenantId),
	});

	const updateMutation = useMutation({
		mutationFn: ({
			configId,
			updates,
		}: {
			configId: number;
			updates: PutGlobalConfigurationsRequest;
		}) => updateConfiguration(tenantId, configId, updates),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["global-configurations", tenantId],
			});
			setSubmitError(null);
			setNoticeMessage("Configuration updated successfully.");
		},
		onError: (error, variables) => {
			const trackedError = toSubmitActionError(error, {
				action: "updateGlobalConfiguration",
				endpoint: `${BFF_ROUTES.configurations}/${variables.configId}`,
				method: "PUT",
				tenantId,
			});
			setSubmitError(trackedError);
			setNoticeMessage(null);
		},
	});

	const configurations = configResponse?.globalConfiguration || [];

	useEffect(() => {
		if (noticeMessage) {
			const timer = setTimeout(() => setNoticeMessage(null), 4000);
			return () => {
				clearTimeout(timer);
			};
		}
	}, [noticeMessage]);

	useEffect(() => {
		if (configurations.length === 0) {
			setSelectedConfigId(null);
			setDraftConfig(null);
			return;
		}

		const selectedExists = configurations.some(
			(config) => config.id === selectedConfigId,
		);

		if (!selectedExists) {
			setSelectedConfigId(configurations[0].id || null);
		}
	}, [configurations, selectedConfigId]);

	const selectedConfig = useMemo(() => {
		return (
			configurations.find((config) => config.id === selectedConfigId) || null
		);
	}, [configurations, selectedConfigId]);

	useEffect(() => {
		if (!selectedConfig) {
			setDraftConfig(null);
			return;
		}
		setDraftConfig({ ...selectedConfig });
		setSubmitError(null);
	}, [selectedConfig]);

	const filteredConfigurations = useMemo(() => {
		return configurations.filter((config) => {
			const query = searchTerm.trim().toLowerCase();
			if (query) {
				const name = (config.name || "").toLowerCase();
				const description = (config.description || "").toLowerCase();
				if (!name.includes(query) && !description.includes(query)) {
					return false;
				}
			}

			if (statusFilter === "enabled" && config.enabled !== true) {
				return false;
			}
			if (statusFilter === "disabled" && config.enabled !== false) {
				return false;
			}

			if (typeFilter !== "all" && getConfigurationType(config) !== typeFilter) {
				return false;
			}

			return true;
		});
	}, [configurations, searchTerm, statusFilter, typeFilter]);

	const totalCount = configurations.length;
	const enabledCount = configurations.filter(
		(config) => config.enabled === true,
	).length;
	const trapDoorCount = configurations.filter(
		(config) => config.trapDoor,
	).length;
	const valueBackedCount = configurations.filter(
		(config) =>
			config.value !== undefined ||
			config.stringValue !== undefined ||
			config.dateValue !== undefined,
	).length;

	const hasSelectedChanges =
		selectedConfig && draftConfig
			? hasDraftChanges(selectedConfig, draftConfig)
			: false;

	const isSelectedUpdating =
		updateMutation.isPending &&
		updateMutation.variables?.configId === selectedConfig?.id;

	const columns: DataTableColumn<GlobalConfigurationPropertyData>[] = useMemo(
		() => [
			{
				header: "Configuration",
				cell: (config) => (
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<span className="font-medium">{config.name}</span>
							{config.trapDoor && <Badge variant="warning">Trap Door</Badge>}
						</div>
						<p className="text-xs text-muted-foreground">
							{config.description || "No description provided"}
						</p>
					</div>
				),
			},
			{
				header: "Type",
				cell: (config) => {
					const type = getConfigurationType(config);
					return (
						<Badge variant={getTypeBadgeVariant(type)}>
							{type.charAt(0).toUpperCase() + type.slice(1)}
						</Badge>
					);
				},
			},
			{
				header: "Status",
				cell: (config) =>
					config.enabled === undefined ? (
						<Badge variant="outline">N/A</Badge>
					) : (
						<Badge variant={config.enabled ? "success" : "secondary"}>
							{config.enabled ? "Enabled" : "Disabled"}
						</Badge>
					),
			},
			{
				header: "Value",
				cell: (config) => (
					<span className="text-xs font-mono">
						{getConfigurationValue(config)}
					</span>
				),
			},
			{
				header: "Action",
				className: "text-right",
				headerClassName: "text-right",
				cell: (config) => (
					<Button
						type="button"
						size="sm"
						variant={config.id === selectedConfigId ? "secondary" : "outline"}
						onClick={() => setSelectedConfigId(config.id || null)}
					>
						{config.id === selectedConfigId ? "Selected" : "Edit"}
					</Button>
				),
			},
		],
		[selectedConfigId],
	);

	const handleSave = () => {
		if (!selectedConfig || !draftConfig || !selectedConfig.id) {
			return;
		}

		const updates = buildUpdatePayload(selectedConfig, draftConfig);
		if (Object.keys(updates).length === 0) {
			setNoticeMessage("No changes detected.");
			return;
		}

		setNoticeMessage(null);
		updateMutation.mutate({
			configId: selectedConfig.id,
			updates,
		});
	};

	const handleReset = () => {
		if (!selectedConfig) {
			return;
		}
		setDraftConfig({ ...selectedConfig });
		setSubmitError(null);
	};

	const pageActions = (
		<>
			<Button variant="outline" asChild>
				<Link href="/config">
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Configuration
				</Link>
			</Button>
			<Button type="button" variant="outline" onClick={() => void refetch()}>
				<RefreshCw className="h-4 w-4 mr-2" />
				Refresh
			</Button>
		</>
	);

	if (isLoading) {
		return (
			<PageShell
				title="Global Configuration"
				subtitle="Configure global settings and system-wide preferences"
				actions={pageActions}
			>
				<div className="space-y-6">
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						{Array.from({ length: 4 }).map((_, index) => (
							<Card key={`global-config-summary-skeleton-${index}`}>
								<CardContent className="pt-6">
									<div className="flex items-center justify-between">
										<div className="space-y-2">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-8 w-16" />
										</div>
										<Skeleton className="h-10 w-10 rounded-sm" />
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					<div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
						<Card>
							<CardHeader className="space-y-3">
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-4 w-72" />
								<div className="grid gap-3 md:grid-cols-2">
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
								</div>
							</CardHeader>
							<CardContent>
								<GlobalConfigurationTableSkeleton />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-40" />
								<Skeleton className="h-4 w-full" />
							</CardHeader>
							<CardContent>
								<GlobalConfigurationDetailSkeleton />
							</CardContent>
						</Card>
					</div>
				</div>
			</PageShell>
		);
	}

	if (error) {
		return (
			<PageShell
				title="Global Configuration"
				subtitle="Configure global settings and system-wide preferences"
				actions={pageActions}
			>
				<Alert variant="destructive">
					<AlertTitle>Unable to load global configurations</AlertTitle>
					<AlertDescription>{mapFineractError(error).message}</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	return (
		<PageShell
			title="Global Configuration"
			subtitle="Configure global settings and system-wide preferences"
			actions={pageActions}
		>
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<SlidersHorizontal className="h-5 w-5 text-primary" />
								</div>
								<div>
									<div className="text-2xl font-bold">{totalCount}</div>
									<div className="text-sm text-muted-foreground">
										Total Configurations
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-success/10">
									<ToggleLeft className="h-5 w-5 text-success" />
								</div>
								<div>
									<div className="text-2xl font-bold">{enabledCount}</div>
									<div className="text-sm text-muted-foreground">Enabled</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-warning/10">
									<ShieldAlert className="h-5 w-5 text-warning" />
								</div>
								<div>
									<div className="text-2xl font-bold">{trapDoorCount}</div>
									<div className="text-sm text-muted-foreground">
										Trap Door (Read-only)
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-info/10">
									<CalendarClock className="h-5 w-5 text-info" />
								</div>
								<div>
									<div className="text-2xl font-bold">{valueBackedCount}</div>
									<div className="text-sm text-muted-foreground">
										Value-backed Settings
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card className="border-border/60">
					<CardContent className="pt-6">
						<div className="flex items-start gap-3">
							<BadgeCheck className="h-4 w-4 text-primary mt-0.5" />
							<p className="text-sm text-muted-foreground">
								These settings feed core API behavior in{" "}
								<code>{FINERACT_ENDPOINTS.configurations}</code>, including
								maker-checker, repayment rescheduling, and job-level controls.
							</p>
						</div>
					</CardContent>
				</Card>

				<div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
					<Card>
						<CardHeader className="space-y-3">
							<div>
								<CardTitle>Configurations</CardTitle>
								<CardDescription>
									Search and filter global settings, then select one to edit.
								</CardDescription>
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="relative">
									<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										value={searchTerm}
										onChange={(event) => setSearchTerm(event.target.value)}
										placeholder="Search configuration name or description"
										className="pl-8"
									/>
								</div>
								<Select
									value={statusFilter}
									onValueChange={(value: StatusFilter) =>
										setStatusFilter(value)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Filter by status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All statuses</SelectItem>
										<SelectItem value="enabled">Enabled only</SelectItem>
										<SelectItem value="disabled">Disabled only</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
								{(
									[
										["all", "All"],
										["toggle", "Toggle"],
										["numeric", "Numeric"],
										["text", "Text"],
										["date", "Date"],
										["mixed", "Mixed"],
									] as const
								).map(([value, label]) => (
									<Button
										key={value}
										type="button"
										variant={typeFilter === value ? "default" : "outline"}
										size="sm"
										onClick={() => setTypeFilter(value)}
									>
										{label}
									</Button>
								))}
							</div>
						</CardHeader>
						<CardContent>
							<DataTable
								data={filteredConfigurations}
								columns={columns}
								getRowId={(config) => config.id || config.name || "config"}
								pageSize={8}
								emptyMessage="No configurations match your filters."
								onRowClick={(config) => setSelectedConfigId(config.id || null)}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>
								{selectedConfig?.name || "Select a configuration"}
							</CardTitle>
							<CardDescription>
								{selectedConfig?.description ||
									"Pick a configuration from the table to review and edit values."}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<SubmitErrorAlert
								error={submitError}
								title="Failed to update global configuration"
							/>

							{noticeMessage && (
								<Alert>
									<AlertTitle>Update status</AlertTitle>
									<AlertDescription>{noticeMessage}</AlertDescription>
								</Alert>
							)}

							{selectedConfig && draftConfig ? (
								<>
									<div className="flex items-center gap-2">
										<Badge
											variant={getTypeBadgeVariant(
												getConfigurationType(selectedConfig),
											)}
										>
											{getConfigurationType(selectedConfig).toUpperCase()}
										</Badge>
										{selectedConfig.enabled !== undefined ? (
											<Badge
												variant={
													selectedConfig.enabled ? "success" : "secondary"
												}
											>
												{selectedConfig.enabled ? "Enabled" : "Disabled"}
											</Badge>
										) : (
											<Badge variant="outline">No Toggle</Badge>
										)}
									</div>

									{selectedConfig.trapDoor && (
										<Alert variant="destructive">
											<AlertTitle>Read-only configuration</AlertTitle>
											<AlertDescription>
												This configuration is marked as trap-door and should not
												be changed from UI.
											</AlertDescription>
										</Alert>
									)}

									{selectedConfig.enabled !== undefined && (
										<div className="space-y-2">
											<div className="flex items-center space-x-2">
												<Checkbox
													id={`enabled-${selectedConfig.id}`}
													checked={draftConfig.enabled || false}
													onCheckedChange={(checked) =>
														setDraftConfig((current) =>
															current
																? { ...current, enabled: checked === true }
																: current,
														)
													}
													disabled={Boolean(selectedConfig.trapDoor)}
												/>
												<Label htmlFor={`enabled-${selectedConfig.id}`}>
													Enabled
												</Label>
											</div>
											{getFieldError(submitError, "enabled") && (
												<p className="text-sm text-destructive">
													{getFieldError(submitError, "enabled")}
												</p>
											)}
										</div>
									)}

									{selectedConfig.value !== undefined && (
										<div className="space-y-2">
											<Label htmlFor={`value-${selectedConfig.id}`}>
												Numeric Value
											</Label>
											<Input
												id={`value-${selectedConfig.id}`}
												type="number"
												value={draftConfig.value ?? 0}
												onChange={(event) =>
													setDraftConfig((current) =>
														current
															? {
																	...current,
																	value:
																		event.target.value === ""
																			? 0
																			: Number(event.target.value),
																}
															: current,
													)
												}
												disabled={Boolean(selectedConfig.trapDoor)}
											/>
											{getFieldError(submitError, "value") && (
												<p className="text-sm text-destructive">
													{getFieldError(submitError, "value")}
												</p>
											)}
										</div>
									)}

									{selectedConfig.stringValue !== undefined && (
										<div className="space-y-2">
											<Label htmlFor={`string-${selectedConfig.id}`}>
												String Value
											</Label>
											<Input
												id={`string-${selectedConfig.id}`}
												value={draftConfig.stringValue || ""}
												onChange={(event) =>
													setDraftConfig((current) =>
														current
															? {
																	...current,
																	stringValue: event.target.value,
																}
															: current,
													)
												}
												disabled={Boolean(selectedConfig.trapDoor)}
											/>
											{getFieldError(submitError, "stringValue") && (
												<p className="text-sm text-destructive">
													{getFieldError(submitError, "stringValue")}
												</p>
											)}
										</div>
									)}

									{selectedConfig.dateValue !== undefined && (
										<div className="space-y-2">
											<Label htmlFor={`date-${selectedConfig.id}`}>
												Date Value
											</Label>
											<Input
												id={`date-${selectedConfig.id}`}
												type="date"
												value={normalizeDateForInput(draftConfig.dateValue)}
												onChange={(event) =>
													setDraftConfig((current) =>
														current
															? {
																	...current,
																	dateValue: event.target.value,
																}
															: current,
													)
												}
												disabled={Boolean(selectedConfig.trapDoor)}
											/>
											<p className="text-xs text-muted-foreground">
												Saved in Fineract format: {FINERACT_DATE_FORMAT} (en).
											</p>
											{getFieldError(submitError, "dateValue") && (
												<p className="text-sm text-destructive">
													{getFieldError(submitError, "dateValue")}
												</p>
											)}
										</div>
									)}

									<div className="flex items-center justify-end gap-2">
										<Button
											type="button"
											variant="outline"
											onClick={handleReset}
											disabled={!hasSelectedChanges || isSelectedUpdating}
										>
											Reset
										</Button>
										<Button
											type="button"
											onClick={handleSave}
											disabled={
												!hasSelectedChanges ||
												isSelectedUpdating ||
												Boolean(selectedConfig.trapDoor)
											}
										>
											<Save className="h-4 w-4 mr-2" />
											{isSelectedUpdating ? "Saving..." : "Save Changes"}
										</Button>
									</div>
								</>
							) : (
								<p className="text-sm text-muted-foreground">
									Select a configuration to start editing.
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</PageShell>
	);
}

function GlobalConfigurationTableSkeleton() {
	return (
		<div className="space-y-2">
			<Card className="rounded-sm border border-border/60">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border/60 bg-muted/40">
						<tr>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-28" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-12" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-16" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-14" />
							</th>
							<th className="px-3 py-2 text-right">
								<Skeleton className="h-4 w-12 ml-auto" />
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border/60">
						{Array.from({ length: 8 }).map((_, index) => (
							<tr key={`global-config-row-skeleton-${index}`}>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-44" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-16" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-20" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-28" />
								</td>
								<td className="px-3 py-2 text-right">
									<Skeleton className="h-8 w-16 ml-auto" />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</Card>
		</div>
	);
}

function GlobalConfigurationDetailSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				<Skeleton className="h-6 w-20" />
				<Skeleton className="h-6 w-24" />
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-10 w-full" />
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-10 w-full" />
			</div>
			<div className="flex justify-end gap-2">
				<Skeleton className="h-10 w-20" />
				<Skeleton className="h-10 w-28" />
			</div>
		</div>
	);
}
