"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import type {
	CollateralInput,
	CollateralTemplateResponse,
} from "@/lib/schemas/loan-metadata";
import { collateralSchema } from "@/lib/schemas/loan-metadata";
import { useTenantStore } from "@/store/tenant";

interface AddCollateralDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	loanId: number;
	currency?: string;
	onSuccess: () => void;
}

export function AddCollateralDialog({
	open,
	onOpenChange,
	loanId,
	currency = "KES",
	onSuccess,
}: AddCollateralDialogProps) {
	const { tenantId } = useTenantStore();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const templateQuery = useQuery({
		queryKey: ["collateralTemplate", loanId, tenantId],
		queryFn: async () => {
			const response = await fetch(BFF_ROUTES.loanCollateralTemplate(loanId), {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) throw new Error("Failed to load template");
			return response.json() as Promise<CollateralTemplateResponse>;
		},
		enabled: open,
	});

	const form = useForm<CollateralInput>({
		resolver: zodResolver(collateralSchema),
		defaultValues: {
			description: "",
		},
	});

	const handleSubmit = async (data: CollateralInput) => {
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const response = await fetch(BFF_ROUTES.loanCollaterals(loanId), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"fineract-platform-tenantid": tenantId,
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorPayload = await response
					.json()
					.catch(() => ({ message: "Failed to add collateral" }));
				throw errorPayload;
			}

			onSuccess();
			onOpenChange(false);
			form.reset();
		} catch (error) {
			setSubmitError(
				toSubmitActionError(error, {
					action: "addLoanCollateral",
					endpoint: BFF_ROUTES.loanCollaterals(loanId),
					method: "POST",
					tenantId,
				}),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = (open: boolean) => {
		if (!open) {
			form.reset();
			setSubmitError(null);
		}
		onOpenChange(open);
	};

	const collateralTypes = templateQuery.data?.allowedCollateralTypes || [];

	return (
		<Sheet open={open} onOpenChange={handleClose}>
			<SheetContent side="right" className="sm:max-w-[450px] overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Add Collateral</SheetTitle>
					<SheetDescription>
						Add a collateral item to secure this loan
					</SheetDescription>
				</SheetHeader>

				{templateQuery.isLoading && (
					<div className="space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-20 w-full" />
					</div>
				)}

				{templateQuery.error && (
					<Alert variant="destructive">
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>
							Failed to load collateral options. Please try again.
						</AlertDescription>
					</Alert>
				)}

				{!templateQuery.isLoading && !templateQuery.error && (
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleSubmit)}
							className="space-y-4"
						>
							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Collateral Type{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<Select
											value={field.value?.toString()}
											onValueChange={(v) => field.onChange(parseInt(v, 10))}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select collateral type" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{collateralTypes.length === 0 && (
													<SelectItem value="none" disabled>
														No collateral types configured
													</SelectItem>
												)}
												{collateralTypes.map((type) => (
													<SelectItem key={type.id} value={type.id.toString()}>
														{type.name}
														{type.description && (
															<span className="text-muted-foreground ml-1">
																- {type.description}
															</span>
														)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="value"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Value ({currency}){" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.01"
												{...field}
												onChange={(e) =>
													field.onChange(
														e.target.value
															? parseFloat(e.target.value)
															: undefined,
													)
												}
												placeholder="Enter collateral value"
											/>
										</FormControl>
										<FormDescription>
											Estimated market value of the collateral
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="Describe the collateral item (e.g., make, model, serial number)"
												rows={3}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<SubmitErrorAlert
								error={submitError}
								title="Unable to add collateral"
							/>

							<SheetFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => handleClose(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={isSubmitting || collateralTypes.length === 0}
								>
									{isSubmitting ? "Adding..." : "Add Collateral"}
								</Button>
							</SheetFooter>
						</form>
					</Form>
				)}
			</SheetContent>
		</Sheet>
	);
}
