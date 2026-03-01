"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
	fetchReportsTemplate,
	type ReportDefinition,
	type ReportUpsertPayload,
	updateReportDefinition,
} from "@/lib/fineract/reports";
import {
	type SubmitActionError,
	toSubmitActionError,
} from "@/lib/fineract/submit-error";
import { useTenantStore } from "@/store/tenant";

const FALLBACK_REPORT_TYPES = ["Table", "Chart", "Pentaho", "SMS"];
const SUBTYPE_NONE = "__none__";

interface ReportUpsertSheetProps {
	mode: "create" | "edit";
	report?: ReportDefinition;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

interface FormState {
	reportName: string;
	reportType: string;
	reportSubType: string;
	reportCategory: string;
	description: string;
	reportSql: string;
	useReport: boolean;
}

function buildDefaultFormState(report?: ReportDefinition): FormState {
	return {
		reportName: report?.reportName?.trim() ?? "",
		reportType: report?.reportType?.trim() ?? "",
		reportSubType: report?.reportSubType?.trim() ?? "",
		reportCategory: report?.reportCategory?.trim() ?? "",
		description: report?.description?.trim() ?? "",
		reportSql: report?.reportSql?.trim() ?? "",
		useReport: report?.useReport !== false,
	};
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
	const [formState, setFormState] = useState<FormState>(() =>
		buildDefaultFormState(report),
	);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const templateQuery = useQuery({
		queryKey: ["reports-template", tenantId],
		queryFn: () => fetchReportsTemplate(tenantId),
		enabled: open && Boolean(tenantId),
		staleTime: 10 * 60 * 1000,
	});

	useEffect(() => {
		if (open) {
			setFormState(buildDefaultFormState(report));
			setSubmitError(null);
		}
	}, [open, report]);

	const mutation = useMutation({
		mutationFn: (payload: ReportUpsertPayload) => {
			if (mode === "create") {
				return createReportDefinition(tenantId, payload);
			}

			return updateReportDefinition(tenantId, report!.id!, payload);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["reports", tenantId],
			});
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

	const allowedTypes =
		templateQuery.data?.allowedReportTypes &&
		templateQuery.data.allowedReportTypes.length > 0
			? templateQuery.data.allowedReportTypes
			: FALLBACK_REPORT_TYPES;

	const allowedSubTypes = templateQuery.data?.allowedReportSubTypes ?? [];
	const isPentaho = formState.reportType.trim() === "Pentaho";
	const isEditingCore = mode === "edit" && Boolean(report?.coreReport);
	const isLoading = mutation.isPending;

	function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
		setFormState((prev) => ({ ...prev, [key]: value }));
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmitError(null);

		const payload: ReportUpsertPayload = {
			reportName: formState.reportName,
			reportType: formState.reportType || undefined,
			reportSubType: formState.reportSubType || undefined,
			reportCategory: formState.reportCategory || undefined,
			description: formState.description || undefined,
			reportSql: formState.reportSql || undefined,
			useReport: formState.useReport,
			reportParameters: report?.reportParameters,
		};

		mutation.mutate(payload);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
				<SheetHeader>
					<SheetTitle>
						{mode === "create" ? "New Report" : "Edit Report"}
					</SheetTitle>
					<SheetDescription>
						{mode === "create"
							? "Define a new report that will be available in the catalog."
							: "Update the report definition metadata and availability."}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<SubmitErrorAlert
						error={submitError}
						title={
							mode === "create"
								? "Could not create report"
								: "Could not update report"
						}
					/>

					{isEditingCore ? (
						<Alert>
							<AlertTitle>Core report</AlertTitle>
							<AlertDescription>
								Core reports have restricted edit access. Some changes may be
								rejected by the server.
							</AlertDescription>
						</Alert>
					) : null}

					<div className="space-y-2">
						<Label htmlFor="reportName">
							Report Name <span className="text-destructive">*</span>
						</Label>
						<Input
							id="reportName"
							value={formState.reportName}
							onChange={(event) => setField("reportName", event.target.value)}
							placeholder="e.g. Client Listing"
							required
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="reportType">Report Type</Label>
							{templateQuery.isLoading ? (
								<Skeleton className="h-10 w-full" />
							) : (
								<Select
									value={formState.reportType}
									onValueChange={(value) => setField("reportType", value)}
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
						</div>

						<div className="space-y-2">
							<Label htmlFor="reportSubType">Sub-Type</Label>
							{templateQuery.isLoading ? (
								<Skeleton className="h-10 w-full" />
							) : allowedSubTypes.length > 0 ? (
								<Select
									value={formState.reportSubType || SUBTYPE_NONE}
									onValueChange={(value) =>
										setField(
											"reportSubType",
											value === SUBTYPE_NONE ? "" : value,
										)
									}
								>
									<SelectTrigger id="reportSubType">
										<SelectValue placeholder="None" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={SUBTYPE_NONE}>None</SelectItem>
										{allowedSubTypes.map((subType) => (
											<SelectItem key={subType} value={subType}>
												{subType}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<Input
									id="reportSubType"
									value={formState.reportSubType}
									onChange={(event) =>
										setField("reportSubType", event.target.value)
									}
									placeholder="Optional"
								/>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="reportCategory">Category</Label>
						<Input
							id="reportCategory"
							value={formState.reportCategory}
							onChange={(event) =>
								setField("reportCategory", event.target.value)
							}
							placeholder="e.g. Clients"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formState.description}
							onChange={(event) => setField("description", event.target.value)}
							placeholder="What does this report show?"
							rows={3}
						/>
					</div>

					{!isPentaho ? (
						<div className="space-y-2">
							<Label htmlFor="reportSql">Report SQL</Label>
							<Textarea
								id="reportSql"
								value={formState.reportSql}
								onChange={(event) => setField("reportSql", event.target.value)}
								placeholder="SELECT ..."
								rows={6}
								className="font-mono text-xs"
							/>
						</div>
					) : null}

					<div className="flex items-start gap-3 rounded-sm border border-border/60 p-4">
						<Checkbox
							id="useReport"
							checked={formState.useReport}
							onCheckedChange={(checked) =>
								setField("useReport", checked === true)
							}
							className="mt-0.5"
						/>
						<div>
							<Label htmlFor="useReport" className="cursor-pointer font-medium">
								Enable this report
							</Label>
							<p className="mt-0.5 text-xs text-muted-foreground">
								When enabled, this report is runnable in the service catalog.
							</p>
						</div>
					</div>

					<div className="flex items-center justify-end gap-2 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isLoading || !formState.reportName.trim()}
						>
							{isLoading
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
