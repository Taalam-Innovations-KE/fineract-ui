import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ClientFormData } from "../../lib/schemas/client";

interface ClientAddressStepProps {
	control: Control<ClientFormData>;
	errors: Record<string, { message?: string }>;
	countryOptions: Array<{ id?: number; name?: string }>;
}

export function ClientAddressStep({
	control,
	errors,
	countryOptions,
}: ClientAddressStepProps) {
	const activeFieldId = "client-active";

	return (
		<Card>
			<CardHeader>
				<CardTitle>Address & Activation</CardTitle>
				<CardDescription>
					Finalize location details and account activation status.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<FormField label="Address Line 1">
					<Controller
						control={control}
						name="addressLine1"
						render={({ field }) => (
							<Input {...field} placeholder="Enter street address" />
						)}
					/>
				</FormField>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField label="City" required error={errors.city?.message}>
						<Controller
							control={control}
							name="city"
							render={({ field }) => (
								<Input {...field} placeholder="Enter city" />
							)}
						/>
					</FormField>
					<FormField label="Country" required error={errors.countryId?.message}>
						<Controller
							control={control}
							name="countryId"
							render={({ field }) => (
								<Select
									value={field.value !== undefined ? String(field.value) : ""}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={!countryOptions.length}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select country" />
									</SelectTrigger>
									<SelectContent>
										{countryOptions
											.filter((option) => option.id !== undefined)
											.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{option.name || "Unnamed"}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							)}
						/>
					</FormField>
				</div>

				<div className="space-y-3 border-t pt-4">
					<div className="flex items-center gap-2">
						<Controller
							control={control}
							name="active"
							render={({ field }) => (
								<Checkbox
									id={activeFieldId}
									checked={Boolean(field.value)}
									onCheckedChange={(checked) =>
										field.onChange(Boolean(checked))
									}
								/>
							)}
						/>
						<Label htmlFor={activeFieldId}>Activate client now</Label>
					</div>
					<Controller
						control={control}
						name="active"
						render={({ field }) =>
							field.value ? (
								<FormField
									label="Activation Date"
									required
									error={errors.activationDate?.message}
								>
									<Controller
										control={control}
										name="activationDate"
										render={({ field: dateField }) => (
											<Input {...dateField} type="date" />
										)}
									/>
								</FormField>
							) : (
								<></>
							)
						}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
