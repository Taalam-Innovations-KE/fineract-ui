"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	type LoanProductAmountFormData,
	loanProductAmountSchema,
} from "@/lib/schemas/loan-product";

interface LoanProductAmountStepProps {
	data?: Partial<LoanProductAmountFormData>;
	onDataValid: (data: LoanProductAmountFormData) => void;
	onDataInvalid: () => void;
}

export function LoanProductAmountStep({
	data,
	onDataValid,
	onDataInvalid,
}: LoanProductAmountStepProps) {
	const {
		register,
		watch,
		formState: { errors, isValid },
	} = useForm<LoanProductAmountFormData>({
		resolver: zodResolver(loanProductAmountSchema),
		mode: "onChange",
		defaultValues: data || {
			minPrincipal: 1000,
			principal: 10000,
			maxPrincipal: 100000,
			inMultiplesOf: 1,
		},
	});

	const watchedValues = watch();

	useEffect(() => {
		if (isValid) {
			onDataValid(watchedValues);
		} else {
			onDataInvalid();
		}
	}, [isValid, watchedValues, onDataValid, onDataInvalid]);

	return (
		<TooltipProvider>
			<Card>
				<CardHeader>
					<CardTitle>Loan Amount Rules</CardTitle>
					<CardDescription>
						Define the minimum, typical, and maximum loan sizes.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-xs text-muted-foreground">
						Typical loan size is the default amount shown when creating a loan;
						borrowers can still request any amount within min/max.
					</p>
					<div className="grid gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="minPrincipal">
								Minimum Principal <span className="text-destructive">*</span>
							</Label>
							<Input
								id="minPrincipal"
								type="number"
								{...register("minPrincipal", { valueAsNumber: true })}
								placeholder="1000"
							/>
							<p className="text-xs text-muted-foreground">
								Lowest amount allowed. Example: 1,000.
							</p>
							{errors.minPrincipal && (
								<p className="text-sm text-destructive">
									{String(errors.minPrincipal.message)}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="principal">
								Default Principal <span className="text-destructive">*</span>
							</Label>
							<Input
								id="principal"
								type="number"
								{...register("principal", { valueAsNumber: true })}
								placeholder="10000"
							/>
							<p className="text-xs text-muted-foreground">
								Default amount shown. Example: 10,000.
							</p>
							{errors.principal && (
								<p className="text-sm text-destructive">
									{String(errors.principal.message)}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="maxPrincipal">
								Maximum Principal <span className="text-destructive">*</span>
							</Label>
							<Input
								id="maxPrincipal"
								type="number"
								{...register("maxPrincipal", { valueAsNumber: true })}
								placeholder="100000"
							/>
							<p className="text-xs text-muted-foreground">
								Highest amount allowed. Example: 100,000.
							</p>
							{errors.maxPrincipal && (
								<p className="text-sm text-destructive">
									{String(errors.maxPrincipal.message)}
								</p>
							)}
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="inMultiplesOf" className="flex items-center gap-2">
							In Multiples Of
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										className="inline-flex items-center"
										aria-label="In multiples info"
									>
										<Info className="h-4 w-4 text-muted-foreground" />
									</button>
								</TooltipTrigger>
								<TooltipContent>
									Restrict approved amounts to this multiple (e.g. 1,000).
								</TooltipContent>
							</Tooltip>
						</Label>
						<Input
							id="inMultiplesOf"
							type="number"
							{...register("inMultiplesOf", { valueAsNumber: true })}
							placeholder="1"
						/>
						<p className="text-xs text-muted-foreground">
							Approved amounts must be in this multiple. Example: 500.
						</p>
						{errors.inMultiplesOf && (
							<p className="text-sm text-destructive">
								{String(errors.inMultiplesOf.message)}
							</p>
						)}
					</div>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
