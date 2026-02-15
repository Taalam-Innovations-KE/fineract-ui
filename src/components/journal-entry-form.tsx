"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, X } from "lucide-react";
import { Control, Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatDateStringToFormat } from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	JournalEntryCommand,
	JournalEntryData,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

// Zod schema for journal entry validation
const debitCreditSchema = z.object({
	glAccountId: z.number().min(1, "GL Account is required"),
	amount: z.number().positive("Amount must be positive"),
	comments: z.string().optional(),
});

const journalEntrySchema = z.object({
	officeId: z.number().min(1, "Office is required"),
	transactionDate: z.string().min(1, "Transaction date is required"),
	debits: z
		.array(debitCreditSchema)
		.min(1, "At least one debit entry required"),
	credits: z
		.array(debitCreditSchema)
		.min(1, "At least one credit entry required"),
	paymentTypeId: z.number().optional(),
	accountNumber: z.string().optional(),
	checkNumber: z.string().optional(),
	routingCode: z.string().optional(),
	receiptNumber: z.string().optional(),
	bankNumber: z.string().optional(),
	comments: z.string().optional(),
});

type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

async function fetchOffices(tenantId: string) {
	const response = await fetch(`${BFF_ROUTES.offices}`, {
		headers: { "x-tenant-id": tenantId },
	});
	if (!response.ok) throw new Error("Failed to fetch offices");
	return (await response.json()) as { id: number; name: string }[];
}

async function fetchGLAccounts(tenantId: string) {
	const response = await fetch(`${BFF_ROUTES.glaccounts}`, {
		headers: { "x-tenant-id": tenantId },
	});
	if (!response.ok) throw new Error("Failed to fetch GL accounts");
	return (await response.json()) as {
		id: number;
		name: string;
		glCode: string;
		type: { value: string };
	}[];
}

async function createJournalEntry(
	tenantId: string,
	data: JournalEntryFormData,
): Promise<{ transactionId: string }> {
	const response = await fetch(BFF_ROUTES.journalEntries, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify({
			...data,
			dateFormat: "dd MMMM yyyy",
			locale: "en",
		}),
	});

	const result = await response.json();

	if (!response.ok) {
		throw new Error(
			result.message ||
				result.errors?.[0]?.defaultUserMessage ||
				"Failed to create journal entry",
		);
	}

	return result;
}

interface DebitCreditEntryProps {
	index: number;
	control: Control<JournalEntryFormData>;
	glAccounts: { id: number; name: string; glCode: string }[];
	isDebit: boolean;
	onRemove: () => void;
}

function DebitCreditEntry({
	index,
	control,
	glAccounts,
	isDebit,
	onRemove,
}: DebitCreditEntryProps) {
	return (
		<div className="grid gap-4 md:grid-cols-4 items-end border rounded-none p-4">
			<div className="space-y-2">
				<Label>GL Account</Label>
				<Controller
					name={
						isDebit
							? `debits.${index}.glAccountId`
							: `credits.${index}.glAccountId`
					}
					control={control}
					render={({ field }) => (
						<Select
							value={field.value?.toString()}
							onValueChange={(value) => field.onChange(parseInt(value))}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select GL Account" />
							</SelectTrigger>
							<SelectContent>
								{glAccounts.map((account) => (
									<SelectItem key={account.id} value={account.id.toString()}>
										{account.name} ({account.glCode})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
			</div>
			<div className="space-y-2">
				<Label>Amount</Label>
				<Controller
					name={isDebit ? `debits.${index}.amount` : `credits.${index}.amount`}
					control={control}
					render={({ field }) => (
						<Input
							type="number"
							step="0.01"
							placeholder="0.00"
							{...field}
							onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
						/>
					)}
				/>
			</div>
			<div className="space-y-2">
				<Label>Comments</Label>
				<Controller
					name={
						isDebit ? `debits.${index}.comments` : `credits.${index}.comments`
					}
					control={control}
					render={({ field }) => (
						<Input placeholder="Optional comments" {...field} />
					)}
				/>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={onRemove}
				className="rounded-none"
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>
	);
}

interface JournalEntryFormProps {
	initialData?: JournalEntryData;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function JournalEntryForm({
	initialData,
	onSuccess,
	onCancel,
}: JournalEntryFormProps) {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const officesQuery = useQuery({
		queryKey: ["offices", tenantId],
		queryFn: () => fetchOffices(tenantId),
	});

	const glAccountsQuery = useQuery({
		queryKey: ["glaccounts", tenantId],
		queryFn: () => fetchGLAccounts(tenantId),
	});

	const {
		control,
		handleSubmit,
		watch,
		reset,
		formState: { errors },
	} = useForm<JournalEntryFormData>({
		resolver: zodResolver(journalEntrySchema),
		defaultValues: initialData
			? {
					officeId: initialData.officeId,
					transactionDate: initialData.transactionDate?.split("T")[0] || "",
					debits: initialData.debits?.map((d) => ({
						glAccountId: d.glAccountId,
						amount: d.amount,
						comments: "",
					})) || [{ glAccountId: 0, amount: 0 }],
					credits: initialData.credits?.map((c) => ({
						glAccountId: c.glAccountId,
						amount: c.amount,
						comments: "",
					})) || [{ glAccountId: 0, amount: 0 }],
				}
			: {
					officeId: 0,
					transactionDate: new Date().toISOString().split("T")[0],
					debits: [{ glAccountId: 0, amount: 0 }],
					credits: [{ glAccountId: 0, amount: 0 }],
				},
	});

	const debitsField = useFieldArray({ control, name: "debits" });
	const creditsField = useFieldArray({ control, name: "credits" });

	const debits = watch("debits");
	const credits = watch("credits");

	const totalDebits =
		debits?.reduce((sum, debit) => sum + (debit.amount || 0), 0) || 0;
	const totalCredits =
		credits?.reduce((sum, credit) => sum + (credit.amount || 0), 0) || 0;
	const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

	const createMutation = useMutation({
		mutationFn: (data: JournalEntryFormData) =>
			createJournalEntry(tenantId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["journalEntries", tenantId] });
			toast.success("Journal entry created successfully");
			reset();
			onSuccess?.();
		},
	});

	const onSubmit = (data: JournalEntryFormData) => {
		if (!isBalanced) {
			toast.error("Debits and credits must balance");
			return;
		}
		const formattedData = {
			...data,
			transactionDate: formatDateStringToFormat(
				data.transactionDate,
				"dd MMMM yyyy",
			),
		};
		createMutation.mutate(formattedData);
	};

	const offices = officesQuery.data || [];
	const glAccounts = glAccountsQuery.data || [];

	return (
		<div className="space-y-6">
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>
							Enter the basic details for the journal entry
						</CardDescription>
					</CardHeader>
					<CardContent className="p-4 space-y-3">
						<div className="grid gap-3 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="officeId">Office</Label>
								<Controller
									name="officeId"
									control={control}
									render={({ field }) => (
										<Select
											value={field.value?.toString()}
											onValueChange={(value) => field.onChange(parseInt(value))}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select Office" />
											</SelectTrigger>
											<SelectContent>
												{offices.map((office) => (
													<SelectItem
														key={office.id}
														value={office.id.toString()}
													>
														{office.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
								{errors.officeId && (
									<p className="text-sm text-destructive">
										{errors.officeId.message}
									</p>
								)}
							</div>
							<div className="space-y-2">
								<Label htmlFor="transactionDate">Transaction Date</Label>
								<Controller
									name="transactionDate"
									control={control}
									render={({ field }) => <Input type="date" {...field} />}
								/>
								{errors.transactionDate && (
									<p className="text-sm text-destructive">
										{errors.transactionDate.message}
									</p>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Debit Entries</CardTitle>
						<CardDescription>Accounts to be debited</CardDescription>
					</CardHeader>
					<CardContent className="p-4 space-y-3">
						{debitsField.fields.map((field, index) => (
							<DebitCreditEntry
								key={field.id}
								index={index}
								control={control}
								glAccounts={glAccounts}
								isDebit={true}
								onRemove={() => debitsField.remove(index)}
							/>
						))}
						<Button
							type="button"
							variant="outline"
							onClick={() => debitsField.append({ glAccountId: 0, amount: 0 })}
							className="rounded-none"
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Debit Entry
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Credit Entries</CardTitle>
						<CardDescription>Accounts to be credited</CardDescription>
					</CardHeader>
					<CardContent className="p-4 space-y-3">
						{creditsField.fields.map((field, index) => (
							<DebitCreditEntry
								key={field.id}
								index={index}
								control={control}
								glAccounts={glAccounts}
								isDebit={false}
								onRemove={() => creditsField.remove(index)}
							/>
						))}
						<Button
							type="button"
							variant="outline"
							onClick={() => creditsField.append({ glAccountId: 0, amount: 0 })}
							className="rounded-none"
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Credit Entry
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Summary</CardTitle>
						<CardDescription>Verify the entry balances</CardDescription>
					</CardHeader>
					<CardContent className="p-4">
						<div className="grid gap-3 md:grid-cols-3">
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600">
									{totalDebits.toFixed(2)}
								</div>
								<div className="text-sm text-muted-foreground">
									Total Debits
								</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">
									{totalCredits.toFixed(2)}
								</div>
								<div className="text-sm text-muted-foreground">
									Total Credits
								</div>
							</div>
							<div className="text-center">
								<div
									className={`text-2xl font-bold ${isBalanced ? "text-green-600" : "text-red-600"}`}
								>
									{(totalDebits - totalCredits).toFixed(2)}
								</div>
								<div className="text-sm text-muted-foreground">
									{isBalanced ? "Balanced" : "Out of Balance"}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="flex gap-2 justify-end">
					<Button
						type="submit"
						disabled={createMutation.isPending || !isBalanced}
						className="rounded-none"
					>
						<Save className="h-4 w-4 mr-2" />
						{createMutation.isPending ? "Creating..." : "Create Entry"}
					</Button>
					{onCancel && (
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							className="rounded-none"
						>
							<X className="w-4 h-4 mr-2" />
							Cancel
						</Button>
					)}
				</div>
			</form>
		</div>
	);
}
