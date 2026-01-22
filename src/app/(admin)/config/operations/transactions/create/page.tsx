"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { PageShell } from "@/components/config/page-shell";
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
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { JournalEntryCommand } from "@/lib/fineract/generated/types.gen";
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
			dateFormat: "yyyy-MM-dd",
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

function DebitCreditLines({
	control,
	name,
	label,
	glAccounts,
}: {
	control: any; // TODO: Use proper Control type from react-hook-form
	name: "debits" | "credits";
	label: string;
	glAccounts: { id: number; name: string; glCode: string }[];
}) {
	const { fields, append, remove } = useFieldArray({
		control,
		name,
	});

	const total = fields.reduce((sum, field, index) => {
		const amount = control._getWatch(`${name}.${index}.amount`);
		return sum + (amount || 0);
	}, 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{label}</CardTitle>
				<CardDescription>
					Add {label.toLowerCase()} entries for this transaction
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{fields.map((field, index) => (
					<div
						key={field.id}
						className="flex items-end gap-4 p-4 border rounded"
					>
						<div className="flex-1">
							<Label htmlFor={`${name}.${index}.glAccountId`}>GL Account</Label>
							<Controller
								name={`${name}.${index}.glAccountId`}
								control={control}
								render={({ field: controllerField }) => (
									<Select
										value={controllerField.value?.toString()}
										onValueChange={(value) =>
											controllerField.onChange(Number(value))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select GL account" />
										</SelectTrigger>
										<SelectContent>
											{glAccounts.map((account) => (
												<SelectItem
													key={account.id}
													value={account.id.toString()}
												>
													{account.name} ({account.glCode})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="flex-1">
							<Label htmlFor={`${name}.${index}.amount`}>Amount</Label>
							<Input
								type="number"
								step="0.01"
								placeholder="0.00"
								{...control.register(`${name}.${index}.amount`, {
									valueAsNumber: true,
								})}
							/>
						</div>
						<div className="flex-1">
							<Label htmlFor={`${name}.${index}.comments`}>Comments</Label>
							<Input
								placeholder="Optional comments"
								{...control.register(`${name}.${index}.comments`)}
							/>
						</div>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => remove(index)}
							disabled={fields.length === 1}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				))}
				<div className="flex justify-between items-center">
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							append({
								glAccountId: undefined,
								amount: undefined,
								comments: "",
							})
						}
					>
						<Plus className="h-4 w-4 mr-2" />
						Add {label.slice(0, -1).toLowerCase()}
					</Button>
					<div className="text-sm font-medium">
						Total {label}: KES {total.toFixed(2)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export default function CreateJournalEntryPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [toastMessage, setToastMessage] = useState<string | null>(null);

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
		formState: { errors, isValid },
		reset,
	} = useForm<JournalEntryFormData>({
		resolver: zodResolver(journalEntrySchema),
		defaultValues: {
			officeId: undefined,
			transactionDate: new Date().toISOString().split("T")[0],
			debits: [{ glAccountId: undefined, amount: undefined, comments: "" }],
			credits: [{ glAccountId: undefined, amount: undefined, comments: "" }],
		},
	});

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
			setToastMessage("Journal entry created successfully");
			reset();
		},
	});

	const onSubmit = (data: JournalEntryFormData) => {
		if (!isBalanced) {
			alert("Debits and credits must balance");
			return;
		}
		createMutation.mutate(data);
	};

	useEffect(() => {
		if (!toastMessage) return;
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

	return (
		<>
			<PageShell
				title="Create Journal Entry"
				subtitle="Record a new manual journal entry"
				actions={
					<Button asChild variant="outline">
						<Link href="/config/operations/transactions">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Transactions
						</Link>
					</Button>
				}
			>
				<div className="max-w-4xl mx-auto space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Transaction Details</CardTitle>
							<CardDescription>
								Enter the basic information for this journal entry
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<Label htmlFor="officeId">Office</Label>
									<Controller
										name="officeId"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value?.toString()}
												onValueChange={(value) => field.onChange(Number(value))}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select office" />
												</SelectTrigger>
												<SelectContent>
													{officesQuery.data?.map((office) => (
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
										<p className="text-sm text-destructive mt-1">
											{errors.officeId.message}
										</p>
									)}
								</div>
								<div>
									<Label htmlFor="transactionDate">Transaction Date</Label>
									<Input type="date" {...control.register("transactionDate")} />
									{errors.transactionDate && (
										<p className="text-sm text-destructive mt-1">
											{errors.transactionDate.message}
										</p>
									)}
								</div>
							</div>
							<div>
								<Label htmlFor="comments">Comments</Label>
								<Input
									placeholder="Optional overall comments"
									{...control.register("comments")}
								/>
							</div>
						</CardContent>
					</Card>

					{glAccountsQuery.data && (
						<DebitCreditLines
							control={control}
							name="debits"
							label="Debits"
							glAccounts={glAccountsQuery.data}
						/>
					)}

					{glAccountsQuery.data && (
						<DebitCreditLines
							control={control}
							name="credits"
							label="Credits"
							glAccounts={glAccountsQuery.data}
						/>
					)}

					<Card>
						<CardContent className="pt-6">
							<div className="flex justify-between items-center">
								<div>
									<div className="text-lg font-semibold">
										Total Debits: KES {totalDebits.toFixed(2)}
									</div>
									<div className="text-lg font-semibold">
										Total Credits: KES {totalCredits.toFixed(2)}
									</div>
									<div
										className={`text-sm font-medium ${
											isBalanced ? "text-green-600" : "text-red-600"
										}`}
									>
										{isBalanced ? "Balanced" : "Unbalanced"}
									</div>
								</div>
								<Button
									onClick={handleSubmit(onSubmit)}
									disabled={!isValid || !isBalanced || createMutation.isPending}
								>
									<Save className="h-4 w-4 mr-2" />
									{createMutation.isPending ? "Creating..." : "Create Entry"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</PageShell>

			{toastMessage && (
				<div className="fixed bottom-6 right-6 z-50 w-[280px]">
					<Alert variant="success">
						<AlertTitle>Success</AlertTitle>
						<AlertDescription>{toastMessage}</AlertDescription>
					</Alert>
				</div>
			)}
		</>
	);
}
