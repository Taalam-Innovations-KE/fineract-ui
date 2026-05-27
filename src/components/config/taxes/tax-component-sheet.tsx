"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import type {
	GetTaxesComponentsResponse,
	TaxComponentData,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import type { TaxComponentFormData } from "@/lib/schemas/tax";
import {
	formatDateValue,
	formatPercentage,
	getGlAccountOptions,
	getTaxComponentHistories,
	readAccountLabel,
	readOptionLabel,
} from "./tax-ui-utils";

interface TaxComponentSheetProps {
	currentComponent?: GetTaxesComponentsResponse | TaxComponentData;
	editingComponent: GetTaxesComponentsResponse | null;
	form: UseFormReturn<TaxComponentFormData>;
	isLoading: boolean;
	isOpen: boolean;
	isSubmitting: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: TaxComponentFormData) => void;
	submitError: SubmitActionError | null;
	template?: TaxComponentData;
	templateLoading: boolean;
}

export function TaxComponentSheet({
	currentComponent,
	editingComponent,
	form,
	isLoading,
	isOpen,
	isSubmitting,
	onOpenChange,
	onSubmit,
	submitError,
	template,
	templateLoading,
}: TaxComponentSheetProps) {
	const debitAccountType = form.watch("debitAccountType");
	const creditAccountType = form.watch("creditAccountType");
	const debitAccountOptions = getGlAccountOptions(template, debitAccountType);
	const creditAccountOptions = getGlAccountOptions(template, creditAccountType);
	const histories = getTaxComponentHistories(currentComponent);

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full overflow-y-auto sm:max-w-2xl"
			>
				<SheetHeader>
					<SheetTitle>
						{editingComponent ? "Edit Tax Component" : "Create Tax Component"}
					</SheetTitle>
					<SheetDescription>
						Configure a tax rate and optional accounting accounts for tax
						posting.
					</SheetDescription>
				</SheetHeader>

				{editingComponent && isLoading ? (
					<div className="mt-6 space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-24 w-full" />
					</div>
				) : (
					<form
						className="mt-6 space-y-6"
						onSubmit={form.handleSubmit(onSubmit)}
					>
						<SubmitErrorAlert
							error={submitError}
							title="Unable to save tax component"
						/>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="tax-component-name">
									Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="tax-component-name"
									placeholder="e.g. Withholding Tax"
									{...form.register("name")}
								/>
								{form.formState.errors.name?.message && (
									<p className="text-sm text-destructive">
										{form.formState.errors.name.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="tax-component-percentage">
									Percentage <span className="text-destructive">*</span>
								</Label>
								<Input
									id="tax-component-percentage"
									type="number"
									min="0"
									max="100"
									step="0.000001"
									{...form.register("percentage")}
								/>
								{form.formState.errors.percentage?.message && (
									<p className="text-sm text-destructive">
										{form.formState.errors.percentage.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="tax-component-start-date">Start Date</Label>
								<Input
									id="tax-component-start-date"
									type="date"
									{...form.register("startDate")}
								/>
								{form.formState.errors.startDate?.message && (
									<p className="text-sm text-destructive">
										{form.formState.errors.startDate.message}
									</p>
								)}
							</div>
						</div>

						{editingComponent && (
							<Alert>
								<AlertTitle>GL accounts are fixed after creation</AlertTitle>
								<AlertDescription>
									Fineract allows component name, percentage, and start date
									updates. Debit and credit account mappings cannot be edited
									after creation.
								</AlertDescription>
							</Alert>
						)}

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-4 rounded-sm border p-3">
								<div>
									<Label>Debit Account Type</Label>
									<Controller
										control={form.control}
										name="debitAccountType"
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined
														? String(field.value)
														: "none"
												}
												onValueChange={(value) => {
													field.onChange(
														value === "none" ? undefined : Number(value),
													);
													form.setValue("debitAccountId", undefined);
												}}
												disabled={Boolean(editingComponent) || templateLoading}
											>
												<SelectTrigger>
													<SelectValue placeholder="Optional" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">None</SelectItem>
													{template?.glAccountTypeOptions?.map((option) =>
														option.id !== undefined ? (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{readOptionLabel(option)}
															</SelectItem>
														) : null,
													)}
												</SelectContent>
											</Select>
										)}
									/>
								</div>
								<div>
									<Label>Debit Account</Label>
									<Controller
										control={form.control}
										name="debitAccountId"
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined
														? String(field.value)
														: "none"
												}
												onValueChange={(value) =>
													field.onChange(
														value === "none" ? undefined : Number(value),
													)
												}
												disabled={
													Boolean(editingComponent) ||
													debitAccountType === undefined
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Optional" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">None</SelectItem>
													{debitAccountOptions.map((account) =>
														account.id !== undefined ? (
															<SelectItem
																key={account.id}
																value={String(account.id)}
															>
																{readAccountLabel(account)}
															</SelectItem>
														) : null,
													)}
												</SelectContent>
											</Select>
										)}
									/>
								</div>
							</div>

							<div className="space-y-4 rounded-sm border p-3">
								<div>
									<Label>Credit Account Type</Label>
									<Controller
										control={form.control}
										name="creditAccountType"
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined
														? String(field.value)
														: "none"
												}
												onValueChange={(value) => {
													field.onChange(
														value === "none" ? undefined : Number(value),
													);
													form.setValue("creditAccountId", undefined);
												}}
												disabled={Boolean(editingComponent) || templateLoading}
											>
												<SelectTrigger>
													<SelectValue placeholder="Optional" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">None</SelectItem>
													{template?.glAccountTypeOptions?.map((option) =>
														option.id !== undefined ? (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{readOptionLabel(option)}
															</SelectItem>
														) : null,
													)}
												</SelectContent>
											</Select>
										)}
									/>
								</div>
								<div>
									<Label>Credit Account</Label>
									<Controller
										control={form.control}
										name="creditAccountId"
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined
														? String(field.value)
														: "none"
												}
												onValueChange={(value) =>
													field.onChange(
														value === "none" ? undefined : Number(value),
													)
												}
												disabled={
													Boolean(editingComponent) ||
													creditAccountType === undefined
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Optional" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">None</SelectItem>
													{creditAccountOptions.map((account) =>
														account.id !== undefined ? (
															<SelectItem
																key={account.id}
																value={String(account.id)}
															>
																{readAccountLabel(account)}
															</SelectItem>
														) : null,
													)}
												</SelectContent>
											</Select>
										)}
									/>
								</div>
							</div>
						</div>

						{histories.length > 0 && (
							<div className="rounded-sm border p-3">
								<Label>Rate History</Label>
								<div className="mt-2 space-y-2 text-sm">
									{histories.map((history, index) => (
										<div
											key={`tax-component-history-${index}`}
											className="flex items-center justify-between gap-3"
										>
											<span>{formatPercentage(history.percentage)}</span>
											<span className="text-muted-foreground">
												{formatDateValue(history.startDate)} to{" "}
												{formatDateValue(history.endDate)}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{editingComponent ? "Save Changes" : "Create Tax Component"}
							</Button>
						</div>
					</form>
				)}
			</SheetContent>
		</Sheet>
	);
}
