"use client";

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { LoanApplicationInput } from "@/lib/schemas/loan-application";

interface ProductCharge {
	id: number;
	name?: string;
	amount?: number;
	chargeCalculationType?: { id?: number; value?: string };
	chargeTimeType?: { id?: number; value?: string };
	chargeAppliesTo?: { id?: number; value?: string };
	currency?: { code?: string; displaySymbol?: string };
	penalty?: boolean;
}

interface LoanChargesStepProps {
	availableCharges: ProductCharge[];
	currency?: string;
}

function formatAmount(amount: number | undefined, symbol = "KES"): string {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export function LoanChargesStep({
	availableCharges,
	currency = "KES",
}: LoanChargesStepProps) {
	const form = useFormContext<LoanApplicationInput>();
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "charges",
	});

	const selectedChargeIds = fields.map((f) => f.chargeId);
	const unselectedCharges = availableCharges.filter(
		(c) => !selectedChargeIds.includes(c.id),
	);

	const handleAddCharge = (charge: ProductCharge) => {
		append({
			chargeId: charge.id,
			amount: charge.amount,
		});
	};

	const handleRemoveCharge = (index: number) => {
		remove(index);
	};

	const getChargeById = (chargeId: number) =>
		availableCharges.find((c) => c.id === chargeId);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Loan Charges</CardTitle>
				<p className="text-sm text-muted-foreground">
					All applicable charges from the loan product are pre-selected. You can
					remove any charges you don&apos;t want to apply or adjust amounts.
				</p>
			</CardHeader>
			<CardContent className="space-y-4">
				{availableCharges.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-4">
						No charges configured for this loan product.
					</p>
				) : (
					<>
						{/* Selected Charges */}
						{fields.length > 0 && (
							<div>
								<div className="flex items-center justify-between mb-2">
									<h4 className="text-sm font-medium">
										Selected Charges ({fields.length})
									</h4>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => {
											// Remove all charges
											for (let i = fields.length - 1; i >= 0; i--) {
												remove(i);
											}
										}}
										className="text-muted-foreground hover:text-destructive text-xs"
									>
										Clear All
									</Button>
								</div>
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow className="bg-muted/50">
												<TableHead>Charge</TableHead>
												<TableHead>Type</TableHead>
												<TableHead className="text-right">Amount</TableHead>
												<TableHead className="w-16">Remove</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{fields.map((field, index) => {
												const charge = getChargeById(field.chargeId);
												return (
													<TableRow key={field.id}>
														<TableCell>
															<div className="flex items-center gap-2">
																<span className="font-medium">
																	{charge?.name || `Charge #${field.chargeId}`}
																</span>
																{charge?.penalty && (
																	<Badge
																		variant="destructive"
																		className="text-xs"
																	>
																		Penalty
																	</Badge>
																)}
															</div>
														</TableCell>
														<TableCell className="text-muted-foreground text-sm">
															{charge?.chargeTimeType?.value || "—"}
														</TableCell>
														<TableCell className="text-right">
															<FormField
																control={form.control}
																name={`charges.${index}.amount`}
																render={({ field: amountField }) => (
																	<FormItem className="flex-1">
																		<FormControl>
																			<Input
																				type="number"
																				step="0.01"
																				className="w-28 text-right"
																				{...amountField}
																				onChange={(e) =>
																					amountField.onChange(
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
														</TableCell>
														<TableCell>
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() => handleRemoveCharge(index)}
																className="text-destructive hover:text-destructive"
															>
																<X className="h-4 w-4" />
															</Button>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
							</div>
						)}

						{/* Available Charges (not yet selected) */}
						{unselectedCharges.length > 0 && (
							<div>
								<h4 className="text-sm font-medium mb-2">
									Additional Charges{" "}
									<span className="text-muted-foreground font-normal">
										(click to add)
									</span>
								</h4>
								<div className="rounded-md border divide-y">
									{unselectedCharges.map((charge) => (
										<button
											key={charge.id}
											type="button"
											onClick={() => handleAddCharge(charge)}
											className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
										>
											<div className="flex items-center gap-2">
												<Plus className="h-4 w-4 text-muted-foreground" />
												<span className="font-medium">{charge.name}</span>
												{charge.penalty && (
													<Badge variant="destructive" className="text-xs">
														Penalty
													</Badge>
												)}
												<span className="text-sm text-muted-foreground">
													({charge.chargeTimeType?.value})
												</span>
											</div>
											<span className="font-mono text-sm">
												{charge.chargeCalculationType?.value === "Flat"
													? formatAmount(charge.amount, currency)
													: `${charge.amount}%`}
											</span>
										</button>
									))}
								</div>
							</div>
						)}

						{fields.length === 0 && unselectedCharges.length > 0 && (
							<p className="text-sm text-muted-foreground text-center py-2">
								No charges selected. Click on additional charges above to add
								them to this loan.
							</p>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
