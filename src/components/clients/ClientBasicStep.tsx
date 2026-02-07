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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ClientFormData } from "../../lib/schemas/client";

interface ClientBasicStepProps {
	control: Control<ClientFormData>;
	errors: Record<string, { message?: string }>;
	officeOptions: Array<{ id?: number; name: string; nameDecorated?: string }>;
	legalFormOptions: Array<{ id?: number; name?: string; value?: string }>;
	canCreateBusinessClient: boolean;
}

export function ClientBasicStep({
	control,
	errors,
	officeOptions,
	legalFormOptions,
	canCreateBusinessClient,
}: ClientBasicStepProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Profile & Classification</CardTitle>
				<CardDescription>
					Set onboarding scope, legal profile, and branch ownership.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-xs text-muted-foreground">
					Client status starts as Pending unless you enable activation in the
					final step.
				</p>
				<FormField label="Office" required error={errors.officeId?.message}>
					<Controller
						control={control}
						name="officeId"
						render={({ field }) => (
							<Select
								value={field.value !== undefined ? String(field.value) : ""}
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={!officeOptions.length}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select office" />
								</SelectTrigger>
								<SelectContent>
									{officeOptions
										.filter((option) => option.id !== undefined)
										.map((option) => (
											<SelectItem key={option.id} value={String(option.id)}>
												{option.nameDecorated || option.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						)}
					/>
				</FormField>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField
						label="Client Kind"
						required
						error={errors.clientKind?.message}
					>
						<Controller
							control={control}
							name="clientKind"
							render={({ field }) => (
								<Select
									value={field.value || "individual"}
									onValueChange={(value) =>
										field.onChange(value as "individual" | "business")
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select client kind" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="individual">Individual</SelectItem>
										<SelectItem
											value="business"
											disabled={!canCreateBusinessClient}
										>
											Business
										</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
					</FormField>

					<FormField
						label="Legal Form"
						required
						error={errors.legalFormId?.message}
					>
						<Controller
							control={control}
							name="legalFormId"
							render={({ field }) => (
								<Select
									value={field.value !== undefined ? String(field.value) : ""}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={!legalFormOptions.length}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select legal form" />
									</SelectTrigger>
									<SelectContent>
										{legalFormOptions
											.filter((option) => option.id !== undefined)
											.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{option.name || option.value || "Unnamed"}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							)}
						/>
					</FormField>
				</div>
				{!canCreateBusinessClient && (
					<p className="text-xs text-muted-foreground">
						Business onboarding is currently unavailable until Business Types
						are configured in code values.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
