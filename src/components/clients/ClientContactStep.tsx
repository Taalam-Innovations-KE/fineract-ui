import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ClientFormData } from "../../lib/schemas/client";

interface ClientContactStepProps {
	control: Control<ClientFormData>;
	errors: Record<string, { message?: string }>;
	clientKind: "individual" | "business";
	clientTypeOptions: Array<{ id?: number; name?: string }>;
	clientClassificationOptions: Array<{ id?: number; name?: string }>;
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
		<Card>
			<CardHeader>
				<CardTitle>Contact & KYC</CardTitle>
				<CardDescription>
					Collect communication details and identifiers for compliance.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
								<Select
									value={field.value !== undefined ? String(field.value) : ""}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={!clientTypeOptions.length}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select client type" />
									</SelectTrigger>
									<SelectContent>
										{clientTypeOptions
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

				<FormField label="Client Classification">
					<Controller
						control={control}
						name="clientClassificationId"
						render={({ field }) => (
							<Select
								value={field.value !== undefined ? String(field.value) : ""}
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={!clientClassificationOptions.length}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select classification" />
								</SelectTrigger>
								<SelectContent>
									{clientClassificationOptions
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

				{!isBusiness ? (
					<>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<FormField label="National ID" error={errors.nationalId?.message}>
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
						</div>
						<p className="text-xs text-muted-foreground">
							Provide either National ID or Passport Number, but not both.
						</p>
					</>
				) : (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
			</CardContent>
		</Card>
	);
}
