"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import {
	createReportDefinition,
	describeReportParameter,
	fetchReportParameterCatalog,
	fetchReportsTemplate,
	type ReportDefinition,
	type ReportParameter,
	type ReportParameterCatalogEntry,
	type ReportParameterControl,
	type ReportUpsertPayload,
	updateReportDefinition,
} from "@/lib/fineract/reports";
import {
	getSubmitFieldError,
	type SubmitActionError,
	toSubmitActionError,
} from "@/lib/fineract/submit-error";
import {
	buildReportUpsertFormValues,
	buildReportValidationDefinitions,
	createReportUpsertSchema,
	REPORT_SQL_SYSTEM_PLACEHOLDERS,
	type ReportParameterFormValue,
	type ReportUpsertFormValues,
	reportUpsertFormValuesToPayload,
} from "@/lib/schemas/report";
import { useTenantStore } from "@/store/tenant";

const FALLBACK_REPORT_TYPES = ["Table", "Chart", "SMS"];
const FALLBACK_REPORT_SUB_TYPES = ["Bar", "Pie"];

type AvailableReportParameter = {
	parameterId: number;
	parameterName: string;
	label: string;
	runtimeName: string;
	control: ReportParameterControl;
	description: string;
	parentParameterName?: string;
	allowAll?: boolean;
};

interface ReportUpsertSheetProps {
	mode: "create" | "edit";
	report?: ReportDefinition;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

function getParameterId(
	parameter: Pick<ReportParameter, "id" | "parameterId">,
) {
	return parameter.parameterId ?? parameter.id;
}

function getFieldMessage(
	clientMessage: string | undefined,
	submitError: SubmitActionError | null,
	field: string,
) {
	return clientMessage || getSubmitFieldError(submitError, field);
}

function buildAvailableReportParameters(
	parameters: ReportParameter[],
	catalogEntries: ReportParameterCatalogEntry[],
): AvailableReportParameter[] {
	const byId = new Map<number, ReportParameterCatalogEntry>();
	const byName = new Map<string, ReportParameterCatalogEntry>();

	for (const entry of catalogEntries) {
		if (entry.id !== undefined) {
			byId.set(entry.id, entry);
		}
		byName.set(entry.parameterName.toLowerCase(), entry);
	}

	const available: AvailableReportParameter[] = [];

	for (const parameter of parameters) {
		const parameterId = getParameterId(parameter);
		if (!parameterId) {
			continue;
		}

		const entry =
			byId.get(parameterId) ||
			(parameter.parameterName
				? byName.get(parameter.parameterName.toLowerCase())
				: undefined);
		const parentEntry =
			entry?.parentId !== undefined ? byId.get(entry.parentId) : undefined;
		const metadata = describeReportParameter(parameter, entry, parentEntry);

		available.push({
			parameterId,
			parameterName:
				parameter.parameterName || entry?.parameterName || String(parameterId),
			label: metadata.label,
			runtimeName: metadata.requestKey,
			control: metadata.control,
			description: metadata.description,
			parentParameterName:
				parentEntry?.parameterLabel || parentEntry?.parameterName,
			allowAll: entry?.selectAll,
		});
	}

	return available.sort((left, right) => left.label.localeCompare(right.label));
}

function buildSelectedParameterValue(
	parameter: AvailableReportParameter,
	existingParameter?: ReportParameter,
): ReportParameterFormValue {
	return {
		id: existingParameter?.id,
		parameterId: parameter.parameterId,
		parameterName: parameter.parameterName,
		reportParameterName: existingParameter?.reportParameterName?.trim() || "",
	};
}

function ParameterSelectionSkeleton() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-10 w-full" />
			{Array.from({ length: 4 }).map((_, index) => (
				<div
					key={`report-parameter-selection-skeleton-${index}`}
					className="space-y-3 rounded-sm border border-border/60 p-4"
				>
					<div className="flex items-start gap-3">
						<Skeleton className="mt-1 h-4 w-4" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-48" />
						</div>
					</div>
					<Skeleton className="h-10 w-full" />
				</div>
			))}
		</div>
	);
}

export function ReportUpsertSheet({
	mode,
	report,
	open,
	onOpenChange,
	onSuccess,
}: ReportUpsertSheetProps) {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const [parameterSearch, setParameterSearch] = useState("");

	const templateQuery = useQuery({
		queryKey: ["reports-template", tenantId],
		queryFn: () => fetchReportsTemplate(tenantId),
		enabled: open && Boolean(tenantId),
		staleTime: 10 * 60 * 1000,
	});

	const parameterCatalogQuery = useQuery({
		queryKey: ["report-parameter-catalog", tenantId],
		queryFn: () => fetchReportParameterCatalog(tenantId),
		enabled: open && Boolean(tenantId),
		staleTime: 10 * 60 * 1000,
	});

	const templateParameters = templateQuery.data?.allowedParameters || [];
	const catalogEntries = parameterCatalogQuery.data || [];
	const availableParameters = useMemo(
		() =>
			buildAvailableReportParameters(
				templateParameters.length > 0
					? templateParameters
					: report?.reportParameters || [],
				catalogEntries,
			),
		[catalogEntries, report?.reportParameters, templateParameters],
	);

	const validationParameterDefinitions = useMemo(
		() =>
			buildReportValidationDefinitions(
				templateParameters.length > 0
					? templateParameters
					: report?.reportParameters || [],
				catalogEntries,
			),
		[catalogEntries, report?.reportParameters, templateParameters],
	);

	const allowedTypes =
		templateQuery.data?.allowedReportTypes &&
		templateQuery.data.allowedReportTypes.length > 0
			? templateQuery.data.allowedReportTypes
			: FALLBACK_REPORT_TYPES;
	const allowedSubTypes =
		templateQuery.data?.allowedReportSubTypes &&
		templateQuery.data.allowedReportSubTypes.length > 0
			? templateQuery.data.allowedReportSubTypes
			: FALLBACK_REPORT_SUB_TYPES;
	const schema = useMemo(
		() =>
			createReportUpsertSchema({
				allowedReportTypes: allowedTypes,
				allowedChartSubTypes: allowedSubTypes,
				parameterDefinitions: validationParameterDefinitions,
			}),
		[allowedSubTypes, allowedTypes, validationParameterDefinitions],
	);
	const isEditingCore = mode === "edit" && Boolean(report?.coreReport);

	const {
		register,
		handleSubmit,
		control,
		watch,
		reset,
		setValue,
		formState: { errors },
	} = useForm<ReportUpsertFormValues>({
		resolver: zodResolver(schema),
		defaultValues: buildReportUpsertFormValues(report),
	});

	const { append, remove } = useFieldArray({
		control,
		name: "reportParameters",
		keyName: "fieldKey",
	});

	const watchedType = watch("reportType");
	const watchedSubType = watch("reportSubType");
	const watchedSql = watch("reportSql");
	const watchedParameters = watch("reportParameters");

	const availableParameterMap = useMemo(
		() =>
			new Map(
				availableParameters.map((parameter) => [
					parameter.parameterId,
					parameter,
				]),
			),
		[availableParameters],
	);
	const selectedParameterMap = useMemo(
		() =>
			new Map(
				(watchedParameters || []).map((parameter, index) => [
					parameter.parameterId,
					{ index, parameter },
				]),
			),
		[watchedParameters],
	);
	const filteredParameters = useMemo(() => {
		const normalizedSearch = parameterSearch.trim().toLowerCase();
		return availableParameters
			.filter((parameter) => {
				if (!normalizedSearch) {
					return true;
				}

				return [
					parameter.label,
					parameter.parameterName,
					parameter.runtimeName,
					parameter.description,
				]
					.join(" ")
					.toLowerCase()
					.includes(normalizedSearch);
			})
			.sort((left, right) => {
				const leftSelected = selectedParameterMap.has(left.parameterId);
				const rightSelected = selectedParameterMap.has(right.parameterId);
				if (leftSelected !== rightSelected) {
					return leftSelected ? -1 : 1;
				}

				return left.label.localeCompare(right.label);
			});
	}, [availableParameters, parameterSearch, selectedParameterMap]);
	const selectedRuntimeKeys = useMemo(
		() =>
			(watchedParameters || [])
				.map((parameter) => {
					const definition = availableParameterMap.get(parameter.parameterId);
					if (!definition) {
						return null;
					}

					return {
						parameterId: parameter.parameterId,
						label: definition.label,
						runtimeName:
							parameter.reportParameterName?.trim() || definition.runtimeName,
					};
				})
				.filter(
					(
						parameter,
					): parameter is {
						parameterId: number;
						label: string;
						runtimeName: string;
					} => Boolean(parameter?.runtimeName),
				),
		[availableParameterMap, watchedParameters],
	);
	const selectedParameterCount = (watchedParameters || []).length;

	useEffect(() => {
		if (!open) {
			return;
		}

		reset(buildReportUpsertFormValues(report));
		setSubmitError(null);
		setParameterSearch("");
	}, [open, report, reset]);

	useEffect(() => {
		if (watchedType !== "Chart" && watchedSubType) {
			setValue("reportSubType", "");
		}
	}, [setValue, watchedSubType, watchedType]);

	const mutation = useMutation({
		mutationFn: (payload: ReportUpsertPayload) => {
			if (mode === "create") {
				return createReportDefinition(tenantId, payload);
			}

			return updateReportDefinition(tenantId, report!.id!, payload);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["reports", tenantId],
			});

			if (report?.id) {
				await queryClient.invalidateQueries({
					queryKey: ["report", tenantId, report.id],
				});
			}

			toast.success(mode === "create" ? "Report created." : "Report updated.");
			onSuccess?.();
			onOpenChange(false);
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: mode === "create" ? "createReport" : "updateReport",
					endpoint:
						mode === "create"
							? BFF_ROUTES.reports
							: BFF_ROUTES.reportById(report!.id!),
					method: mode === "create" ? "POST" : "PUT",
					tenantId,
				}),
			);
		},
	});

	function handleParameterToggle(parameter: AvailableReportParameter) {
		const existingSelection = selectedParameterMap.get(parameter.parameterId);
		if (existingSelection) {
			remove(existingSelection.index);
			return;
		}

		const existingParameter = report?.reportParameters?.find(
			(item) => getParameterId(item) === parameter.parameterId,
		);
		append(buildSelectedParameterValue(parameter, existingParameter));
	}

	function onSubmit(values: ReportUpsertFormValues) {
		setSubmitError(null);
		mutation.mutate(reportUpsertFormValuesToPayload(values));
	}

	const reportNameError = getFieldMessage(
		errors.reportName?.message,
		submitError,
		"reportName",
	);
	const reportTypeError = getFieldMessage(
		errors.reportType?.message,
		submitError,
		"reportType",
	);
	const reportSubTypeError = getFieldMessage(
		errors.reportSubType?.message,
		submitError,
		"reportSubType",
	);
	const reportCategoryError = getFieldMessage(
		errors.reportCategory?.message,
		submitError,
		"reportCategory",
	);
	const descriptionError = getFieldMessage(
		errors.description?.message,
		submitError,
		"description",
	);
	const reportSqlError = getFieldMessage(
		errors.reportSql?.message,
		submitError,
		"reportSql",
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
				<SheetHeader>
					<SheetTitle>
						{mode === "create" ? "New Report" : "Edit Report"}
					</SheetTitle>
					<SheetDescription>
						{mode === "create"
							? "Define a stretchy report, link runtime parameters, and control whether it is runnable."
							: "Update the report definition metadata, SQL template, parameter links, and availability."}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
					<SubmitErrorAlert
						error={submitError}
						title={
							mode === "create"
								? "Could not create report"
								: "Could not update report"
						}
					/>

					<Alert>
						<AlertTitle>Stretchy report contract</AlertTitle>
						<AlertDescription className="space-y-2">
							<p>
								Report SQL uses <code>${"{parameterName}"}</code> placeholders.
								Selected report parameters resolve those values through either
								the parameter&apos;s default runtime key or the alias you set
								below.
							</p>
							<p>
								System placeholders are injected automatically:{" "}
								{REPORT_SQL_SYSTEM_PLACEHOLDERS.join(", ")}.
							</p>
						</AlertDescription>
					</Alert>

					{isEditingCore ? (
						<Alert>
							<AlertTitle>Core report</AlertTitle>
							<AlertDescription>
								Core reports can only change the runnable flag. Definition and
								parameter fields are read-only in this form.
							</AlertDescription>
						</Alert>
					) : null}

					<div className="space-y-2">
						<Label htmlFor="reportName">
							Report Name <span className="text-destructive">*</span>
						</Label>
						<Input
							id="reportName"
							placeholder="e.g. My Portfolio Report"
							disabled={mutation.isPending || isEditingCore}
							{...register("reportName")}
						/>
						{reportNameError ? (
							<p className="text-sm text-destructive">{reportNameError}</p>
						) : null}
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="reportType">
								Report Type <span className="text-destructive">*</span>
							</Label>
							{templateQuery.isLoading ? (
								<Skeleton className="h-10 w-full" />
							) : (
								<Controller
									control={control}
									name="reportType"
									render={({ field }) => (
										<Select
											value={field.value}
											onValueChange={field.onChange}
											disabled={mutation.isPending || isEditingCore}
										>
											<SelectTrigger id="reportType">
												<SelectValue placeholder="Select type" />
											</SelectTrigger>
											<SelectContent>
												{allowedTypes.map((type) => (
													<SelectItem key={type} value={type}>
														{type}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
							)}
							{reportTypeError ? (
								<p className="text-sm text-destructive">{reportTypeError}</p>
							) : null}
						</div>

						<div className="space-y-2">
							<Label htmlFor="reportSubType">
								Chart Sub-Type {watchedType === "Chart" ? "*" : ""}
							</Label>
							{templateQuery.isLoading ? (
								<Skeleton className="h-10 w-full" />
							) : watchedType === "Chart" ? (
								<Controller
									control={control}
									name="reportSubType"
									render={({ field }) => (
										<Select
											value={field.value}
											onValueChange={field.onChange}
											disabled={mutation.isPending || isEditingCore}
										>
											<SelectTrigger id="reportSubType">
												<SelectValue placeholder="Select chart sub-type" />
											</SelectTrigger>
											<SelectContent>
												{allowedSubTypes.map((subType) => (
													<SelectItem key={subType} value={subType}>
														{subType}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
							) : (
								<Input
									id="reportSubType"
									placeholder="Only used for Chart reports"
									disabled={true}
									value=""
								/>
							)}
							{reportSubTypeError ? (
								<p className="text-sm text-destructive">{reportSubTypeError}</p>
							) : null}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="reportCategory">Category</Label>
						<Input
							id="reportCategory"
							placeholder="e.g. Loan"
							disabled={mutation.isPending || isEditingCore}
							{...register("reportCategory")}
						/>
						{reportCategoryError ? (
							<p className="text-sm text-destructive">{reportCategoryError}</p>
						) : null}
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							rows={3}
							placeholder="Portfolio snapshot"
							disabled={mutation.isPending || isEditingCore}
							{...register("description")}
						/>
						{descriptionError ? (
							<p className="text-sm text-destructive">{descriptionError}</p>
						) : null}
					</div>

					<div className="space-y-2">
						<Label htmlFor="reportSql">
							Report SQL{" "}
							{watchedType === "Table" || watchedType === "Chart" ? "*" : ""}
						</Label>
						<Textarea
							id="reportSql"
							rows={8}
							className="font-mono text-xs"
							placeholder="select * from ... where office_id = ${officeId}"
							disabled={mutation.isPending || isEditingCore}
							{...register("reportSql")}
						/>
						<div className="space-y-2 rounded-sm border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
							<div>
								Use runtime placeholders that match selected report parameters
								or system placeholders.
							</div>
							{selectedRuntimeKeys.length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{selectedRuntimeKeys.map((parameter) => (
										<Badge
											key={`runtime-key-${parameter.parameterId}`}
											variant="outline"
										>
											{parameter.label}: {parameter.runtimeName}
										</Badge>
									))}
								</div>
							) : watchedSql.trim().length > 0 ? (
								<div>No report parameters selected yet.</div>
							) : null}
						</div>
						{reportSqlError ? (
							<p className="text-sm text-destructive">{reportSqlError}</p>
						) : null}
					</div>

					<Card>
						<CardHeader>
							<div className="flex flex-wrap items-center gap-2">
								<CardTitle>Report Parameters</CardTitle>
								<Badge variant="outline">
									{selectedParameterCount} selected
								</Badge>
							</div>
							<CardDescription>
								Select allowed parameters from the template and optionally map
								them to per-report aliases for your SQL placeholders.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{parameterCatalogQuery.isError ? (
								<Alert>
									<AlertTitle>Parameter metadata fallback</AlertTitle>
									<AlertDescription>
										Full stretchy parameter metadata could not be reconstructed.
										Selection still works, but labels and control hints may be
										limited.
									</AlertDescription>
								</Alert>
							) : null}

							{templateQuery.isError ? (
								<Alert>
									<AlertTitle>Template unavailable</AlertTitle>
									<AlertDescription>
										The maintenance template could not be loaded. You can still
										save the report, but no new parameter links are available in
										this session.
									</AlertDescription>
								</Alert>
							) : null}

							{templateQuery.isLoading ? (
								<ParameterSelectionSkeleton />
							) : availableParameters.length === 0 ? (
								<div className="rounded-sm border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
									No allowed report parameters were returned by the maintenance
									template.
								</div>
							) : (
								<>
									<div className="relative">
										<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											value={parameterSearch}
											onChange={(event) =>
												setParameterSearch(event.target.value)
											}
											placeholder="Search parameters, aliases, and runtime keys"
											className="pl-8"
										/>
									</div>

									<div className="space-y-3">
										{filteredParameters.map((parameter) => {
											const selection = selectedParameterMap.get(
												parameter.parameterId,
											);
											const fieldIndex = selection?.index;
											const aliasError =
												fieldIndex !== undefined
													? errors.reportParameters?.[fieldIndex]
															?.reportParameterName?.message
													: undefined;

											return (
												<div
													key={`report-parameter-${parameter.parameterId}`}
													className="space-y-3 rounded-sm border border-border/60 p-4"
												>
													<div className="flex items-start gap-3">
														<Checkbox
															id={`parameter-${parameter.parameterId}`}
															checked={selection !== undefined}
															onCheckedChange={() =>
																handleParameterToggle(parameter)
															}
															disabled={mutation.isPending || isEditingCore}
															className="mt-1"
														/>
														<div className="min-w-0 flex-1 space-y-2">
															<div className="flex flex-wrap items-center gap-2">
																<Label
																	htmlFor={`parameter-${parameter.parameterId}`}
																	className="cursor-pointer font-medium"
																>
																	{parameter.label}
																</Label>
																<Badge variant="outline">
																	{parameter.control}
																</Badge>
																{parameter.allowAll ? (
																	<Badge variant="secondary">All option</Badge>
																) : null}
															</div>
															<div className="text-xs text-muted-foreground">
																{parameter.description}
															</div>
															<div className="text-xs text-muted-foreground">
																Default runtime key:{" "}
																<code>{parameter.runtimeName}</code>
															</div>
															{parameter.parentParameterName ? (
																<div className="text-xs text-muted-foreground">
																	Depends on {parameter.parentParameterName}.
																</div>
															) : null}
														</div>
													</div>

													{fieldIndex !== undefined && selection ? (
														<div className="space-y-2 pl-7">
															<Label htmlFor={`alias-${parameter.parameterId}`}>
																Alias Override
															</Label>
															<Input
																id={`alias-${parameter.parameterId}`}
																placeholder={parameter.runtimeName}
																disabled={mutation.isPending || isEditingCore}
																{...register(
																	`reportParameters.${fieldIndex}.reportParameterName`,
																)}
															/>
															<div className="text-xs text-muted-foreground">
																Effective runtime key:{" "}
																<code>
																	{selection.parameter.reportParameterName?.trim() ||
																		parameter.runtimeName}
																</code>
															</div>
															{aliasError ? (
																<p className="text-sm text-destructive">
																	{aliasError}
																</p>
															) : null}
														</div>
													) : null}
												</div>
											);
										})}
									</div>
								</>
							)}
						</CardContent>
					</Card>

					<div className="flex items-start gap-3 rounded-sm border border-border/60 p-4">
						<Controller
							control={control}
							name="useReport"
							render={({ field }) => (
								<Checkbox
									id="useReport"
									checked={field.value}
									onCheckedChange={(checked) =>
										field.onChange(checked === true)
									}
									disabled={mutation.isPending}
									className="mt-0.5"
								/>
							)}
						/>
						<div>
							<Label htmlFor="useReport" className="cursor-pointer font-medium">
								Enable this report
							</Label>
							<p className="mt-0.5 text-xs text-muted-foreground">
								When enabled, this report is runnable and its permission is
								available in the service catalog.
							</p>
						</div>
					</div>

					<div className="flex items-center justify-end gap-2 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={mutation.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending
								? "Saving…"
								: mode === "create"
									? "Create Report"
									: "Save Changes"}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
