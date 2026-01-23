import type { Control, FieldErrors, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";

// Temporary local type - will move to shared schema later
type ClientFormData = FieldValues;

interface ClientBasicStepProps {
	control: Control<ClientFormData>;
	errors: Record<string, { message?: string }>;
	officeOptions: Array<{ id?: number; name: string; nameDecorated?: string }>;
}

export function ClientBasicStep({
	control,
	errors,
	officeOptions,
}: ClientBasicStepProps) {
	return (
		<div className="space-y-4">
			<FormField label="Office" required error={errors.officeId?.message}>
				<Controller
					control={control}
					name="officeId"
					render={({ field }) => (
						<SelectField
							label=""
							options={officeOptions.map((opt) => ({
								id: opt.id,
								name: opt.nameDecorated || opt.name,
							}))}
							field={field}
							placeholder="Select office"
							disabled={!officeOptions.length}
						/>
					)}
				/>
			</FormField>

			<FormField
				label="Client Kind"
				required
				error={errors.clientKind?.message}
			>
				<Controller
					control={control}
					name="clientKind"
					render={({ field }) => (
						<SelectField
							label=""
							options={[
								{ id: 1, name: "Individual" },
								{ id: 2, name: "Business" },
							]}
							field={{
								...field,
								value:
									field.value === "individual"
										? 1
										: field.value === "business"
											? 2
											: undefined,
								onChange: (value: number) =>
									field.onChange(value === 1 ? "individual" : "business"),
							}}
							placeholder="Select client kind"
						/>
					)}
				/>
			</FormField>
		</div>
	);
}
