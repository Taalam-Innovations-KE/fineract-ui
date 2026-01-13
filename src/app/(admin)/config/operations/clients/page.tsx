"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
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
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetClientsPageItemsResponse,
	GetClientsResponse,
	GetCodeValuesDataResponse,
	OfficeData,
	PostClientsRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

const ENV_GENDER_CODE_ID = Number(
	process.env.NEXT_PUBLIC_FINERACT_GENDER_CODE_ID || "",
);
const ENV_CLIENT_TYPE_CODE_ID = Number(
	process.env.NEXT_PUBLIC_FINERACT_CLIENT_TYPE_CODE_ID || "",
);
const ENV_LEGAL_FORM_CODE_ID = Number(
	process.env.NEXT_PUBLIC_FINERACT_LEGAL_FORM_CODE_ID || "",
);

const CODE_NAME_MATCHES = {
	gender: ["gender"],
	clientType: ["client type", "client_type", "clienttype"],
	legalForm: ["legal form", "legal forms", "legalform"],
};

type LookupOption = GetCodeValuesDataResponse & { isDefault?: boolean };

type ClientFormData = {
	firstname: string;
	lastname: string;
	officeId?: number;
	genderId?: number;
	clientTypeId?: number;
	legalFormId?: number;
	mobileNo?: string;
	emailAddress?: string;
};

type ClientCreatePayload = PostClientsRequest & {
	genderId?: number;
	clientTypeId?: number;
	legalFormId?: number;
};

function findCodeId(
	codes: Array<{ id?: number; name?: string }>,
	matches: string[],
) {
	const normalizedMatches = matches.map((match) => match.toLowerCase());
	const match = codes.find((code) => {
		const name = (code.name || "").toLowerCase();
		return normalizedMatches.some((value) => name.includes(value));
	});
	return match?.id;
}

function resolveCodeId(envValue: number, fallback?: number) {
	if (Number.isFinite(envValue) && envValue > 0) {
		return envValue;
	}
	return fallback;
}

function getDefaultOptionId(options: LookupOption[]) {
	const defaultOption = options.find((option) => option.isDefault);
	return defaultOption?.id;
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

async function fetchOffices(tenantId: string): Promise<OfficeData[]> {
	const response = await fetch(BFF_ROUTES.offices, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch offices");
	}

	return response.json();
}

async function fetchCodes(
	tenantId: string,
): Promise<Array<{ id?: number; name?: string }>> {
	const response = await fetch(BFF_ROUTES.codes, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch codes");
	}

	return response.json();
}

async function fetchCodeValues(
	tenantId: string,
	codeId: number,
): Promise<LookupOption[]> {
	const response = await fetch(`${BFF_ROUTES.codes}/${codeId}/codevalues`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch code values");
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

	const officesQuery = useQuery({
		queryKey: ["offices", tenantId],
		queryFn: () => fetchOffices(tenantId),
		enabled: isDrawerOpen,
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const codesQuery = useQuery({
		queryKey: ["codes", tenantId],
		queryFn: () => fetchCodes(tenantId),
		enabled: isDrawerOpen,
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

	const genderCodeId = resolveCodeId(
		ENV_GENDER_CODE_ID,
		findCodeId(codesQuery.data || [], CODE_NAME_MATCHES.gender),
	);
	const clientTypeCodeId = resolveCodeId(
		ENV_CLIENT_TYPE_CODE_ID,
		findCodeId(codesQuery.data || [], CODE_NAME_MATCHES.clientType),
	);
	const legalFormCodeId = resolveCodeId(
		ENV_LEGAL_FORM_CODE_ID,
		findCodeId(codesQuery.data || [], CODE_NAME_MATCHES.legalForm),
	);

	const genderQuery = useQuery({
		queryKey: ["code-values", tenantId, genderCodeId],
		queryFn: () => fetchCodeValues(tenantId, genderCodeId!),
		enabled: isDrawerOpen && Boolean(genderCodeId),
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

	const clientTypeQuery = useQuery({
		queryKey: ["code-values", tenantId, clientTypeCodeId],
		queryFn: () => fetchCodeValues(tenantId, clientTypeCodeId!),
		enabled: isDrawerOpen && Boolean(clientTypeCodeId),
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

	const legalFormQuery = useQuery({
		queryKey: ["code-values", tenantId, legalFormCodeId],
		queryFn: () => fetchCodeValues(tenantId, legalFormCodeId!),
		enabled: isDrawerOpen && Boolean(legalFormCodeId),
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

	const createMutation = useMutation({
		mutationFn: (payload: ClientCreatePayload) =>
			createClient(tenantId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients", tenantId] });
			setIsDrawerOpen(false);
			setToastMessage("Client created successfully");
		},
	});

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		getValues,
		formState: { errors },
	} = useForm<ClientFormData>({
		defaultValues: {
			firstname: "",
			lastname: "",
		},
	});

	const genderOptions = useMemo(
		() => (genderQuery.data || []) as LookupOption[],
		[genderQuery.data],
	);
	const clientTypeOptions = useMemo(
		() => (clientTypeQuery.data || []) as LookupOption[],
		[clientTypeQuery.data],
	);
	const legalFormOptions = useMemo(
		() => (legalFormQuery.data || []) as LookupOption[],
		[legalFormQuery.data],
	);

	const isLookupsLoading =
		isDrawerOpen &&
		(officesQuery.isLoading ||
			codesQuery.isLoading ||
			genderQuery.isLoading ||
			clientTypeQuery.isLoading ||
			(legalFormCodeId ? legalFormQuery.isLoading : false));

	const lookupErrors = [
		officesQuery.error,
		codesQuery.error,
		genderQuery.error,
		clientTypeQuery.error,
		legalFormQuery.error,
	].filter(Boolean) as Error[];

	const hasMissingGender = !genderOptions.length;
	const hasMissingClientType = !clientTypeOptions.length;
	const hasMissingOffice = !officesQuery.data || officesQuery.data.length === 0;

	const disableSubmit =
		isLookupsLoading ||
		hasMissingGender ||
		hasMissingClientType ||
		hasMissingOffice ||
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
			firstname: "",
			lastname: "",
			officeId: undefined,
			genderId: undefined,
			clientTypeId: undefined,
			legalFormId: undefined,
			mobileNo: "",
			emailAddress: "",
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
		if (!legalFormOptions.length) return;
		const currentValue = getValues("legalFormId");
		const defaultId = getDefaultOptionId(legalFormOptions);
		if (!currentValue && defaultId) {
			setValue("legalFormId", defaultId, { shouldDirty: false });
		}
	}, [legalFormOptions, getValues, setValue]);

	useEffect(() => {
		if (!toastMessage) return;
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

	const handleRefreshLookups = async () => {
		await codesQuery.refetch();
		const refreshes: Array<Promise<unknown>> = [];
		if (genderCodeId) refreshes.push(genderQuery.refetch());
		if (clientTypeCodeId) refreshes.push(clientTypeQuery.refetch());
		if (legalFormCodeId) refreshes.push(legalFormQuery.refetch());
		refreshes.push(officesQuery.refetch());
		await Promise.all(refreshes);
	};

	const onSubmit = (data: ClientFormData) => {
		if (!data.officeId) return;
		const payload: ClientCreatePayload = {
			officeId: data.officeId,
			firstname: data.firstname.trim(),
			lastname: data.lastname.trim(),
			active: false,
		};

		if (data.mobileNo) payload.mobileNo = data.mobileNo;
		if (data.emailAddress) payload.emailAddress = data.emailAddress;
		if (data.genderId) payload.genderId = data.genderId;
		if (data.clientTypeId) payload.clientTypeId = data.clientTypeId;
		if (data.legalFormId) payload.legalFormId = data.legalFormId;

		createMutation.mutate(payload);
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
							/>
						)}
					</CardContent>
				</Card>
			</PageShell>

			<Drawer
				open={isDrawerOpen}
				onOpenChange={setIsDrawerOpen}
				className="flex flex-col"
			>
				<DrawerHeader>
					<div>
						<DrawerTitle>Client Onboarding</DrawerTitle>
						<DrawerDescription className="mt-1">
							Load system lookups before capturing new client details.
						</DrawerDescription>
					</div>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleRefreshLookups}
							disabled={isLookupsLoading}
						>
							Refresh Lookups
						</Button>
						<DrawerClose onClick={() => setIsDrawerOpen(false)} />
					</div>
				</DrawerHeader>
				<DrawerContent className="flex flex-col gap-4">
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
								<select
									id="officeId"
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									{...register("officeId", {
										valueAsNumber: true,
										required: "Office is required",
									})}
									disabled={hasMissingOffice}
								>
									<option value="">Select office</option>
									{(officesQuery.data || []).map((office) => (
										<option key={office.id} value={office.id}>
											{office.nameDecorated || office.name}
										</option>
									))}
								</select>
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

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="firstname">
										First name <span className="text-destructive">*</span>
									</Label>
									<Input
										id="firstname"
										{...register("firstname", {
											required: "First name is required",
										})}
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
										{...register("lastname", {
											required: "Last name is required",
										})}
										placeholder="Enter last name"
									/>
									{errors.lastname && (
										<p className="text-sm text-destructive">
											{errors.lastname.message}
										</p>
									)}
								</div>
							</div>

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
									<Label htmlFor="genderId">
										Gender <span className="text-destructive">*</span>
									</Label>
									<select
										id="genderId"
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										{...register("genderId", {
											valueAsNumber: true,
											required: "Gender is required",
										})}
										disabled={hasMissingGender}
									>
										<option value="">Select gender</option>
										{genderOptions
											.filter((option) => option.id)
											.map((option) => (
												<option key={option.id} value={option.id}>
													{option.name || "Unnamed"}
												</option>
											))}
									</select>
									{hasMissingGender && (
										<Alert variant="warning">
											<AlertTitle>No options configured</AlertTitle>
											<AlertDescription>
												No options configured in System Settings.
											</AlertDescription>
										</Alert>
									)}
									{errors.genderId && (
										<p className="text-sm text-destructive">
											{errors.genderId.message}
										</p>
									)}
								</div>

								<div className="space-y-2">
									<Label htmlFor="clientTypeId">
										Client type <span className="text-destructive">*</span>
									</Label>
									<select
										id="clientTypeId"
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										{...register("clientTypeId", {
											valueAsNumber: true,
											required: "Client type is required",
										})}
										disabled={hasMissingClientType}
									>
										<option value="">Select client type</option>
										{clientTypeOptions
											.filter((option) => option.id)
											.map((option) => (
												<option key={option.id} value={option.id}>
													{option.name || "Unnamed"}
												</option>
											))}
									</select>
									{hasMissingClientType && (
										<Alert variant="warning">
											<AlertTitle>No options configured</AlertTitle>
											<AlertDescription>
												No options configured in System Settings.
											</AlertDescription>
										</Alert>
									)}
									{errors.clientTypeId && (
										<p className="text-sm text-destructive">
											{errors.clientTypeId.message}
										</p>
									)}
								</div>
							</div>

							{Boolean(legalFormCodeId) && (
								<div className="space-y-2">
									<Label htmlFor="legalFormId">Legal form</Label>
									<select
										id="legalFormId"
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										{...register("legalFormId", { valueAsNumber: true })}
										disabled={!legalFormOptions.length}
									>
										<option value="">Select legal form</option>
										{legalFormOptions
											.filter((option) => option.id)
											.map((option) => (
												<option key={option.id} value={option.id}>
													{option.name || "Unnamed"}
												</option>
											))}
									</select>
									{!legalFormOptions.length && (
										<Alert variant="warning">
											<AlertTitle>No options configured</AlertTitle>
											<AlertDescription>
												No options configured in System Settings.
											</AlertDescription>
										</Alert>
									)}
								</div>
							)}

							{createMutation.isError && (
								<Alert variant="destructive">
									<AlertTitle>Submission failed</AlertTitle>
									<AlertDescription>
										{(createMutation.error as Error)?.message ||
											"Failed to create client. Please try again."}
									</AlertDescription>
								</Alert>
							)}

							{(hasMissingGender || hasMissingClientType) && (
								<Alert variant="warning">
									<AlertTitle>Missing system configuration</AlertTitle>
									<AlertDescription>
										Seed the required code values in System Configuration before
										onboarding clients.
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
				</DrawerContent>
			</Drawer>

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
