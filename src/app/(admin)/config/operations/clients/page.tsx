"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format as formatDate, parse as parseDate } from "date-fns";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ClientRegistrationWizard } from "@/components/clients/ClientRegistrationWizard";
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
import { DataTable } from "@/components/ui/data-table";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatDateStringToFormat } from "@/lib/date-utils";
import {
	createClient,
	createClientIdentifier,
	type FineractRequestError,
	fetchClientIdentifierTemplate,
	fetchClients,
	fetchClientTemplate,
} from "@/lib/fineract/client";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	AddressData,
	ClientAddressRequest,
	ClientDataWritable,
	GetClientsClientIdIdentifiersResponse,
	GetClientsPageItemsResponse,
	GetCodeValuesDataResponse,
	OfficeData,
	PostClientsRequest,
} from "@/lib/fineract/generated/types.gen";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import type { ClientFormData } from "@/lib/schemas/client";
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

type ClientNonPersonDetails = {
	mainBusinessLineId?: number;
};

type ClientCreatePayload = PostClientsRequest & {
	genderId?: number;
	clientTypeId?: number;
	clientClassificationId?: number;
	legalFormId?: number;
	savingsProductId?: number;
	staffId?: number;
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

type UpdateClientSubmission = ClientSubmission & {
	clientId: number;
	address?: ClientAddressRequest;
	existingIdentifiers: GetClientsClientIdIdentifiersResponse[];
	existingAddresses: AddressData[];
	addressTypeId?: number;
};

type ClientValidationStep = 1 | 2 | 3 | 4;

function getDefaultOptionId(
	options: LookupOption[],
	{ fallbackToFirst = false }: { fallbackToFirst?: boolean } = {},
) {
	const defaultOption = options.find((option) => option.isDefault);
	if (defaultOption?.id) return defaultOption.id;
	return fallbackToFirst ? options[0]?.id : undefined;
}

function findOptionIdByKeywords(options: LookupOption[], keywords: string[]) {
	const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());
	const match = options.find((option) => {
		const label = (option.name || option.value || "").toLowerCase();
		return normalizedKeywords.some((keyword) => label.includes(keyword));
	});

	return match?.id;
}

function resolveDocumentTypeId(options: LookupOption[], matches: string[]) {
	const normalizedMatches = matches.map((match) => match.toLowerCase());
	const match = options.find((option) => {
		const name = (option.name || option.value || "").toLowerCase();
		return normalizedMatches.some((value) => name.includes(value));
	});
	if (match?.id) return match.id;

	// Some installations expose generic labels like "Id" instead of "National ID".
	if (normalizedMatches.some((value) => ["nid", "nin"].includes(value))) {
		const genericIdMatch = options.find((option) => {
			const name = (option.name || option.value || "").trim().toLowerCase();
			return name === "id" || name === "identity id";
		});
		return genericIdMatch?.id;
	}

	return undefined;
}

function LookupSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Skeleton className="h-5 w-44" />
				</CardTitle>
				<CardDescription>
					<Skeleton className="h-4 w-56" />
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-10 w-full" />
				</div>
			</CardContent>
		</Card>
	);
}

function flattenErrorDetails(details?: Record<string, string[]>) {
	if (!details) return [];

	return Object.entries(details)
		.flatMap(([field, messages]) =>
			(messages || []).map((message) => `${field}: ${message}`),
		)
		.filter(Boolean);
}

function isFineractRequestError(error: unknown): error is FineractRequestError {
	if (!error || typeof error !== "object") {
		return false;
	}

	const candidate = error as Partial<FineractRequestError>;
	return (
		typeof candidate.code === "string" &&
		typeof candidate.message === "string" &&
		typeof candidate.action === "string" &&
		typeof candidate.endpoint === "string" &&
		typeof candidate.method === "string" &&
		typeof candidate.timestamp === "string"
	);
}

function normalizeClientSubmissionError({
	error,
	isEditMode,
	editClientId,
	tenantId,
}: {
	error: unknown;
	isEditMode: boolean;
	editClientId: number | null;
	tenantId: string;
}): FineractRequestError {
	if (isFineractRequestError(error)) {
		return error;
	}

	return {
		code: "UNKNOWN_ERROR",
		message: error instanceof Error ? error.message : "Failed to submit client",
		action: isEditMode ? "updateClient" : "createClient",
		endpoint:
			isEditMode && editClientId !== null
				? `${BFF_ROUTES.clients}/${editClientId}`
				: BFF_ROUTES.clients,
		method: isEditMode ? "PUT" : "POST",
		timestamp: new Date().toISOString(),
		tenantId,
	};
}

function toInputDate(value?: string): string {
	if (!value) {
		return "";
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return value;
	}

	try {
		const parsed = parseDate(value, "dd MMMM yyyy", new Date());
		if (Number.isNaN(parsed.getTime())) {
			return "";
		}
		return formatDate(parsed, "yyyy-MM-dd");
	} catch {
		return "";
	}
}

function includesMatch(value: string | undefined, matches: string[]) {
	const normalized = (value || "").toLowerCase();
	return matches.some((match) => normalized.includes(match.toLowerCase()));
}

function findIdentifierValueByMatches(
	identifiers: GetClientsClientIdIdentifiersResponse[],
	matches: string[],
) {
	const found = identifiers.find((identifier) => {
		return (
			includesMatch(identifier.documentType?.name, matches) ||
			includesMatch(identifier.description, matches)
		);
	});

	return found?.documentKey || "";
}

function getClientKindFromDetail(
	client: ClientDataWritable,
): "individual" | "business" {
	const legalFormText = (
		client.legalForm?.value ||
		client.legalForm?.code ||
		""
	).toLowerCase();

	if (legalFormText.includes("entity") || legalFormText.includes("business")) {
		return "business";
	}

	if (client.fullname && !client.firstname && !client.lastname) {
		return "business";
	}

	return "individual";
}

async function fetchClientById(tenantId: string, clientId: number) {
	const response = await fetch(
		`${BFF_ROUTES.clients}/${clientId}?template=true`,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw new Error("Failed to fetch client details");
	}

	return response.json() as Promise<ClientDataWritable>;
}

async function fetchClientIdentifiers(
	tenantId: string,
	clientId: number,
): Promise<GetClientsClientIdIdentifiersResponse[]> {
	const response = await fetch(BFF_ROUTES.clientIdentifiers(clientId), {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch client identifiers");
	}

	return response.json();
}

async function fetchClientAddresses(tenantId: string, clientId: number) {
	const response = await fetch(BFF_ROUTES.clientAddresses(clientId), {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch client addresses");
	}

	return response.json() as Promise<AddressData[]>;
}

async function updateClient(
	tenantId: string,
	clientId: number,
	payload: Record<string, unknown>,
) {
	const response = await fetch(`${BFF_ROUTES.clients}/${clientId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	const data = (await response.json()) as Record<string, unknown>;
	if (!response.ok) {
		throw toSubmitActionError(
			{
				...data,
				statusCode: response.status,
				httpStatusCode: response.status,
				statusText: response.statusText,
				message:
					typeof data.message === "string"
						? data.message
						: "Failed to update client",
			},
			{
				action: "updateClient",
				endpoint: `${BFF_ROUTES.clients}/${clientId}`,
				method: "PUT",
				tenantId,
			},
		);
	}

	return data;
}

async function createClientAddress(
	tenantId: string,
	clientId: number,
	payload: ClientAddressRequest,
) {
	const response = await fetch(BFF_ROUTES.clientAddresses(clientId), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function updateClientAddress(
	tenantId: string,
	clientId: number,
	payload: ClientAddressRequest,
) {
	const response = await fetch(BFF_ROUTES.clientAddresses(clientId), {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function updateClientIdentifier(
	tenantId: string,
	clientId: number,
	identifierId: number,
	payload: {
		documentTypeId: number;
		documentKey: string;
		status?: string;
		description?: string;
	},
) {
	const response = await fetch(
		BFF_ROUTES.clientIdentifierById(clientId, identifierId),
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		},
	);

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

function ClientTableSkeleton() {
	return (
		<div className="space-y-2">
			<Card className="rounded-sm border border-border/60">
				<Table>
					<TableHeader className="bg-muted/40">
						<TableRow className="border-b border-border/60">
							<TableHead className="px-3 py-2">
								<Skeleton className="h-4 w-20" />
							</TableHead>
							<TableHead className="px-3 py-2">
								<Skeleton className="h-4 w-16" />
							</TableHead>
							<TableHead className="px-3 py-2">
								<Skeleton className="h-4 w-16" />
							</TableHead>
							<TableHead className="px-3 py-2 text-right">
								<Skeleton className="h-4 w-14" />
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className="divide-y divide-border/60">
						{Array.from({ length: 8 }).map((_, index) => (
							<TableRow key={`client-row-skeleton-${index}`}>
								<TableCell className="px-3 py-2">
									<div className="space-y-1">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-20" />
									</div>
								</TableCell>
								<TableCell className="px-3 py-2">
									<Skeleton className="h-4 w-24" />
								</TableCell>
								<TableCell className="px-3 py-2">
									<Skeleton className="h-6 w-16" />
								</TableCell>
								<TableCell className="px-3 py-2 text-right">
									<Skeleton className="ml-auto h-8 w-14" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

export default function ClientsPage() {
	const { tenantId } = useTenantStore();
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const editClientIdParam = searchParams.get("editClientId");
	const editClientId = editClientIdParam ? Number(editClientIdParam) : null;
	const isEditMode = editClientId !== null && !Number.isNaN(editClientId);

	const clearEditClientQueryParam = () => {
		if (!isEditMode) {
			return;
		}

		const params = new URLSearchParams(searchParams.toString());
		params.delete("editClientId");
		const query = params.toString();
		router.replace(
			query
				? `/config/operations/clients?${query}`
				: "/config/operations/clients",
			{ scroll: false },
		);
	};

	const closeDrawer = () => {
		setIsDrawerOpen(false);
		clearEditClientQueryParam();
	};

	const openCreateDrawer = () => {
		clearEditClientQueryParam();
		setIsDrawerOpen(true);
	};

	const handleDrawerOpenChange = (open: boolean) => {
		if (open) {
			setIsDrawerOpen(true);
			return;
		}

		closeDrawer();
	};

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

	const editClientQuery = useQuery({
		queryKey: ["client-edit", tenantId, editClientId],
		queryFn: () => fetchClientById(tenantId, editClientId as number),
		enabled: isDrawerOpen && isEditMode,
		staleTime: DEFAULT_STALE_TIME,
	});

	const editIdentifiersQuery = useQuery({
		queryKey: ["client-edit-identifiers", tenantId, editClientId],
		queryFn: () => fetchClientIdentifiers(tenantId, editClientId as number),
		enabled: isDrawerOpen && isEditMode,
		staleTime: DEFAULT_STALE_TIME,
	});

	const editAddressesQuery = useQuery({
		queryKey: ["client-edit-addresses", tenantId, editClientId],
		queryFn: () => fetchClientAddresses(tenantId, editClientId as number),
		enabled: isDrawerOpen && isEditMode,
		staleTime: DEFAULT_STALE_TIME,
	});

	const createMutation = useMutation({
		mutationFn: async ({ payload, identifiers }: ClientSubmission) => {
			const result = await createClient(tenantId, payload);
			const clientId = result.clientId ?? result.resourceId;

			if (!clientId) {
				throw toSubmitActionError(
					{
						code: "CLIENT_ID_MISSING",
						message: "Client creation response missing clientId",
					},
					{
						action: "createClient",
						endpoint: BFF_ROUTES.clients,
						method: "POST",
						tenantId,
					},
				);
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
					throw toSubmitActionError(
						{
							code: "IDENTIFIER_DOCUMENT_TYPE_MISSING",
							message: `Missing document type for ${identifier.label}. Configure identifier types in System Settings.`,
							details: {
								identifier: [identifier.label],
							},
						},
						{
							action: "createClientIdentifier",
							endpoint: BFF_ROUTES.clientIdentifiers(clientId),
							method: "POST",
							tenantId,
						},
					);
				}
				return {
					documentTypeId,
					documentKey: identifier.value,
					status: "Active",
					description: `${identifier.label} captured during onboarding`,
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
			closeDrawer();
			setToastMessage("Client created successfully");
		},
	});
	const updateMutation = useMutation({
		mutationFn: async ({
			clientId,
			payload,
			identifiers,
			address,
			existingIdentifiers,
			existingAddresses,
			addressTypeId,
		}: UpdateClientSubmission) => {
			await updateClient(
				tenantId,
				clientId,
				payload as Record<string, unknown>,
			);

			if (address) {
				const existingAddress = existingAddresses[0];
				if (existingAddress?.addressId) {
					await updateClientAddress(tenantId, clientId, {
						addressId: existingAddress.addressId,
						addressTypeId:
							existingAddress.addressTypeId || address.addressTypeId,
						addressLine1: address.addressLine1,
						city: address.city,
						countryId: address.countryId,
						isActive: true,
					});
				} else {
					await createClientAddress(tenantId, clientId, {
						addressTypeId: address.addressTypeId || addressTypeId,
						addressLine1: address.addressLine1,
						city: address.city,
						countryId: address.countryId,
						isActive: true,
					});
				}
			}

			const identifierTemplate = await fetchClientIdentifierTemplate(
				tenantId,
				clientId,
			);
			const allowedDocumentTypes = (identifierTemplate.allowedDocumentTypes ||
				[]) as LookupOption[];

			for (const identifier of identifiers) {
				const documentTypeId = resolveDocumentTypeId(
					allowedDocumentTypes,
					identifier.matches,
				);
				if (!documentTypeId) {
					continue;
				}

				const existingIdentifier = existingIdentifiers.find(
					(item) => item.documentType?.id === documentTypeId,
				);

				const identifierPayload = {
					documentTypeId,
					documentKey: identifier.value,
					status: "Active",
					description: `${identifier.label} captured during onboarding`,
				};

				if (existingIdentifier?.id) {
					await updateClientIdentifier(
						tenantId,
						clientId,
						existingIdentifier.id,
						identifierPayload,
					);
				} else {
					await createClientIdentifier(tenantId, clientId, identifierPayload);
				}
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients", tenantId] });
			if (editClientId !== null) {
				queryClient.invalidateQueries({
					queryKey: ["client", tenantId, String(editClientId)],
				});
			}
			closeDrawer();
			setToastMessage("Client updated successfully");
		},
	});
	const resetCreateMutation = createMutation.reset;
	const resetUpdateMutation = updateMutation.reset;

	const {
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
	const addressOptions = Array.isArray(clientTemplate?.address)
		? (clientTemplate.address[0] ?? {})
		: clientTemplate?.addressOptions || clientTemplate?.address || {};

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
	const staffOptions = useMemo(
		() =>
			(clientTemplate?.staffOptions || []) as Array<{
				id: number;
				displayName: string;
			}>,
		[clientTemplate?.staffOptions],
	);
	const savingProductOptions = useMemo(
		() => (clientTemplate?.savingProductOptions || []) as LookupOption[],
		[clientTemplate?.savingProductOptions],
	);
	const countryOptions = useMemo(
		() => (addressOptions.countryIdOptions || []) as LookupOption[],
		[addressOptions.countryIdOptions],
	);
	const addressTypeOptions = useMemo(
		() => (addressOptions.addressTypeIdOptions || []) as LookupOption[],
		[addressOptions.addressTypeIdOptions],
	);

	const isEditLoading =
		isDrawerOpen &&
		isEditMode &&
		(editClientQuery.isLoading ||
			editIdentifiersQuery.isLoading ||
			editAddressesQuery.isLoading);
	const isLookupsLoading =
		isDrawerOpen && (templateQuery.isLoading || isEditLoading);

	const lookupErrors = [
		templateQuery.error,
		isEditMode ? editClientQuery.error : null,
		isEditMode ? editIdentifiersQuery.error : null,
		isEditMode ? editAddressesQuery.error : null,
	].filter(Boolean) as Error[];

	const clientKind = watch("clientKind");
	const isBusiness = clientKind === "business";
	const hasMissingCountry = !countryOptions.length;
	const hasMissingBusinessType = isBusiness && !businessLineOptions.length;
	const activeMutationError = isEditMode
		? updateMutation.error
		: createMutation.error;
	const isMutationError = isEditMode
		? updateMutation.isError
		: createMutation.isError;
	const submissionError = isMutationError
		? normalizeClientSubmissionError({
				error: activeMutationError,
				isEditMode,
				editClientId,
				tenantId,
			})
		: null;
	const submissionErrorDetails = flattenErrorDetails(submissionError?.details);

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
		if (isEditMode) {
			setIsDrawerOpen(true);
		}
	}, [isEditMode]);

	useEffect(() => {
		if (!isDrawerOpen) return;
		resetCreateMutation();
		resetUpdateMutation();
		if (isEditMode) return;
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
	}, [
		isDrawerOpen,
		isEditMode,
		reset,
		resetCreateMutation,
		resetUpdateMutation,
	]);

	useEffect(() => {
		if (!isDrawerOpen || !isEditMode) return;
		if (!editClientQuery.data || !templateQuery.data) return;

		const clientData = editClientQuery.data;
		const identifierData = editIdentifiersQuery.data || [];
		const addressData = editAddressesQuery.data || [];
		const primaryAddress =
			addressData.find((address) => address.isActive !== false) ||
			addressData[0];
		const clientKindValue = getClientKindFromDetail(clientData);
		const clientNonPersonDetails = (clientData.clientNonPersonDetails ||
			{}) as Record<string, unknown>;
		const mainBusinessLineId = (
			clientNonPersonDetails.mainBusinessLine as { id?: number } | undefined
		)?.id;

		reset({
			clientKind: clientKindValue,
			fullname: clientData.fullname || clientData.displayName || "",
			firstname: clientData.firstname || "",
			middlename: clientData.middlename || "",
			lastname: clientData.lastname || "",
			officeId: clientData.officeId,
			genderId: clientData.genderId,
			clientTypeId: clientData.clientTypeId,
			clientClassificationId: clientData.clientClassificationId,
			legalFormId: clientData.legalFormId,
			businessTypeId: mainBusinessLineId,
			mobileNo: clientData.mobileNo || "",
			emailAddress: clientData.emailAddress || "",
			externalId:
				typeof clientData.externalId === "string"
					? clientData.externalId
					: (clientData.externalId?.value ?? ""),
			active: Boolean(clientData.active),
			activationDate: toInputDate(clientData.activationDate),
			dateOfBirth: toInputDate(clientData.dateOfBirth),
			addressLine1: primaryAddress?.addressLine1 || "",
			city: primaryAddress?.city || primaryAddress?.townVillage || "",
			countryId: primaryAddress?.countryId,
			nationalId: findIdentifierValueByMatches(
				identifierData,
				DOCUMENT_TYPE_MATCHES.nationalId,
			),
			passportNo: findIdentifierValueByMatches(
				identifierData,
				DOCUMENT_TYPE_MATCHES.passport,
			),
			taxId: findIdentifierValueByMatches(
				identifierData,
				DOCUMENT_TYPE_MATCHES.taxId,
			),
			businessLicenseNo: findIdentifierValueByMatches(
				identifierData,
				DOCUMENT_TYPE_MATCHES.businessLicense,
			),
			registrationNo: findIdentifierValueByMatches(
				identifierData,
				DOCUMENT_TYPE_MATCHES.registration,
			),
			savingsProductId: clientData.savingsProductId,
			staffId: clientData.staffId,
		});
	}, [
		isDrawerOpen,
		isEditMode,
		editClientQuery.data,
		editIdentifiersQuery.data,
		editAddressesQuery.data,
		templateQuery.data,
		reset,
	]);

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
		const personId = findOptionIdByKeywords(legalFormOptions, ["person"]);
		const entityId = findOptionIdByKeywords(legalFormOptions, ["entity"]);
		const fallbackId = getDefaultOptionId(legalFormOptions, {
			fallbackToFirst: true,
		});
		const preferredId = isBusiness
			? entityId || fallbackId
			: personId || fallbackId;

		if (!preferredId) return;

		if (
			!currentValue ||
			(isBusiness && personId && currentValue === personId) ||
			(!isBusiness && entityId && currentValue === entityId)
		) {
			setValue("legalFormId", preferredId, { shouldDirty: false });
		}
	}, [isBusiness, legalFormOptions, getValues, setValue]);

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

	const validateClientData = (
		data: ClientFormData,
		uptoStep: ClientValidationStep = 4,
	): ClientValidationStep | null => {
		clearErrors();
		let firstInvalidStep: ClientValidationStep | null = null;
		const isBusinessClient = data.clientKind === "business";

		const pushError = (
			step: ClientValidationStep,
			field: keyof ClientFormData,
			message: string,
		) => {
			setError(field, { message });
			if (!firstInvalidStep || step < firstInvalidStep) {
				firstInvalidStep = step;
			}
		};

		if (uptoStep >= 1) {
			if (!data.officeId) {
				pushError(1, "officeId", "Office is required.");
			}
			if (!data.legalFormId) {
				pushError(1, "legalFormId", "Legal form is required.");
			}
			if (!data.clientKind) {
				pushError(1, "clientKind", "Client kind is required.");
			}
			if (isBusinessClient && !businessLineOptions.length) {
				pushError(
					1,
					"clientKind",
					"Business onboarding is unavailable until business types are configured.",
				);
			}
		}

		if (uptoStep >= 2) {
			if (isBusinessClient) {
				if (!data.fullname.trim()) {
					pushError(2, "fullname", "Business name is required.");
				}
				if (!data.businessTypeId) {
					pushError(2, "businessTypeId", "Business type is required.");
				}
			} else {
				if (!data.firstname.trim()) {
					pushError(2, "firstname", "First name is required.");
				}
				if (!data.lastname.trim()) {
					pushError(2, "lastname", "Last name is required.");
				}
			}
		}

		if (uptoStep >= 3) {
			if (!isBusinessClient) {
				const hasNationalId = Boolean(data.nationalId?.trim());
				const hasPassportNo = Boolean(data.passportNo?.trim());

				if (!hasNationalId && !hasPassportNo) {
					pushError(
						3,
						"nationalId",
						"Provide either National ID or Passport number.",
					);
					pushError(
						3,
						"passportNo",
						"Provide either National ID or Passport number.",
					);
				}

				if (hasNationalId && hasPassportNo) {
					pushError(
						3,
						"nationalId",
						"Provide only one identifier: National ID or Passport number, not both.",
					);
					pushError(
						3,
						"passportNo",
						"Provide only one identifier: National ID or Passport number, not both.",
					);
				}
			}
			if (isBusinessClient && !data.businessLicenseNo?.trim()) {
				pushError(
					3,
					"businessLicenseNo",
					"Business license number is required.",
				);
			}
		}

		if (uptoStep >= 4) {
			if (!countryOptions.length) {
				pushError(
					4,
					"countryId",
					"Country lookup values are missing. Configure countries first.",
				);
			}
			if (!data.city?.trim()) {
				pushError(4, "city", "City is required.");
			}
			if (!data.countryId) {
				pushError(4, "countryId", "Country is required.");
			}

			if (Boolean(data.active) && !data.activationDate) {
				pushError(4, "activationDate", "Activation date is required.");
			}
		}

		return firstInvalidStep;
	};

	const handleStepValidation = (step: number) => {
		const currentStep = Math.min(4, Math.max(1, step)) as ClientValidationStep;
		const invalidStep = validateClientData(getValues(), currentStep);
		return invalidStep === null;
	};

	const handleClientSubmit = () => {
		createMutation.reset();
		updateMutation.reset();
		const data = getValues();
		const invalidStep = validateClientData(data, 4);

		if (invalidStep) {
			return invalidStep;
		}

		const isBusinessClient = data.clientKind === "business";

		const payload: ClientCreatePayload = {
			active: Boolean(data.active),
			legalFormId: data.legalFormId,
			locale: "en",
		};

		if (!isEditMode) {
			payload.officeId = data.officeId;
		}

		if (isBusinessClient) {
			payload.fullname = data.fullname.trim();
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
		if (data.savingsProductId) payload.savingsProductId = data.savingsProductId;
		if (data.staffId) payload.staffId = data.staffId;

		const activationDate = data.activationDate
			? formatDateStringToFormat(data.activationDate, "dd MMMM yyyy")
			: undefined;
		const dateOfBirth = data.dateOfBirth
			? formatDateStringToFormat(data.dateOfBirth, "dd MMMM yyyy")
			: undefined;
		if (activationDate) payload.activationDate = activationDate;
		if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
		if (activationDate || dateOfBirth) {
			payload.dateFormat = "dd MMMM yyyy";
		}

		const defaultAddressTypeId = getDefaultOptionId(addressTypeOptions, {
			fallbackToFirst: true,
		});
		payload.address = [
			{
				addressTypeId: defaultAddressTypeId,
				addressLine1: data.addressLine1?.trim() || undefined,
				city: data.city?.trim() || undefined,
				countryId: data.countryId,
			},
		];

		const identifiers: IdentifierInput[] = [];

		if (!isBusinessClient) {
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

		if (isBusinessClient && data.businessLicenseNo?.trim()) {
			identifiers.push({
				label: "Business License",
				value: data.businessLicenseNo.trim(),
				matches: DOCUMENT_TYPE_MATCHES.businessLicense,
			});
		}

		if (isBusinessClient && data.registrationNo?.trim()) {
			identifiers.push({
				label: "Registration Number",
				value: data.registrationNo.trim(),
				matches: DOCUMENT_TYPE_MATCHES.registration,
			});
		}

		if (isEditMode && editClientId !== null) {
			const updatePayload: ClientCreatePayload = { ...payload };
			delete updatePayload.address;

			const updateAddress = {
				addressLine1: data.addressLine1?.trim() || undefined,
				city: data.city?.trim() || undefined,
				countryId: data.countryId,
			};

			updateMutation.mutate({
				clientId: editClientId,
				payload: updatePayload,
				identifiers,
				address: updateAddress,
				existingIdentifiers: editIdentifiersQuery.data || [],
				existingAddresses: editAddressesQuery.data || [],
				addressTypeId: getDefaultOptionId(addressTypeOptions, {
					fallbackToFirst: true,
				}),
			});
		} else {
			createMutation.mutate({ payload, identifiers });
		}

		return null;
	};

	return (
		<>
			<PageShell
				title="Clients"
				subtitle="Onboard clients with preloaded system lookups"
				actions={
					<Button onClick={openCreateDrawer}>
						<Plus className="w-4 h-4 mr-2" />
						New Client
					</Button>
				}
			>
				<Card>
					<CardHeader>
						<CardTitle>Client Directory</CardTitle>
						<CardDescription>Track active and pending clients.</CardDescription>
					</CardHeader>
					<CardContent>
						{clientsQuery.isLoading && <ClientTableSkeleton />}
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

			<Sheet open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-[80vw]"
				>
					<SheetHeader>
						<SheetTitle>
							{isEditMode ? "Edit Client" : "Client Onboarding"}
						</SheetTitle>
						<SheetDescription>
							{isEditMode
								? "Update client profile, contact, KYC, and activation details."
								: "Create individual or business clients with structured KYC and activation workflows."}
						</SheetDescription>
					</SheetHeader>
					<div className="mb-4 mt-2 flex justify-end">
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
							<ClientRegistrationWizard
								control={control}
								errors={errors}
								watch={watch}
								officeOptions={officeOptions.filter((o) => o.id)}
								genderOptions={genderOptions.filter((o) => o.id)}
								legalFormOptions={legalFormOptions.filter((o) => o.id)}
								businessLineOptions={businessLineOptions.filter((o) => o.id)}
								staffOptions={staffOptions.filter((o) => o.id)}
								savingProductOptions={savingProductOptions.filter((o) => o.id)}
								clientTypeOptions={clientTypeOptions.filter((o) => o.id)}
								clientClassificationOptions={clientClassificationOptions.filter(
									(o) => o.id,
								)}
								countryOptions={countryOptions.filter((o) => o.id)}
								canCreateBusinessClient={businessLineOptions.length > 0}
								hasBusinessTypeConfiguration={businessLineOptions.length > 0}
								isOpen={isDrawerOpen}
								isSubmitting={
									isEditMode
										? updateMutation.isPending
										: createMutation.isPending
								}
								submissionError={submissionError?.message || null}
								submissionErrorDetails={submissionErrorDetails}
								submissionErrorTitle={
									isEditMode
										? "Failed to update client"
										: "Failed to create client"
								}
								submitLabel={isEditMode ? "Save Changes" : "Submit Client"}
								submittingLabel={
									isEditMode ? "Saving changes..." : "Submitting..."
								}
								onValidateStep={handleStepValidation}
								onSubmit={handleClientSubmit}
								onCancel={closeDrawer}
							/>
						)}

						{(hasMissingBusinessType || hasMissingCountry) && (
							<Alert variant="warning">
								<AlertTitle>Missing system configuration</AlertTitle>
								<AlertDescription>
									Configure required lookup values (business types or countries)
									before onboarding clients.
								</AlertDescription>
							</Alert>
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
