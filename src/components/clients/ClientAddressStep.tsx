import { Control, Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import type { ClientFormData } from "../../lib/schemas/client";

interface ClientAddressStepProps {
	control: Control<ClientFormData>;
	errors: Record<string, { message?: string }>;
	isAddressEnabled: boolean;
	countryOptions: Array<{ id: number; name: string }>;
}

export function ClientAddressStep({
	control,
	errors,
	isAddressEnabled,
	countryOptions,
}: ClientAddressStepProps) {
	return (
		<div className="space-y-4">
			{isAddressEnabled && (
				<>
					<FormField label="Address Line 1">
						<Controller
							control={control}
							name="addressLine1"
							render={({ field }) => (
								<Input {...field} placeholder="Enter street address" />
							)}
						/>
					</FormField>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField label="City" required error={errors.city?.message}>
							<Controller
								control={control}
								name="city"
								render={({ field }) => (
									<Input {...field} placeholder="Enter city" />
								)}
							/>
						</FormField>
						<FormField
							label="Country"
							required
							error={errors.countryId?.message}
						>
							<Controller
								control={control}
								name="countryId"
								render={({ field }) => (
									<SelectField
										label=""
										options={countryOptions}
										field={field}
										placeholder="Select country"
										disabled={!countryOptions.length}
									/>
								)}
							/>
						</FormField>
					</div>
				</>
			)}
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Controller
						control={control}
						name="active"
						render={({ field }) => (
							<Checkbox
								checked={Boolean(field.value)}
								onCheckedChange={(checked) => field.onChange(Boolean(checked))}
							/>
						)}
					/>
					<label htmlFor="active" className="text-sm font-medium">
						Activate client now
					</label>
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
		</div>
	);
}
