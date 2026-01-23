"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	ClientAddressRequest,
	GetClientsPageItemsResponse,
	GetClientsResponse,
	GetCodeValuesDataResponse,
	OfficeData,
	PostClientsRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

const DOCUMENT_TYPE_MATCHES = {
	nationalId: [
		"national id",
		"national identity",
		"national identification",
		"nid",
		"nin",
	],
	passport: ["passport"],
	taxId: ["tax id", "tax", "tin"],
	businessLicense: [
		"business license",
		"business licence",
		"license",
		"licence",
	],
	registration: ["registration", "incorporation", "company registration"],
};

type LookupOption = GetCodeValuesDataResponse & {
	isDefault?: boolean;
	value?: string;
};
type ClientKind = "individual" | "business";

type ClientNonPersonDetails = {
	mainBusinessLineId?: number;
};

type AddressOptions = {
	addressTypeIdOptions?: LookupOption[];
	countryIdOptions?: LookupOption[];
	stateProvinceIdOptions?: LookupOption[];
};

type ClientTemplateResponse = {
	isAddressEnabled?: boolean;
	address?: AddressOptions;
	addressOptions?: AddressOptions;
	clientClassificationOptions?: LookupOption[];
	clientLegalFormOptions?: LookupOption[];
	clientNonPersonMainBusinessLineOptions?: LookupOption[];
	clientTypeOptions?: LookupOption[];
	genderOptions?: LookupOption[];
	officeOptions?: OfficeData[];
};

type ClientIdentifierTemplate = {
	allowedDocumentTypes?: LookupOption[];
};

type ClientFormData = {
	clientKind: ClientKind;
	firstname: string;
	middlename?: string;
	lastname: string;
	fullname: string;
	officeId?: number;
	genderId?: number;
	clientTypeId?: number;
	clientClassificationId?: number;
	legalFormId?: number;
	businessTypeId?: number;
	mobileNo?: string;
	emailAddress?: string;
	externalId?: string;
	active?: boolean;
	activationDate?: string;
	dateOfBirth?: string;
	addressLine1?: string;
	city?: string;
	countryId?: number;
	nationalId?: string;
	passportNo?: string;
	taxId?: string;
	businessLicenseNo?: string;
	registrationNo?: string;
};

type ClientCreatePayload = PostClientsRequest & {
	genderId?: number;
	clientTypeId?: number;
	clientClassificationId?: number;
	legalFormId?: number;
	clientNonPersonDetails?: ClientNonPersonDetails;
};

type IdentifierInput = {
	label: string;
	value: string;
	matches: string[];
};

type ClientSubmission = {
	payload: ClientCreatePayload;
	identifiers: IdentifierInput[];
};

function getDefaultOptionId(
	options: LookupOption[],
	{ fallbackToFirst = false }: { fallbackToFirst?: boolean } = {},
) {
	const defaultOption = options.find((option) => option.isDefault);
	if (defaultOption?.id) return defaultOption.id;
	return fallbackToFirst ? options[0]?.id : undefined;
}

function formatDateForFineract(value?: string) {
	if (!value) return undefined;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return undefined;
	return new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	}).format(parsed);
}

function resolveDocumentTypeId(options: LookupOption[], matches: string[]) {
	const normalizedMatches = matches.map((match) => match.toLowerCase());
	const match = options.find((option) => {
		const name = (option.name || option.value || "").toLowerCase();
		return normalizedMatches.some((value) => name.includes(value));
	});
	return match?.id;
}

function LookupSkeleton() {
	return (
		<div className="space-y-4 animate-pulse">
			<div className="space-y-2">
				<div className="h-4 w-24 rounded bg-muted" />
				<div className="h-9 w-full rounded bg-muted" />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<div className="h-4 w-28 rounded bg-muted" />
					<div className="h-9 w-full rounded bg-muted" />
				</div>
				<div className="space-y-2">
					<div className="h-4 w-24 rounded bg-muted" />
					<div className="h-9 w-full rounded bg-muted" />
				</div>
			</div>
			<div className="space-y-2">
				<div className="h-4 w-32 rounded bg-muted" />
				<div className="h-9 w-full rounded bg-muted" />
			</div>
		</div>
	);
}

async function fetchClients(tenantId: string): Promise<GetClientsResponse> {
	const response = await fetch(BFF_ROUTES.clients, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch clients");
	}

	return response.json();
}

async function fetchClientTemplate(
	tenantId: string,
): Promise<ClientTemplateResponse> {
	const response = await fetch(BFF_ROUTES.clientsTemplate, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch client template");
	}

	return response.json();
}

async function fetchClientIdentifierTemplate(
	tenantId: string,
	clientId: number,
): Promise<ClientIdentifierTemplate> {
	const response = await fetch(
		`/api/fineract/clients/${clientId}/identifiers/template`,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw new Error("Failed to fetch identifier template");
	}

	return response.json();
}

async function createClientIdentifier(
	tenantId: string,
	clientId: number,
	payload: { documentTypeId: number; documentKey: string },
) {
	const response = await fetch(
		`/api/fineract/clients/${clientId}/identifiers`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		},
	);

	if (!response.ok) {
		const data = await response.json();
		throw new Error(data.message || "Failed to create client identifier");
	}

	return response.json();
}

async function createClient(tenantId: string, payload: ClientCreatePayload) {
	const response = await fetch(BFF_ROUTES.clients, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || "Failed to create client");
	}

	return data;
}

export default function ClientsPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const clientsQuery = useQuery({
		queryKey: ["clients", tenantId],
		queryFn: () => fetchClients(tenantId),
	});

	const templateQuery = useQuery({
		queryKey: ["clients-template", tenantId],
		queryFn: () => fetchClientTemplate(tenantId),
		enabled: isDrawerOpen,
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const createMutation = useMutation({
		mutationFn: async ({ payload, identifiers }: ClientSubmission) => {
			const result = await createClient(tenantId, payload);
			const clientId = result.clientId ?? result.resourceId;

			if (!clientId) {
				throw new Error("Client creation response missing clientId");
			}

			if (!identifiers.length) return result;

			const identifierTemplate = await fetchClientIdentifierTemplate(
				tenantId,
				clientId,
			);
			const allowedDocumentTypes = (identifierTemplate.allowedDocumentTypes ||
				[]) as LookupOption[];

			const identifierPayloads = identifiers.map((identifier) => {
				const documentTypeId = resolveDocumentTypeId(
					allowedDocumentTypes,
					identifier.matches,
				);
				if (!documentTypeId) {
					throw new Error(
						`Missing document type for ${identifier.label}. Configure identifier types in System Settings.`,
					);
				}
				return {
					documentTypeId,
					documentKey: identifier.value,
				};
			});

			await Promise.all(
				identifierPayloads.map((identifier) =>
					createClientIdentifier(tenantId, clientId, identifier),
				),
			);

			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients", tenantId] });
			setIsDrawerOpen(false);
			setToastMessage("Client created successfully");
		},
	});

	const {
		register,
		handleSubmit,
		control,
		reset,
		setValue,
		getValues,
		setError,
		clearErrors,
		watch,
		formState: { errors },
	} = useForm<ClientFormData>({
		defaultValues: {
			clientKind: "individual",
			fullname: "",
			firstname: "",
			middlename: "",
			lastname: "",
			active: false,
			activationDate: "",
			dateOfBirth: "",
			addressLine1: "",
			city: "",
			nationalId: "",
			passportNo: "",
			taxId: "",
			businessLicenseNo: "",
			registrationNo: "",
		},
	});

	const clientTemplate = templateQuery.data;
	const addressOptions =
		clientTemplate?.addressOptions || clientTemplate?.address || {};

	const genderOptions = useMemo(
		() => (clientTemplate?.genderOptions || []) as LookupOption[],
		[clientTemplate?.genderOptions],
	);
	const clientTypeOptions = useMemo(
		() => (clientTemplate?.clientTypeOptions || []) as LookupOption[],
		[clientTemplate?.clientTypeOptions],
	);
	const clientClassificationOptions = useMemo(
		() => (clientTemplate?.clientClassificationOptions || []) as LookupOption[],
		[clientTemplate?.clientClassificationOptions],
	);
	const legalFormOptions = useMemo(
		() => (clientTemplate?.clientLegalFormOptions || []) as LookupOption[],
		[clientTemplate?.clientLegalFormOptions],
	);
	const businessLineOptions = useMemo(
		() =>
			(clientTemplate?.clientNonPersonMainBusinessLineOptions ||
				[]) as LookupOption[],
		[clientTemplate?.clientNonPersonMainBusinessLineOptions],
	);
	const officeOptions = useMemo(
		() => (clientTemplate?.officeOptions || []) as OfficeData[],
		[clientTemplate?.officeOptions],
	);
	const countryOptions = useMemo(
		() => (addressOptions.countryIdOptions || []) as LookupOption[],
		[addressOptions.countryIdOptions],
	);

	const isLookupsLoading = isDrawerOpen && templateQuery.isLoading;

	const lookupErrors = [templateQuery.error].filter(Boolean) as Error[];

	const hasMissingOffice = !officeOptions.length;
	const isAddressEnabled = Boolean(clientTemplate?.isAddressEnabled);
	const clientKind = watch("clientKind");
	const isBusiness = clientKind === "business";
	const isActive = Boolean(watch("active"));
	const hasMissingCountry = isAddressEnabled && !countryOptions.length;
	const hasMissingBusinessType = isBusiness && !businessLineOptions.length;

	const disableSubmit =
		isLookupsLoading ||
		hasMissingOffice ||
		hasMissingCountry ||
		hasMissingBusinessType ||
		createMutation.isPending;

	const clients = clientsQuery.data?.pageItems || [];

	const clientColumns = [
		{
			header: "Client",
			cell: (client: GetClientsPageItemsResponse) => (
				<div>
					<div className="font-medium">
						{client.displayName || client.fullname || "—"}
					</div>
					<div className="text-xs text-muted-foreground">
						{client.accountNo || "No account"}
					</div>
				</div>
			),
		},
		{
			header: "Office",
			cell: (client: GetClientsPageItemsResponse) => (
				<span className={client.officeName ? "" : "text-muted-foreground"}>
					{client.officeName || "—"}
				</span>
			),
		},
		{
			header: "Status",
			cell: (client: GetClientsPageItemsResponse) => (
				<Badge variant={client.active ? "success" : "secondary"}>
					{client.active ? "Active" : "Pending"}
				</Badge>
			),
		},
	];

	useEffect(() => {
		if (!isDrawerOpen) return;
		reset({
			clientKind: "individual",
			fullname: "",
			firstname: "",
			middlename: "",
			lastname: "",
			officeId: undefined,
			genderId: undefined,
			clientTypeId: undefined,
			clientClassificationId: undefined,
			legalFormId: undefined,
			businessTypeId: undefined,
			mobileNo: "",
			emailAddress: "",
			externalId: "",
			active: false,
			activationDate: "",
			dateOfBirth: "",
			addressLine1: "",
			city: "",
			countryId: undefined,
			nationalId: "",
			passportNo: "",
			taxId: "",
			businessLicenseNo: "",
			registrationNo: "",
		});
	}, [isDrawerOpen, reset]);

	useEffect(() => {
		if (!genderOptions.length) return;
		const currentValue = getValues("genderId");
		const defaultId = getDefaultOptionId(genderOptions);
		if (!currentValue && defaultId) {
			setValue("genderId", defaultId, { shouldDirty: false });
		}
	}, [genderOptions, getValues, setValue]);

	useEffect(() => {
		if (!clientTypeOptions.length) return;
		const currentValue = getValues("clientTypeId");
		const defaultId = getDefaultOptionId(clientTypeOptions);
		if (!currentValue && defaultId) {
			setValue("clientTypeId", defaultId, { shouldDirty: false });
		}
	}, [clientTypeOptions, getValues, setValue]);

	useEffect(() => {
		if (!clientClassificationOptions.length) return;
		const currentValue = getValues("clientClassificationId");
		const defaultId = getDefaultOptionId(clientClassificationOptions);
		if (!currentValue && defaultId) {
			setValue("clientClassificationId", defaultId, { shouldDirty: false });
		}
	}, [clientClassificationOptions, getValues, setValue]);

	useEffect(() => {
		if (!legalFormOptions.length) return;
		const currentValue = getValues("legalFormId");
		const defaultId = getDefaultOptionId(legalFormOptions);
		if (!currentValue && defaultId) {
			setValue("legalFormId", defaultId, { shouldDirty: false });
		}
	}, [legalFormOptions, getValues, setValue]);

	useEffect(() => {
		if (!businessLineOptions.length || !isBusiness) return;
		const currentValue = getValues("businessTypeId");
		const defaultId = getDefaultOptionId(businessLineOptions, {
			fallbackToFirst: true,
		});
		if (!currentValue && defaultId) {
			setValue("businessTypeId", defaultId, { shouldDirty: false });
		}
	}, [businessLineOptions, getValues, isBusiness, setValue]);

	useEffect(() => {
		if (!countryOptions.length) return;
		const currentValue = getValues("countryId");
		const defaultId = getDefaultOptionId(countryOptions, {
			fallbackToFirst: true,
		});
		if (!currentValue && defaultId) {
			setValue("countryId", defaultId, { shouldDirty: false });
		}
	}, [countryOptions, getValues, setValue]);

	useEffect(() => {
		if (!officeOptions.length) return;
		const currentValue = getValues("officeId");
		if (!currentValue && officeOptions.length === 1 && officeOptions[0]?.id) {
			setValue("officeId", officeOptions[0].id, { shouldDirty: false });
		}
	}, [officeOptions, getValues, setValue]);

	useEffect(() => {
		if (!toastMessage) return;
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

	const handleRefreshLookups = async () => {
		await templateQuery.refetch();
	};

	const onSubmit = (data: ClientFormData) => {
		clearErrors();
		let hasError = false;

		if (!data.officeId) {
			setError("officeId", { message: "Office is required" });
			hasError = true;
		}

		if (isBusiness) {
			if (!data.fullname.trim()) {
				setError("fullname", { message: "Business name is required" });
				hasError = true;
			}
			if (!data.legalFormId) {
				setError("legalFormId", {
					message: "Legal form is required for businesses",
				});
				hasError = true;
			}
			if (!data.businessTypeId) {
				setError("businessTypeId", {
					message: "Business type is required",
				});
				hasError = true;
			}
			if (!data.businessLicenseNo?.trim()) {
				setError("businessLicenseNo", {
					message: "Business license number is required",
				});
				hasError = true;
			}
		} else {
			if (!data.firstname.trim()) {
				setError("firstname", { message: "First name is required" });
				hasError = true;
			}
			if (!data.lastname.trim()) {
				setError("lastname", { message: "Last name is required" });
				hasError = true;
			}
			if (!data.nationalId?.trim() && !data.passportNo?.trim()) {
				setError("nationalId", {
					message: "National ID or Passport number is required",
				});
				setError("passportNo", {
					message: "National ID or Passport number is required",
				});
				hasError = true;
			}
		}

		if (isAddressEnabled) {
			if (!data.city?.trim()) {
				setError("city", { message: "City is required" });
				hasError = true;
			}
			if (!data.countryId) {
				setError("countryId", { message: "Country is required" });
				hasError = true;
			}
		}

		if (isActive && !data.activationDate) {
			setError("activationDate", {
				message: "Activation date is required",
			});
			hasError = true;
		}

		if (hasError) return;

		const payload: ClientCreatePayload = {
			officeId: data.officeId,
			active: Boolean(data.active),
		};

		if (isBusiness) {
			payload.fullname = data.fullname.trim();
			payload.legalFormId = data.legalFormId;
			if (data.businessTypeId) {
				payload.clientNonPersonDetails = {
					mainBusinessLineId: data.businessTypeId,
				};
			}
		} else {
			payload.firstname = data.firstname.trim();
			payload.lastname = data.lastname.trim();
			if (data.middlename?.trim()) payload.middlename = data.middlename.trim();
			if (data.genderId) payload.genderId = data.genderId;
		}

		if (data.mobileNo) payload.mobileNo = data.mobileNo;
		if (data.emailAddress) payload.emailAddress = data.emailAddress;
		if (data.externalId) payload.externalId = data.externalId;
		if (data.clientTypeId) payload.clientTypeId = data.clientTypeId;
		if (data.clientClassificationId)
			payload.clientClassificationId = data.clientClassificationId;

		const activationDate = formatDateForFineract(data.activationDate);
		const dateOfBirth = formatDateForFineract(data.dateOfBirth);
		if (activationDate) payload.activationDate = activationDate;
		if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
		if (activationDate || dateOfBirth) {
			payload.dateFormat = "dd MMMM yyyy";
			payload.locale = "en";
		}

		if (isAddressEnabled) {
			const address: ClientAddressRequest = {
				addressLine1: data.addressLine1?.trim() || undefined,
				city: data.city?.trim() || undefined,
				countryId: data.countryId,
			};
			payload.address = [address];
		}

		const identifiers: IdentifierInput[] = [];

		if (!isBusiness) {
			if (data.nationalId?.trim()) {
				identifiers.push({
					label: "National ID",
					value: data.nationalId.trim(),
					matches: DOCUMENT_TYPE_MATCHES.nationalId,
				});
			}
			if (data.passportNo?.trim()) {
				identifiers.push({
					label: "Passport",
					value: data.passportNo.trim(),
					matches: DOCUMENT_TYPE_MATCHES.passport,
				});
			}
		}

		if (data.taxId?.trim()) {
			identifiers.push({
				label: "Tax ID",
				value: data.taxId.trim(),
				matches: DOCUMENT_TYPE_MATCHES.taxId,
			});
		}

		if (isBusiness && data.businessLicenseNo?.trim()) {
			identifiers.push({
				label: "Business License",
				value: data.businessLicenseNo.trim(),
				matches: DOCUMENT_TYPE_MATCHES.businessLicense,
			});
		}

		if (isBusiness && data.registrationNo?.trim()) {
			identifiers.push({
				label: "Registration Number",
				value: data.registrationNo.trim(),
				matches: DOCUMENT_TYPE_MATCHES.registration,
			});
		}

		createMutation.mutate({ payload, identifiers });
	};

	return (
		<>
			<PageShell
				title="Clients"
				subtitle="Onboard clients with preloaded system lookups"
				actions={
					<Button onClick={() => setIsDrawerOpen(true)}>New Client</Button>
				}
			>
				<Card>
					<CardHeader>
						<CardTitle>Client Directory</CardTitle>
						<CardDescription>Track active and pending clients.</CardDescription>
					</CardHeader>
					<CardContent>
						{clientsQuery.isLoading && (
							<div className="py-6 text-center text-muted-foreground">
								Loading clients...
							</div>
						)}
						{clientsQuery.error && (
							<div className="py-6 text-center text-destructive">
								Failed to load clients. Please try again.
							</div>
						)}
						{!clientsQuery.isLoading && !clientsQuery.error && (
							<DataTable
								data={clients}
								columns={clientColumns}
								getRowId={(client) =>
									client.id || client.accountNo || "client-row"
								}
								emptyMessage="No clients found."
								enableActions={true}
								getViewUrl={(client) =>
									`/config/operations/clients/${client.id}`
								}
							/>
						)}
					</CardContent>
				</Card>
			</PageShell>

			<Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-lg overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Client Onboarding</SheetTitle>
						<SheetDescription>
							Load system lookups before capturing new client details.
						</SheetDescription>
					</SheetHeader>
					<div className="flex justify-end mt-2 mb-4">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleRefreshLookups}
							disabled={isLookupsLoading}
						>
							Refresh Lookups
						</Button>
					</div>
					<div className="flex flex-col gap-4">
						{isLookupsLoading && <LookupSkeleton />}

						{!isLookupsLoading && lookupErrors.length > 0 && (
							<Alert variant="destructive">
								<AlertTitle>Lookup error</AlertTitle>
								<AlertDescription>
									{lookupErrors[0]?.message || "Failed to load lookup data."}
								</AlertDescription>
							</Alert>
						)}

						{!isLookupsLoading && lookupErrors.length === 0 && (
							<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="officeId">
										Office <span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="officeId"
										rules={{ required: "Office is required" }}
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined && field.value !== null
														? String(field.value)
														: undefined
												}
												onValueChange={(value) => field.onChange(Number(value))}
												disabled={hasMissingOffice}
											>
												<SelectTrigger id="officeId">
													<SelectValue placeholder="Select office" />
												</SelectTrigger>
												<SelectContent>
													{officeOptions.map((office) => (
														<SelectItem
															key={office.id}
															value={String(office.id)}
														>
															{office.nameDecorated || office.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									{errors.officeId && (
										<p className="text-sm text-destructive">
											{errors.officeId.message}
										</p>
									)}
									{hasMissingOffice && (
										<Alert variant="warning">
											<AlertTitle>No offices available</AlertTitle>
											<AlertDescription>
												Configure at least one office before onboarding clients.
											</AlertDescription>
										</Alert>
									)}
								</div>

								<div className="space-y-2">
									<Label htmlFor="clientKind">
										Client kind <span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="clientKind"
										rules={{ required: "Client kind is required" }}
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger id="clientKind">
													<SelectValue placeholder="Select client kind" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="individual">Individual</SelectItem>
													<SelectItem value="business">Business</SelectItem>
												</SelectContent>
											</Select>
										)}
									/>
									{errors.clientKind && (
										<p className="text-sm text-destructive">
											{errors.clientKind.message}
										</p>
									)}
								</div>

								{!isBusiness && (
									<>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="firstname">
													First name <span className="text-destructive">*</span>
												</Label>
												<Input
													id="firstname"
													{...register("firstname")}
													placeholder="Enter first name"
												/>
												{errors.firstname && (
													<p className="text-sm text-destructive">
														{errors.firstname.message}
													</p>
												)}
											</div>

											<div className="space-y-2">
												<Label htmlFor="lastname">
													Last name <span className="text-destructive">*</span>
												</Label>
												<Input
													id="lastname"
													{...register("lastname")}
													placeholder="Enter last name"
												/>
												{errors.lastname && (
													<p className="text-sm text-destructive">
														{errors.lastname.message}
													</p>
												)}
											</div>
										</div>

										<div className="space-y-2">
											<Label htmlFor="middlename">Middle name</Label>
											<Input
												id="middlename"
												{...register("middlename")}
												placeholder="Enter middle name"
											/>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="dateOfBirth">Date of birth</Label>
												<Input
													id="dateOfBirth"
													type="date"
													{...register("dateOfBirth")}
												/>
											</div>

											<div className="space-y-2">
												<Label htmlFor="genderId">Gender</Label>
												<Controller
													control={control}
													name="genderId"
													render={({ field }) => (
														<Select
															value={
																field.value !== undefined &&
																field.value !== null
																	? String(field.value)
																	: undefined
															}
															onValueChange={(value) =>
																field.onChange(Number(value))
															}
															disabled={!genderOptions.length}
														>
															<SelectTrigger id="genderId">
																<SelectValue placeholder="Select gender" />
															</SelectTrigger>
															<SelectContent>
																{genderOptions
																	.filter((option) => option.id)
																	.map((option) => (
																		<SelectItem
																			key={option.id}
																			value={String(option.id)}
																		>
																			{option.name || option.value || "Unnamed"}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													)}
												/>
												{!genderOptions.length && (
													<p className="text-xs text-muted-foreground">
														No gender options configured.
													</p>
												)}
											</div>
										</div>

										<div className="space-y-2">
											<Label htmlFor="nationalId">
												National ID <span className="text-destructive">*</span>
											</Label>
											<Input
												id="nationalId"
												{...register("nationalId")}
												placeholder="Enter national ID number"
											/>
											{errors.nationalId && (
												<p className="text-sm text-destructive">
													{errors.nationalId.message}
												</p>
											)}
										</div>

										<div className="space-y-2">
											<Label htmlFor="passportNo">
												Passport number{" "}
												<span className="text-destructive">*</span>
											</Label>
											<Input
												id="passportNo"
												{...register("passportNo")}
												placeholder="Enter passport number"
											/>
											{errors.passportNo && (
												<p className="text-sm text-destructive">
													{errors.passportNo.message}
												</p>
											)}
											<p className="text-xs text-muted-foreground">
												Provide national ID or passport to proceed.
											</p>
										</div>

										<div className="space-y-2">
											<Label htmlFor="taxId">Tax ID</Label>
											<Input
												id="taxId"
												{...register("taxId")}
												placeholder="Enter tax ID (optional)"
											/>
										</div>
									</>
								)}

								{isBusiness && (
									<>
										<div className="space-y-2">
											<Label htmlFor="fullname">
												Business name{" "}
												<span className="text-destructive">*</span>
											</Label>
											<Input
												id="fullname"
												{...register("fullname")}
												placeholder="Enter business name"
											/>
											{errors.fullname && (
												<p className="text-sm text-destructive">
													{errors.fullname.message}
												</p>
											)}
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="legalFormId">
													Legal form <span className="text-destructive">*</span>
												</Label>
												<Controller
													control={control}
													name="legalFormId"
													render={({ field }) => (
														<Select
															value={
																field.value !== undefined &&
																field.value !== null
																	? String(field.value)
																	: undefined
															}
															onValueChange={(value) =>
																field.onChange(Number(value))
															}
															disabled={!legalFormOptions.length}
														>
															<SelectTrigger id="legalFormId">
																<SelectValue placeholder="Select legal form" />
															</SelectTrigger>
															<SelectContent>
																{legalFormOptions
																	.filter((option) => option.id)
																	.map((option) => (
																		<SelectItem
																			key={option.id}
																			value={String(option.id)}
																		>
																			{option.name || option.value || "Unnamed"}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													)}
												/>
												{errors.legalFormId && (
													<p className="text-sm text-destructive">
														{errors.legalFormId.message}
													</p>
												)}
												{!legalFormOptions.length && (
													<p className="text-xs text-muted-foreground">
														No legal form options configured.
													</p>
												)}
											</div>

											<div className="space-y-2">
												<Label htmlFor="businessTypeId">
													Business type{" "}
													<span className="text-destructive">*</span>
												</Label>
												<Controller
													control={control}
													name="businessTypeId"
													render={({ field }) => (
														<Select
															value={
																field.value !== undefined &&
																field.value !== null
																	? String(field.value)
																	: undefined
															}
															onValueChange={(value) =>
																field.onChange(Number(value))
															}
															disabled={!businessLineOptions.length}
														>
															<SelectTrigger id="businessTypeId">
																<SelectValue placeholder="Select business type" />
															</SelectTrigger>
															<SelectContent>
																{businessLineOptions
																	.filter((option) => option.id)
																	.map((option) => (
																		<SelectItem
																			key={option.id}
																			value={String(option.id)}
																		>
																			{option.name || option.value || "Unnamed"}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													)}
												/>
												{errors.businessTypeId && (
													<p className="text-sm text-destructive">
														{errors.businessTypeId.message}
													</p>
												)}
												{!businessLineOptions.length && (
													<p className="text-xs text-muted-foreground">
														No business types configured.
													</p>
												)}
											</div>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="businessLicenseNo">
													Business license{" "}
													<span className="text-destructive">*</span>
												</Label>
												<Input
													id="businessLicenseNo"
													{...register("businessLicenseNo")}
													placeholder="Enter business license number"
												/>
												{errors.businessLicenseNo && (
													<p className="text-sm text-destructive">
														{errors.businessLicenseNo.message}
													</p>
												)}
											</div>

											<div className="space-y-2">
												<Label htmlFor="registrationNo">
													Registration number
												</Label>
												<Input
													id="registrationNo"
													{...register("registrationNo")}
													placeholder="Enter registration number (optional)"
												/>
											</div>
										</div>

										<div className="space-y-2">
											<Label htmlFor="taxId">Tax ID</Label>
											<Input
												id="taxId"
												{...register("taxId")}
												placeholder="Enter tax ID (optional)"
											/>
										</div>
									</>
								)}

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="mobileNo">Mobile number</Label>
										<Input
											id="mobileNo"
											{...register("mobileNo")}
											placeholder="Enter mobile number"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="emailAddress">Email address</Label>
										<Input
											id="emailAddress"
											type="email"
											{...register("emailAddress")}
											placeholder="Enter email address"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="externalId">External ID</Label>
										<Input
											id="externalId"
											{...register("externalId")}
											placeholder="Enter external reference"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="clientTypeId">Client type</Label>
										<Controller
											control={control}
											name="clientTypeId"
											render={({ field }) => (
												<Select
													value={
														field.value !== undefined && field.value !== null
															? String(field.value)
															: undefined
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
													disabled={!clientTypeOptions.length}
												>
													<SelectTrigger id="clientTypeId">
														<SelectValue placeholder="Select client type" />
													</SelectTrigger>
													<SelectContent>
														{clientTypeOptions
															.filter((option) => option.id)
															.map((option) => (
																<SelectItem
																	key={option.id}
																	value={String(option.id)}
																>
																	{option.name || option.value || "Unnamed"}
																</SelectItem>
															))}
													</SelectContent>
												</Select>
											)}
										/>
										{!clientTypeOptions.length && (
											<p className="text-xs text-muted-foreground">
												No client type options configured.
											</p>
										)}
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="clientClassificationId">
										Client classification
									</Label>
									<Controller
										control={control}
										name="clientClassificationId"
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined && field.value !== null
														? String(field.value)
														: undefined
												}
												onValueChange={(value) => field.onChange(Number(value))}
												disabled={!clientClassificationOptions.length}
											>
												<SelectTrigger id="clientClassificationId">
													<SelectValue placeholder="Select classification" />
												</SelectTrigger>
												<SelectContent>
													{clientClassificationOptions
														.filter((option) => option.id)
														.map((option) => (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{option.name || option.value || "Unnamed"}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										)}
									/>
									{!clientClassificationOptions.length && (
										<p className="text-xs text-muted-foreground">
											No classification options configured.
										</p>
									)}
								</div>

								{isAddressEnabled && (
									<>
										<div className="space-y-2">
											<Label htmlFor="addressLine1">Address line 1</Label>
											<Input
												id="addressLine1"
												{...register("addressLine1")}
												placeholder="Enter street address"
											/>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="city">
													City <span className="text-destructive">*</span>
												</Label>
												<Input
													id="city"
													{...register("city")}
													placeholder="Enter city"
												/>
												{errors.city && (
													<p className="text-sm text-destructive">
														{errors.city.message}
													</p>
												)}
											</div>

											<div className="space-y-2">
												<Label htmlFor="countryId">
													Country <span className="text-destructive">*</span>
												</Label>
												<Controller
													control={control}
													name="countryId"
													render={({ field }) => (
														<Select
															value={
																field.value !== undefined &&
																field.value !== null
																	? String(field.value)
																	: undefined
															}
															onValueChange={(value) =>
																field.onChange(Number(value))
															}
															disabled={!countryOptions.length}
														>
															<SelectTrigger id="countryId">
																<SelectValue placeholder="Select country" />
															</SelectTrigger>
															<SelectContent>
																{countryOptions
																	.filter((option) => option.id)
																	.map((option) => (
																		<SelectItem
																			key={option.id}
																			value={String(option.id)}
																		>
																			{option.name || option.value || "Unnamed"}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													)}
												/>
												{errors.countryId && (
													<p className="text-sm text-destructive">
														{errors.countryId.message}
													</p>
												)}
												{!countryOptions.length && (
													<p className="text-xs text-muted-foreground">
														No country options configured.
													</p>
												)}
											</div>
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
													onCheckedChange={(checked) =>
														field.onChange(Boolean(checked))
													}
												/>
											)}
										/>
										<Label htmlFor="active">Activate client now</Label>
									</div>
									{isActive && (
										<div className="space-y-2">
											<Label htmlFor="activationDate">
												Activation date{" "}
												<span className="text-destructive">*</span>
											</Label>
											<Input
												id="activationDate"
												type="date"
												{...register("activationDate")}
											/>
											{errors.activationDate && (
												<p className="text-sm text-destructive">
													{errors.activationDate.message}
												</p>
											)}
										</div>
									)}
								</div>

								{createMutation.isError && (
									<Alert variant="destructive">
										<AlertTitle>Submission failed</AlertTitle>
										<AlertDescription>
											{(createMutation.error as Error)?.message ||
												"Failed to create client. Please try again."}
										</AlertDescription>
									</Alert>
								)}

								{(hasMissingBusinessType || hasMissingCountry) && (
									<Alert variant="warning">
										<AlertTitle>Missing system configuration</AlertTitle>
										<AlertDescription>
											Configure required lookup values (business types or
											countries) before onboarding clients.
										</AlertDescription>
									</Alert>
								)}

								<div className="flex items-center justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsDrawerOpen(false)}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={disableSubmit}>
										{createMutation.isPending ? "Submitting..." : "Submit"}
									</Button>
								</div>
							</form>
						)}
					</div>
				</SheetContent>
			</Sheet>

			{toastMessage && (
				<div className="fixed bottom-6 right-6 z-50 w-[280px]">
					<Alert variant="success">
						<AlertTitle>Success</AlertTitle>
						<AlertDescription>{toastMessage}</AlertDescription>
					</Alert>
				</div>
			)}
		</>
	);
}
