import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

interface ClientDetailsStepProps {
	control: Control<ClientFormData>;
	errors: Record<string, { message?: string }>;
	clientKind: "individual" | "business";
	genderOptions: Array<{ id?: number; name?: string }>;
	businessLineOptions: Array<{ id?: number; name?: string }>;
	staffOptions: Array<{ id?: number; displayName?: string }>;
	savingProductOptions: Array<{ id?: number; name?: string }>;
	hasBusinessTypeConfiguration: boolean;
}

export function ClientDetailsStep({
	control,
	errors,
	clientKind,
	genderOptions,
	businessLineOptions,
	staffOptions,
	savingProductOptions,
	hasBusinessTypeConfiguration,
}: ClientDetailsStepProps) {
	const isBusiness = clientKind === "business";

	return (
		<Card>
			<CardHeader>
				<CardTitle>Identity Details</CardTitle>
				<CardDescription>
					Capture personal or business profile details used across accounts and
					workflows.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!isBusiness ? (
					<>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<FormField
								label="First Name"
								required
								error={errors.firstname?.message}
							>
								<Controller
									control={control}
									name="firstname"
									render={({ field }) => (
										<Input {...field} placeholder="Enter first name" />
									)}
								/>
							</FormField>
							<FormField
								label="Last Name"
								required
								error={errors.lastname?.message}
							>
								<Controller
									control={control}
									name="lastname"
									render={({ field }) => (
										<Input {...field} placeholder="Enter last name" />
									)}
								/>
							</FormField>
						</div>
						<FormField label="Middle Name">
							<Controller
								control={control}
								name="middlename"
								render={({ field }) => (
									<Input {...field} placeholder="Enter middle name" />
								)}
							/>
						</FormField>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<FormField label="Date of Birth">
								<Controller
									control={control}
									name="dateOfBirth"
									render={({ field }) => <Input {...field} type="date" />}
								/>
							</FormField>
							<FormField label="Gender" error={errors.genderId?.message}>
								<Controller
									control={control}
									name="genderId"
									render={({ field }) => (
										<Select
											value={
												field.value !== undefined ? String(field.value) : ""
											}
											onValueChange={(value) => field.onChange(Number(value))}
											disabled={!genderOptions.length}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select gender" />
											</SelectTrigger>
											<SelectContent>
												{genderOptions
													.filter((option) => option.id !== undefined)
													.map((option) => (
														<SelectItem
															key={option.id}
															value={String(option.id)}
														>
															{option.name || "Unnamed"}
														</SelectItem>
													))}
											</SelectContent>
										</Select>
									)}
								/>
							</FormField>
						</div>
					</>
				) : (
					<>
						<FormField
							label="Business Name"
							required
							error={errors.fullname?.message}
						>
							<Controller
								control={control}
								name="fullname"
								render={({ field }) => (
									<Input
										{...field}
										placeholder="Enter registered business name"
									/>
								)}
							/>
						</FormField>
						<FormField
							label="Business Type"
							required
							error={errors.businessTypeId?.message}
						>
							<Controller
								control={control}
								name="businessTypeId"
								render={({ field }) => (
									<Select
										value={field.value !== undefined ? String(field.value) : ""}
										onValueChange={(value) => field.onChange(Number(value))}
										disabled={!businessLineOptions.length}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select business type" />
										</SelectTrigger>
										<SelectContent>
											{businessLineOptions
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
						{!hasBusinessTypeConfiguration && (
							<Alert variant="warning">
								<AlertTitle>Missing Business Types</AlertTitle>
								<AlertDescription>
									Add business type code values before onboarding entity
									clients.
								</AlertDescription>
							</Alert>
						)}
					</>
				)}

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField label="Staff Assignment">
						<Controller
							control={control}
							name="staffId"
							render={({ field }) => (
								<Select
									value={field.value !== undefined ? String(field.value) : ""}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={!staffOptions.length}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select staff" />
									</SelectTrigger>
									<SelectContent>
										{staffOptions
											.filter((option) => option.id !== undefined)
											.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{option.displayName || "Unnamed"}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							)}
						/>
					</FormField>
					<FormField label="Default Savings Product">
						<Controller
							control={control}
							name="savingsProductId"
							render={({ field }) => (
								<Select
									value={field.value !== undefined ? String(field.value) : ""}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={!savingProductOptions.length}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select savings product" />
									</SelectTrigger>
									<SelectContent>
										{savingProductOptions
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
			</CardContent>
		</Card>
	);
}
