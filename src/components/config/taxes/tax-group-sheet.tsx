"use client";

import { Plus, Trash2 } from "lucide-react";
import {
	Controller,
	type UseFieldArrayReturn,
	type UseFormReturn,
} from "react-hook-form";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
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
	GetTaxesGroupResponse,
	TaxComponentData,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import type { TaxGroupFormData } from "@/lib/schemas/tax";
import { getComponentName } from "./tax-ui-utils";

interface TaxGroupSheetProps {
	components: Array<GetTaxesComponentsResponse | TaxComponentData>;
	editingGroup: GetTaxesGroupResponse | null;
	fieldArray: UseFieldArrayReturn<TaxGroupFormData, "taxComponents", "fieldId">;
	form: UseFormReturn<TaxGroupFormData>;
	isLoading: boolean;
	isOpen: boolean;
	isSubmitting: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: TaxGroupFormData) => void;
	submitError: SubmitActionError | null;
}

export function TaxGroupSheet({
	components,
	editingGroup,
	fieldArray,
	form,
	isLoading,
	isOpen,
	isSubmitting,
	onOpenChange,
	onSubmit,
	submitError,
}: TaxGroupSheetProps) {
	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full overflow-y-auto sm:max-w-3xl"
			>
				<SheetHeader>
					<SheetTitle>
						{editingGroup ? "Edit Tax Group" : "Create Tax Group"}
					</SheetTitle>
					<SheetDescription>
						Group tax components and effective dates for products and charges.
					</SheetDescription>
				</SheetHeader>

				{editingGroup && isLoading ? (
					<div className="mt-6 space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				) : (
					<form
						className="mt-6 space-y-6"
						onSubmit={form.handleSubmit(onSubmit)}
					>
						<SubmitErrorAlert
							error={submitError}
							title="Unable to save tax group"
						/>

						<div className="space-y-2">
							<Label htmlFor="tax-group-name">
								Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id="tax-group-name"
								placeholder="e.g. Standard withholding"
								{...form.register("name")}
							/>
							{form.formState.errors.name?.message && (
								<p className="text-sm text-destructive">
									{form.formState.errors.name.message}
								</p>
							)}
						</div>

						<div className="space-y-3">
							<div className="flex items-center justify-between gap-2">
								<div>
									<Label>Tax Components</Label>
									<p className="text-xs text-muted-foreground">
										Existing associations can be end-dated. New associations can
										be added with an optional start date.
									</p>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										fieldArray.append({
											taxComponentId: undefined,
										})
									}
								>
									<Plus className="mr-2 h-4 w-4" />
									Add Component
								</Button>
							</div>

							<div className="space-y-3">
								{fieldArray.fields.map((field, index) => {
									const isExistingAssociation =
										form.watch(`taxComponents.${index}.id`) !== undefined;
									const selectedComponentId = form.watch(
										`taxComponents.${index}.taxComponentId`,
									);

									return (
										<div key={field.fieldId} className="rounded-sm border p-3">
											<div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
												<div className="space-y-2">
													<Label>Component</Label>
													<Controller
														control={form.control}
														name={`taxComponents.${index}.taxComponentId`}
														render={({ field: componentField }) => (
															<Select
																value={
																	componentField.value !== undefined
																		? String(componentField.value)
																		: "none"
																}
																onValueChange={(value) =>
																	componentField.onChange(
																		value === "none"
																			? undefined
																			: Number(value),
																	)
																}
																disabled={isExistingAssociation}
															>
																<SelectTrigger>
																	<SelectValue placeholder="Select component" />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="none">
																		Select component
																	</SelectItem>
																	{components.map((component) =>
																		component.id !== undefined ? (
																			<SelectItem
																				key={component.id}
																				value={String(component.id)}
																			>
																				{component.name ||
																					`Component ${component.id}`}
																			</SelectItem>
																		) : null,
																	)}
																</SelectContent>
															</Select>
														)}
													/>
													{form.formState.errors.taxComponents?.[index]
														?.taxComponentId?.message && (
														<p className="text-sm text-destructive">
															{
																form.formState.errors.taxComponents[index]
																	?.taxComponentId?.message
															}
														</p>
													)}
												</div>

												<div className="space-y-2">
													<Label>Start Date</Label>
													<Input
														type="date"
														disabled={isExistingAssociation}
														{...form.register(
															`taxComponents.${index}.startDate`,
														)}
													/>
												</div>

												<div className="space-y-2">
													<Label>End Date</Label>
													<Input
														type="date"
														disabled={!isExistingAssociation}
														{...form.register(`taxComponents.${index}.endDate`)}
													/>
													{form.formState.errors.taxComponents?.[index]?.endDate
														?.message && (
														<p className="text-sm text-destructive">
															{
																form.formState.errors.taxComponents[index]
																	?.endDate?.message
															}
														</p>
													)}
												</div>

												<Button
													type="button"
													variant="outline"
													size="icon"
													disabled={isExistingAssociation}
													onClick={() => fieldArray.remove(index)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
											{selectedComponentId !== undefined && (
												<p className="mt-2 text-xs text-muted-foreground">
													{getComponentName(components, selectedComponentId)}
												</p>
											)}
										</div>
									);
								})}
							</div>
							{typeof form.formState.errors.taxComponents?.message ===
								"string" && (
								<p className="text-sm text-destructive">
									{form.formState.errors.taxComponents.message}
								</p>
							)}
						</div>

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
								{editingGroup ? "Save Changes" : "Create Tax Group"}
							</Button>
						</div>
					</form>
				)}
			</SheetContent>
		</Sheet>
	);
}
