import { Control, Controller } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";

type ClientFormData = Record<string, any>;

interface ClientContactStepProps {
	control: Control<ClientFormData>;
	errors: Record<string, { message?: string }>;
	clientKind: "individual" | "business";
	clientTypeOptions: Array<{ id: number; name: string }>;
	clientClassificationOptions: Array<{ id: number; name: string }>;
}

export function ClientContactStep({
	control,
	errors,
	clientKind,
	clientTypeOptions,
	clientClassificationOptions,
}: ClientContactStepProps) {
	const isBusiness = clientKind === "business";

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField label="Mobile Number">
					<Controller
						control={control}
						name="mobileNo"
						render={({ field }) => (
							<Input {...field} placeholder="Enter mobile number" />
						)}
					/>
				</FormField>
				<FormField label="Email Address">
					<Controller
						control={control}
						name="emailAddress"
						render={({ field }) => (
							<Input
								{...field}
								type="email"
								placeholder="Enter email address"
							/>
						)}
					/>
				</FormField>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField label="External ID">
					<Controller
						control={control}
						name="externalId"
						render={({ field }) => (
							<Input {...field} placeholder="Enter external reference" />
						)}
					/>
				</FormField>
				<FormField label="Client Type">
					<Controller
						control={control}
						name="clientTypeId"
						render={({ field }) => (
							<SelectField
								label=""
								options={clientTypeOptions}
								field={field}
								placeholder="Select client type"
								disabled={!clientTypeOptions.length}
							/>
						)}
					/>
				</FormField>
			</div>
			<FormField label="Client Classification">
				<Controller
					control={control}
					name="clientClassificationId"
					render={({ field }) => (
						<SelectField
							label=""
							options={clientClassificationOptions}
							field={field}
							placeholder="Select classification"
							disabled={!clientClassificationOptions.length}
						/>
					)}
				/>
			</FormField>
			{!isBusiness && (
				<>
					<FormField
						label="National ID"
						required
						error={errors.nationalId?.message}
					>
						<Controller
							control={control}
							name="nationalId"
							render={({ field }) => (
								<Input {...field} placeholder="Enter national ID number" />
							)}
						/>
					</FormField>
					<FormField
						label="Passport Number"
						required
						error={errors.passportNo?.message}
					>
						<Controller
							control={control}
							name="passportNo"
							render={({ field }) => (
								<Input {...field} placeholder="Enter passport number" />
							)}
						/>
					</FormField>
					<p className="text-xs text-muted-foreground">
						Provide national ID or passport to proceed.
					</p>
				</>
			)}
			{isBusiness && (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							label="Business License"
							required
							error={errors.businessLicenseNo?.message}
						>
							<Controller
								control={control}
								name="businessLicenseNo"
								render={({ field }) => (
									<Input
										{...field}
										placeholder="Enter business license number"
									/>
								)}
							/>
						</FormField>
						<FormField label="Registration Number">
							<Controller
								control={control}
								name="registrationNo"
								render={({ field }) => (
									<Input
										{...field}
										placeholder="Enter registration number (optional)"
									/>
								)}
							/>
						</FormField>
					</div>
				</>
			)}
			<FormField label="Tax ID">
				<Controller
					control={control}
					name="taxId"
					render={({ field }) => (
						<Input {...field} placeholder="Enter tax ID (optional)" />
					)}
				/>
			</FormField>

			{/* Placeholder for custom datatables */}
			<FormField label="Custom Data Tables">
				<p className="text-sm text-muted-foreground">
					Custom data table entries can be configured here based on template
					datatables.
				</p>
			</FormField>
		</div>
	);
}
