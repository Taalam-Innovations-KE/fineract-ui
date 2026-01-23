"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
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
import { Textarea } from "@/components/ui/textarea";
import { formatDateStringToFormat } from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { GetPaymentTypeData } from "@/lib/fineract/generated/types.gen";
import {
	type LoanApprovalFormData,
	type LoanDisbursementFormData,
	type LoanRejectionFormData,
	type LoanWithdrawalFormData,
	loanApprovalSchema,
	loanDisbursementSchema,
	loanRejectionSchema,
	loanWithdrawalSchema,
} from "@/lib/schemas/loan-commands";
import { useTenantStore } from "@/store/tenant";

type CommandType = "approve" | "disburse" | "reject" | "withdraw";

type CommandFormData =
	| LoanApprovalFormData
	| LoanDisbursementFormData
	| LoanRejectionFormData
	| LoanWithdrawalFormData;

interface LoanCommandDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	commandType: CommandType;
	loanId: number;
	onSuccess?: () => void;
}

function getCommandTitle(commandType: CommandType): string {
	switch (commandType) {
		case "approve":
			return "Approve Loan";
		case "disburse":
			return "Disburse Loan";
		case "reject":
			return "Reject Loan";
		case "withdraw":
			return "Withdraw Loan";
		default:
			return "Loan Command";
	}
}

function getCommandDescription(commandType: CommandType): string {
	switch (commandType) {
		case "approve":
			return "Approve this loan application with the specified details.";
		case "disburse":
			return "Disburse the approved loan amount to the client.";
		case "reject":
			return "Reject this loan application.";
		case "withdraw":
			return "Allow the applicant to withdraw from this loan application.";
		default:
			return "";
	}
}

function getCommandSchema(commandType: CommandType) {
	switch (commandType) {
		case "approve":
			return loanApprovalSchema;
		case "disburse":
			return loanDisbursementSchema;
		case "reject":
			return loanRejectionSchema;
		case "withdraw":
			return loanWithdrawalSchema;
	}
}

function getDefaultValues(commandType: CommandType): Partial<CommandFormData> {
	const today = new Date().toISOString().split("T")[0];
	switch (commandType) {
		case "approve":
			return { approvedOnDate: today };
		case "disburse":
			return { actualDisbursementDate: today };
		case "reject":
			return { rejectedOnDate: today };
		case "withdraw":
			return { withdrawnOnDate: today };
		default:
			return {};
	}
}

export function LoanCommandDialog({
	open,
	onOpenChange,
	commandType,
	loanId,
	onSuccess,
}: LoanCommandDialogProps) {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const schema = getCommandSchema(commandType);

	const form = useForm<CommandFormData>({
		resolver: zodResolver(schema),
		defaultValues: getDefaultValues(commandType),
	});

	const paymentTypesQuery = useQuery({
		queryKey: ["paymentTypes", tenantId],
		queryFn: async () => {
			const response = await fetch(`${BFF_ROUTES.paymentTypes}`, {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) throw new Error("Failed to fetch payment types");
			return response.json() as Promise<GetPaymentTypeData[]>;
		},
		enabled: open && commandType === "disburse",
	});

	const commandMutation = useMutation({
		mutationFn: async (data: CommandFormData) => {
			const response = await fetch(`${BFF_ROUTES.loans}/${loanId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"fineract-platform-tenantid": tenantId,
				},
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Command failed");
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["loans", tenantId] });
			queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
			onOpenChange(false);
			form.reset();
			onSuccess?.();
		},
	});

	const onSubmit = (data: CommandFormData) => {
		const formattedData = { ...data };
		const dateFormat =
			(formattedData as { dateFormat: string }).dateFormat || "dd MMMM yyyy";
		if ("approvedOnDate" in formattedData && formattedData.approvedOnDate) {
			formattedData.approvedOnDate = formatDateStringToFormat(
				formattedData.approvedOnDate,
				dateFormat,
			);
		}
		if (
			"actualDisbursementDate" in formattedData &&
			formattedData.actualDisbursementDate
		) {
			formattedData.actualDisbursementDate = formatDateStringToFormat(
				formattedData.actualDisbursementDate,
				dateFormat,
			);
		}
		if ("rejectedOnDate" in formattedData && formattedData.rejectedOnDate) {
			formattedData.rejectedOnDate = formatDateStringToFormat(
				formattedData.rejectedOnDate,
				dateFormat,
			);
		}
		if ("withdrawnOnDate" in formattedData && formattedData.withdrawnOnDate) {
			formattedData.withdrawnOnDate = formatDateStringToFormat(
				formattedData.withdrawnOnDate,
				dateFormat,
			);
		}
		commandMutation.mutate(formattedData);
	};

	const renderFormFields = () => {
		switch (commandType) {
			case "approve":
				return (
					<>
						<FormField
							control={form.control}
							name="approvedOnDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Approval Date</FormLabel>
									<FormControl>
										<Input type="date" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="approvedLoanAmount"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Approved Amount (Optional)</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.01"
											placeholder="Leave blank to use requested amount"
											{...field}
											onChange={(e) =>
												field.onChange(
													e.target.value
														? parseFloat(e.target.value)
														: undefined,
												)
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="expectedDisbursementDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Expected Disbursement Date (Optional)</FormLabel>
									<FormControl>
										<Input
											type="date"
											min={form.watch("approvedOnDate")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="note"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Note (Optional)</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Additional notes..."
											className="resize-none"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</>
				);

			case "disburse":
				return (
					<>
						<FormField
							control={form.control}
							name="actualDisbursementDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Disbursement Date</FormLabel>
									<FormControl>
										<Input type="date" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="transactionAmount"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Disbursement Amount (Optional)</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.01"
											placeholder="Leave blank for full amount"
											{...field}
											onChange={(e) =>
												field.onChange(
													e.target.value
														? parseFloat(e.target.value)
														: undefined,
												)
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="paymentTypeId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Payment Type</FormLabel>
									<Select
										onValueChange={(value) => field.onChange(parseInt(value))}
										value={field.value?.toString()}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select payment type" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{paymentTypesQuery.data?.map((type) => (
												<SelectItem key={type.id} value={type.id!.toString()}>
													{type.name}
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
							name="note"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Note (Optional)</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Additional notes..."
											className="resize-none"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</>
				);

			case "reject":
				return (
					<>
						<FormField
							control={form.control}
							name="rejectedOnDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Rejection Date</FormLabel>
									<FormControl>
										<Input type="date" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="note"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Note (Optional)</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Reason for rejection..."
											className="resize-none"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</>
				);

			case "withdraw":
				return (
					<>
						<FormField
							control={form.control}
							name="withdrawnOnDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Withdrawal Date</FormLabel>
									<FormControl>
										<Input type="date" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="note"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Note (Optional)</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Reason for withdrawal..."
											className="resize-none"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</>
				);

			default:
				return null;
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="sm:max-w-[425px]">
				<SheetHeader>
					<SheetTitle>{getCommandTitle(commandType)}</SheetTitle>
					<SheetDescription>
						{getCommandDescription(commandType)}
					</SheetDescription>
				</SheetHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						{renderFormFields()}
						<SheetFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={commandMutation.isPending}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={commandMutation.isPending}>
								{commandMutation.isPending
									? "Processing..."
									: getCommandTitle(commandType)}
							</Button>
						</SheetFooter>
					</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
}
