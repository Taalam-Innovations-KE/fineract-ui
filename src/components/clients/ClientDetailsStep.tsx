import { Control, Controller } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";

type ClientFormData = Record<string, any>;

interface ClientDetailsStepProps {
	control: Control<ClientFormData>;
	errors: Record<string, { message?: string }>;
	clientKind: "individual" | "business";
	genderOptions: Array<{ id: number; name: string }>;
	legalFormOptions: Array<{ id: number; name: string }>;
	businessLineOptions: Array<{ id: number; name: string }>;
	staffOptions: Array<{ id: number; displayName: string }>;
	savingProductOptions: Array<{ id: number; name: string }>;
}

export function ClientDetailsStep({
	control,
	errors,
	clientKind,
	genderOptions,
	legalFormOptions,
	businessLineOptions,
	staffOptions,
	savingProductOptions,
}: ClientDetailsStepProps) {
	const isBusiness = clientKind === "business";

	return (
		<div className="space-y-4">
			{!isBusiness ? (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField label="Date of Birth">
							<Controller
								control={control}
								name="dateOfBirth"
								render={({ field }) => <Input {...field} type="date" />}
							/>
						</FormField>
						<FormField label="Gender">
							<Controller
								control={control}
								name="genderId"
								render={({ field }) => (
									<SelectField
										label=""
										options={genderOptions}
										field={field}
										placeholder="Select gender"
										disabled={!genderOptions.length}
									/>
								)}
							/>
						</FormField>
					</div>
					<FormField label="Staff Assignment">
						<Controller
							control={control}
							name="staffId"
							render={({ field }) => (
								<SelectField
									label=""
									options={staffOptions.map((opt) => ({
										id: opt.id,
										name: opt.displayName,
									}))}
									field={field}
									placeholder="Select staff"
									disabled={!staffOptions.length}
								/>
							)}
						/>
					</FormField>
					<FormField label="Savings Product">
						<Controller
							control={control}
							name="savingsProductId"
							render={({ field }) => (
								<SelectField
									label=""
									options={savingProductOptions}
									field={field}
									placeholder="Select savings product"
									disabled={!savingProductOptions.length}
								/>
							)}
						/>
					</FormField>
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
								<Input {...field} placeholder="Enter business name" />
							)}
						/>
					</FormField>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							label="Legal Form"
							required
							error={errors.legalFormId?.message}
						>
							<Controller
								control={control}
								name="legalFormId"
								render={({ field }) => (
									<SelectField
										label=""
										options={legalFormOptions}
										field={field}
										placeholder="Select legal form"
										disabled={!legalFormOptions.length}
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
									<SelectField
										label=""
										options={businessLineOptions}
										field={field}
										placeholder="Select business type"
										disabled={!businessLineOptions.length}
									/>
								)}
							/>
						</FormField>
					</div>
				</>
			)}
		</div>
	);
}
