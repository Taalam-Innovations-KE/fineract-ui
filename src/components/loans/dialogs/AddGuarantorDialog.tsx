"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Building2, User, Users } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GuarantorInput,
	GuarantorTemplateResponse,
} from "@/lib/schemas/loan-metadata";
import {
	existingClientGuarantorSchema,
	externalGuarantorSchema,
	GUARANTOR_TYPES,
	staffGuarantorSchema,
} from "@/lib/schemas/loan-metadata";
import { useTenantStore } from "@/store/tenant";

interface AddGuarantorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	loanId: number;
	onSuccess: () => void;
}

type GuarantorType = "client" | "staff" | "external";

const schemaMap = {
	client: existingClientGuarantorSchema,
	staff: staffGuarantorSchema,
	external: externalGuarantorSchema,
};

export function AddGuarantorDialog({
	open,
	onOpenChange,
	loanId,
	onSuccess,
}: AddGuarantorDialogProps) {
	const { tenantId } = useTenantStore();
	const [guarantorType, setGuarantorType] = useState<GuarantorType>("client");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const templateQuery = useQuery({
		queryKey: ["guarantorTemplate", loanId, tenantId],
		queryFn: async () => {
			const response = await fetch(BFF_ROUTES.loanGuarantorTemplate(loanId), {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) throw new Error("Failed to load template");
			return response.json() as Promise<GuarantorTemplateResponse>;
		},
		enabled: open,
	});

	const clientsQuery = useQuery({
		queryKey: ["clients", tenantId],
		queryFn: async () => {
			const response = await fetch(BFF_ROUTES.clients, {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) throw new Error("Failed to load clients");
			const data = await response.json();
			return data.pageItems || [];
		},
		enabled: open && guarantorType === "client",
	});

	const staffQuery = useQuery({
		queryKey: ["staff", tenantId],
		queryFn: async () => {
			const response = await fetch(BFF_ROUTES.staff, {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) throw new Error("Failed to load staff");
			return response.json();
		},
		enabled: open && guarantorType === "staff",
	});

	const currentSchema = schemaMap[guarantorType];

	const form = useForm<GuarantorInput>({
		resolver: zodResolver(currentSchema),
		defaultValues: {
			guarantorTypeId:
				guarantorType === "client"
					? GUARANTOR_TYPES.EXISTING_CLIENT
					: guarantorType === "staff"
						? GUARANTOR_TYPES.STAFF
						: GUARANTOR_TYPES.EXTERNAL,
		} as GuarantorInput,
	});

	const handleTypeChange = (type: GuarantorType) => {
		setGuarantorType(type);
		form.reset({
			guarantorTypeId:
				type === "client"
					? GUARANTOR_TYPES.EXISTING_CLIENT
					: type === "staff"
						? GUARANTOR_TYPES.STAFF
						: GUARANTOR_TYPES.EXTERNAL,
		} as GuarantorInput);
		setSubmitError(null);
	};

	const handleSubmit = async (data: GuarantorInput) => {
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const response = await fetch(BFF_ROUTES.loanGuarantors(loanId), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"fineract-platform-tenantid": tenantId,
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.message ||
						error.errors?.[0]?.defaultUserMessage ||
						"Failed to add guarantor",
				);
			}

			onSuccess();
			onOpenChange(false);
			form.reset();
		} catch (error) {
			setSubmitError(
				error instanceof Error ? error.message : "Failed to add guarantor",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const template = templateQuery.data;
	const relationshipTypes =
		template?.allowedClientRelationshipTypes ||
		template?.clientRelationshipTypes ||
		[];

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="sm:max-w-[550px] overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Add Guarantor</SheetTitle>
					<SheetDescription>
						Add a guarantor to secure this loan
					</SheetDescription>
				</SheetHeader>

				{templateQuery.isLoading && (
					<div className="space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				)}

				{templateQuery.error && (
					<Alert variant="destructive">
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>
							Failed to load guarantor options. Please try again.
						</AlertDescription>
					</Alert>
				)}

				{!templateQuery.isLoading && !templateQuery.error && (
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleSubmit)}
							className="space-y-4"
						>
							<Tabs
								value={guarantorType}
								onValueChange={(v) => handleTypeChange(v as GuarantorType)}
							>
								<TabsList className="grid w-full grid-cols-3">
									<TabsTrigger value="client" className="gap-1.5">
										<Users className="h-4 w-4" />
										Client
									</TabsTrigger>
									<TabsTrigger value="staff" className="gap-1.5">
										<Building2 className="h-4 w-4" />
										Staff
									</TabsTrigger>
									<TabsTrigger value="external" className="gap-1.5">
										<User className="h-4 w-4" />
										External
									</TabsTrigger>
								</TabsList>

								<div className="mt-4">
									<TabsContent value="client" className="space-y-4 mt-0">
										<FormField
											control={form.control}
											name="entityId"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														Select Client{" "}
														<span className="text-destructive">*</span>
													</FormLabel>
													<Select
														value={field.value?.toString()}
														onValueChange={(v) =>
															field.onChange(parseInt(v, 10))
														}
													>
														<FormControl>
															<SelectTrigger>
																<SelectValue placeholder="Select a client" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{clientsQuery.isLoading && (
																<SelectItem value="loading" disabled>
																	Loading clients...
																</SelectItem>
															)}
															{clientsQuery.data?.map(
																(client: {
																	id: number;
																	displayName?: string;
																	accountNo?: string;
																}) => (
																	<SelectItem
																		key={client.id}
																		value={client.id.toString()}
																	>
																		{client.displayName} ({client.accountNo})
																	</SelectItem>
																),
															)}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
									</TabsContent>

									<TabsContent value="staff" className="space-y-4 mt-0">
										<FormField
											control={form.control}
											name="entityId"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														Select Staff Member{" "}
														<span className="text-destructive">*</span>
													</FormLabel>
													<Select
														value={field.value?.toString()}
														onValueChange={(v) =>
															field.onChange(parseInt(v, 10))
														}
													>
														<FormControl>
															<SelectTrigger>
																<SelectValue placeholder="Select a staff member" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{staffQuery.isLoading && (
																<SelectItem value="loading" disabled>
																	Loading staff...
																</SelectItem>
															)}
															{staffQuery.data?.map(
																(staff: {
																	id: number;
																	displayName?: string;
																}) => (
																	<SelectItem
																		key={staff.id}
																		value={staff.id.toString()}
																	>
																		{staff.displayName}
																	</SelectItem>
																),
															)}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
									</TabsContent>

									<TabsContent value="external" className="space-y-4 mt-0">
										<div className="grid grid-cols-2 gap-4">
											<FormField
												control={form.control}
												name="firstname"
												render={({ field }) => (
													<FormItem>
														<FormLabel>
															First Name{" "}
															<span className="text-destructive">*</span>
														</FormLabel>
														<FormControl>
															<Input {...field} placeholder="First name" />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="lastname"
												render={({ field }) => (
													<FormItem>
														<FormLabel>
															Last Name{" "}
															<span className="text-destructive">*</span>
														</FormLabel>
														<FormControl>
															<Input {...field} placeholder="Last name" />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>

										<FormField
											control={form.control}
											name="mobileNumber"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Mobile Number</FormLabel>
													<FormControl>
														<Input {...field} placeholder="+254 7XX XXX XXX" />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="addressLine1"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Address</FormLabel>
													<FormControl>
														<Input {...field} placeholder="Street address" />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<div className="grid grid-cols-2 gap-4">
											<FormField
												control={form.control}
												name="city"
												render={({ field }) => (
													<FormItem>
														<FormLabel>City</FormLabel>
														<FormControl>
															<Input {...field} placeholder="City" />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="country"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Country</FormLabel>
														<FormControl>
															<Input {...field} placeholder="Country" />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									</TabsContent>
								</div>
							</Tabs>

							{/* Common Fields */}
							<div className="border-t pt-4 space-y-4">
								<FormField
									control={form.control}
									name="clientRelationshipTypeId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Relationship to Borrower</FormLabel>
											<Select
												value={field.value?.toString()}
												onValueChange={(v) => field.onChange(parseInt(v, 10))}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select relationship" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{relationshipTypes.map((rel) => (
														<SelectItem key={rel.id} value={rel.id.toString()}>
															{rel.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="amount"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Guarantee Amount</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? parseFloat(e.target.value)
																: undefined,
														)
													}
													placeholder="Amount to guarantee"
												/>
											</FormControl>
											<FormDescription>
												Optional. Leave blank for unlimited guarantee.
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="comment"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Comment</FormLabel>
											<FormControl>
												<Textarea
													{...field}
													placeholder="Additional notes about this guarantor"
													rows={2}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{submitError && (
								<Alert variant="destructive">
									<AlertTitle>Error</AlertTitle>
									<AlertDescription>{submitError}</AlertDescription>
								</Alert>
							)}

							<SheetFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Adding..." : "Add Guarantor"}
								</Button>
							</SheetFooter>
						</form>
					</Form>
				)}
			</SheetContent>
		</Sheet>
	);
}
