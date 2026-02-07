"use client";

import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeft,
	Banknote,
	Building2,
	CreditCard,
	FilePenLine,
	Fingerprint,
	History,
	Users,
} from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	AddressData,
	ClientDataWritable,
	GetClientsClientIdAccountsResponse,
	GetClientsClientIdIdentifiersResponse,
	GetClientsClientIdTransactionsResponse,
	GetClientsLoanAccounts,
	GetClientsPageItems,
	GetClientsSavingsAccounts,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

type ClientTab = "overview" | "accounts" | "identifiers" | "activity";

type ClientStatusChip = {
	label: string;
	variant: BadgeProps["variant"];
};

function titleCaseWords(value: string): string {
	return value
		.split(" ")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}

function formatCodeLabel(value?: string | null): string {
	if (!value) {
		return "N/A";
	}

	const withoutPrefix = value.includes(".")
		? value.split(".").pop() || value
		: value;
	const normalized = withoutPrefix.replaceAll("_", " ");
	return titleCaseWords(normalized);
}

function readEnumLabel(input?: { value?: string; code?: string }): string {
	if (!input) {
		return "N/A";
	}

	if (input.value) {
		return input.value;
	}

	return formatCodeLabel(input.code);
}

function readCodeValueLabel(input?: {
	name?: string;
	description?: string;
}): string {
	if (!input) {
		return "N/A";
	}

	return input.name || input.description || "N/A";
}

function formatExternalId(value?: string | { value?: string } | null): string {
	if (!value) {
		return "N/A";
	}

	if (typeof value === "string") {
		return value;
	}

	return value.value || "N/A";
}

function formatText(value?: string | number | null): string {
	if (value === null || value === undefined || value === "") {
		return "N/A";
	}

	return String(value);
}

function formatDate(value?: string): string {
	if (!value) {
		return "N/A";
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return parsed.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function getClientStatusChip(client: ClientDataWritable): ClientStatusChip {
	const normalized = (client.status?.code || "").toLowerCase();
	const statusText = client.status
		? readEnumLabel(client.status)
		: client.active
			? "Active"
			: "Pending";

	if (client.active || normalized.includes("active")) {
		return { label: statusText, variant: "success" };
	}
	if (normalized.includes("rejected") || normalized.includes("closed")) {
		return { label: statusText, variant: "destructive" };
	}
	if (normalized.includes("pending") || normalized.includes("approval")) {
		return { label: statusText, variant: "warning" };
	}

	return { label: statusText, variant: "secondary" };
}

async function fetchClient(
	tenantId: string,
	id: string,
): Promise<ClientDataWritable> {
	const response = await fetch(`${BFF_ROUTES.clients}/${id}?template=true`, {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw new Error("Failed to fetch client details");
	}

	return response.json();
}

async function fetchClientAddresses(
	tenantId: string,
	id: string,
): Promise<AddressData[]> {
	const response = await fetch(BFF_ROUTES.clientAddresses(id), {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw new Error("Failed to fetch client addresses");
	}

	return response.json();
}

async function fetchClientAccounts(
	tenantId: string,
	id: string,
): Promise<GetClientsClientIdAccountsResponse> {
	const response = await fetch(BFF_ROUTES.clientAccounts(id), {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw new Error("Failed to fetch client accounts");
	}

	return response.json();
}

async function fetchClientIdentifiers(
	tenantId: string,
	id: string,
): Promise<GetClientsClientIdIdentifiersResponse[]> {
	const response = await fetch(BFF_ROUTES.clientIdentifiers(id), {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw new Error("Failed to fetch client identifiers");
	}

	return response.json();
}

async function fetchClientTransactions(
	tenantId: string,
	id: string,
): Promise<GetClientsClientIdTransactionsResponse> {
	const response = await fetch(
		`${BFF_ROUTES.clientTransactions(id)}?offset=0&limit=25`,
		{
			headers: { "x-tenant-id": tenantId },
		},
	);

	if (!response.ok) {
		throw new Error("Failed to fetch client transactions");
	}

	return response.json();
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-3 py-2">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-medium text-right">{value}</span>
		</div>
	);
}

function MetricCard({
	label,
	value,
	icon: Icon,
	variant = "default",
}: {
	label: string;
	value: string;
	icon: React.ElementType;
	variant?: "default" | "success" | "warning";
}) {
	const tone =
		variant === "success"
			? "border-l-4 border-l-green-500 bg-green-50/50"
			: variant === "warning"
				? "border-l-4 border-l-yellow-500 bg-yellow-50/50"
				: "border-l-4 border-l-border";

	return (
		<Card className={tone}>
			<CardContent className="p-4">
				<div className="flex items-start justify-between gap-2">
					<div className="space-y-1">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{label}
						</p>
						<p className="text-lg font-semibold">{value}</p>
					</div>
					<Icon className="h-5 w-5 text-muted-foreground" />
				</div>
			</CardContent>
		</Card>
	);
}

function LoadingState() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={index}>
						<CardContent className="space-y-2 p-4">
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-7 w-28" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader className="space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-72" />
				</CardHeader>
				<CardContent className="space-y-3">
					{Array.from({ length: 8 }).map((_, index) => (
						<div key={index} className="grid grid-cols-2 gap-3">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

export default function ClientDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();
	const [activeTab, setActiveTab] = useState<ClientTab>("overview");

	const clientQuery = useQuery({
		queryKey: ["client", tenantId, id],
		queryFn: () => fetchClient(tenantId, id),
	});

	const accountsQuery = useQuery({
		queryKey: ["client-accounts", tenantId, id],
		queryFn: () => fetchClientAccounts(tenantId, id),
		enabled: Boolean(tenantId && id),
	});

	const identifiersQuery = useQuery({
		queryKey: ["client-identifiers", tenantId, id],
		queryFn: () => fetchClientIdentifiers(tenantId, id),
		enabled: Boolean(tenantId && id),
	});
	const addressesQuery = useQuery({
		queryKey: ["client-addresses", tenantId, id],
		queryFn: () => fetchClientAddresses(tenantId, id),
		enabled: Boolean(tenantId && id),
	});

	const transactionsQuery = useQuery({
		queryKey: ["client-transactions", tenantId, id],
		queryFn: () => fetchClientTransactions(tenantId, id),
		enabled: Boolean(tenantId && id),
	});

	const headerActions = (
		<div className="flex items-center gap-2">
			<Button variant="outline" asChild>
				<Link href={`/config/operations/clients?editClientId=${id}`}>
					<FilePenLine className="h-4 w-4 mr-2" />
					Edit Client
				</Link>
			</Button>
			<Button variant="outline" asChild>
				<Link href="/config/operations/clients">
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Clients
				</Link>
			</Button>
		</div>
	);

	if (clientQuery.isLoading) {
		return (
			<PageShell
				title="Client Details"
				subtitle="Loading detailed client profile..."
				actions={headerActions}
			>
				<LoadingState />
			</PageShell>
		);
	}

	if (clientQuery.error || !clientQuery.data) {
		return (
			<PageShell
				title="Client Details"
				subtitle="Could not load client profile"
				actions={headerActions}
			>
				<Alert>
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						Failed to load client details. Please try again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	const client = clientQuery.data;
	const statusChip = getClientStatusChip(client);
	const loanAccounts = accountsQuery.data?.loanAccounts || [];
	const savingsAccounts = accountsQuery.data?.savingsAccounts || [];
	const identifiers = identifiersQuery.data || [];
	const addresses = addressesQuery.data || client.address || [];
	const primaryAddress =
		addresses.find((address) => address.isActive !== false) || addresses[0];
	const transactions = transactionsQuery.data?.pageItems || [];
	const groups = client.groups || [];
	const linkedAccountsCount = loanAccounts.length + savingsAccounts.length;
	const hasPartialDataError =
		accountsQuery.isError ||
		identifiersQuery.isError ||
		addressesQuery.isError ||
		transactionsQuery.isError;
	const clientNonPersonDetails = (client.clientNonPersonDetails ||
		{}) as Record<string, unknown>;
	const clientKindLabel =
		client.fullname && !client.firstname && !client.lastname
			? "Business"
			: "Individual";
	const mainBusinessLineName = formatText(
		(
			clientNonPersonDetails.mainBusinessLine as
				| { name?: string; description?: string }
				| undefined
		)?.name ||
			(
				clientNonPersonDetails.mainBusinessLine as
					| { name?: string; description?: string }
					| undefined
			)?.description,
	);

	const loanColumns = [
		{
			header: "Account",
			cell: (row: GetClientsLoanAccounts) => formatText(row.accountNo),
		},
		{
			header: "Product",
			cell: (row: GetClientsLoanAccounts) => formatText(row.productName),
		},
		{
			header: "Type",
			cell: (row: GetClientsLoanAccounts) =>
				formatText(row.loanType?.description || row.loanType?.code),
		},
		{
			header: "Status",
			cell: (row: GetClientsLoanAccounts) => (
				<Badge variant={row.status?.active ? "success" : "secondary"}>
					{formatText(
						row.status?.description || formatCodeLabel(row.status?.code),
					)}
				</Badge>
			),
		},
	];

	const savingsColumns = [
		{
			header: "Account",
			cell: (row: GetClientsSavingsAccounts) => formatText(row.accountNo),
		},
		{
			header: "Product",
			cell: (row: GetClientsSavingsAccounts) => formatText(row.productName),
		},
		{
			header: "Deposit Type",
			cell: (row: GetClientsSavingsAccounts) =>
				formatText(row.depositType?.value || row.depositType?.code),
		},
		{
			header: "Status",
			cell: (row: GetClientsSavingsAccounts) => (
				<Badge variant={row.status?.active ? "success" : "secondary"}>
					{formatText(formatCodeLabel(row.status?.code))}
				</Badge>
			),
		},
	];

	const identifierColumns = [
		{
			header: "Document Type",
			cell: (row: GetClientsClientIdIdentifiersResponse) =>
				formatText(row.documentType?.name),
		},
		{
			header: "Identifier",
			cell: (row: GetClientsClientIdIdentifiersResponse) =>
				formatText(row.documentKey),
		},
		{
			header: "Description",
			cell: (row: GetClientsClientIdIdentifiersResponse) =>
				formatText(row.description),
		},
	];

	const transactionColumns = [
		{
			header: "Date",
			cell: (row: GetClientsPageItems) =>
				formatDate(row.date || row.submittedOnDate),
		},
		{
			header: "Type",
			cell: (row: GetClientsPageItems) =>
				formatText(row.type?.description || formatCodeLabel(row.type?.code)),
		},
		{
			header: "Amount",
			cell: (row: GetClientsPageItems) => {
				if (row.amount === null || row.amount === undefined) {
					return "N/A";
				}
				const symbol = row.currency?.displaySymbol || row.currency?.code || "";
				return `${symbol} ${row.amount.toLocaleString(undefined, {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})}`.trim();
			},
		},
		{
			header: "Office",
			cell: (row: GetClientsPageItems) => formatText(row.officeName),
		},
		{
			header: "Reversed",
			cell: (row: GetClientsPageItems) => (
				<Badge variant={row.reversed ? "warning" : "secondary"}>
					{row.reversed ? "Yes" : "No"}
				</Badge>
			),
		},
	];

	return (
		<PageShell
			title={
				<div className="flex items-center gap-2">
					<span>
						{formatText(
							client.displayName ||
								client.fullname ||
								`${client.firstname || ""} ${client.lastname || ""}`.trim(),
						)}
					</span>
					<Badge variant={statusChip.variant}>{statusChip.label}</Badge>
				</div>
			}
			subtitle={`${formatText(client.accountNo)} | ${formatText(client.officeName)}`}
			actions={headerActions}
		>
			<div className="space-y-6">
				<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
					<MetricCard
						label="Client ID"
						value={formatText(client.id)}
						icon={Users}
					/>
					<MetricCard
						label="Status"
						value={statusChip.label}
						icon={CreditCard}
						variant={client.active ? "success" : "warning"}
					/>
					<MetricCard
						label="Linked Accounts"
						value={String(linkedAccountsCount)}
						icon={Banknote}
					/>
					<MetricCard
						label="Identifiers"
						value={String(identifiers.length)}
						icon={Fingerprint}
					/>
				</div>

				{hasPartialDataError && (
					<Alert>
						<AlertTitle>Partial Data</AlertTitle>
						<AlertDescription>
							Some client sections could not be loaded. Core profile data is
							still available.
						</AlertDescription>
					</Alert>
				)}

				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as ClientTab)}
				>
					<div className="md:hidden">
						<Select
							value={activeTab}
							onValueChange={(value) => setActiveTab(value as ClientTab)}
						>
							<SelectTrigger>
								{activeTab === "overview" && "Overview"}
								{activeTab === "accounts" && "Accounts"}
								{activeTab === "identifiers" && "Identifiers"}
								{activeTab === "activity" && "Activity"}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="overview">Overview</SelectItem>
								<SelectItem value="accounts">Accounts</SelectItem>
								<SelectItem value="identifiers">Identifiers</SelectItem>
								<SelectItem value="activity">Activity</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<TabsList
						variant="line"
						className="hidden w-full justify-start border-b md:flex"
					>
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="accounts">Accounts</TabsTrigger>
						<TabsTrigger value="identifiers">Identifiers</TabsTrigger>
						<TabsTrigger value="activity">Activity</TabsTrigger>
					</TabsList>

					<div className="mt-4">
						<TabsContent value="overview">
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-base">
											Profile & Contact
										</CardTitle>
										<CardDescription>
											Core onboarding identity and communication details
										</CardDescription>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Display Name"
											value={formatText(client.displayName)}
										/>
										<InfoRow
											label="Account Number"
											value={formatText(client.accountNo)}
										/>
										<InfoRow
											label="External ID"
											value={formatExternalId(client.externalId)}
										/>
										<InfoRow
											label="Mobile Number"
											value={formatText(client.mobileNo)}
										/>
										<InfoRow
											label="Email Address"
											value={formatText(client.emailAddress)}
										/>
										<InfoRow
											label="Office"
											value={formatText(client.officeName)}
										/>
										<InfoRow
											label="Assigned Staff"
											value={formatText(client.staffName)}
										/>
										<InfoRow
											label="Default Savings Product"
											value={formatText(client.savingsProductName)}
										/>
									</CardContent>
								</Card>

								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-base">
											Onboarding Details
										</CardTitle>
										<CardDescription>
											Client structure and status captured from template fields
										</CardDescription>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow label="Client Kind" value={clientKindLabel} />
										<InfoRow
											label="First Name"
											value={formatText(client.firstname)}
										/>
										<InfoRow
											label="Middle Name"
											value={formatText(client.middlename)}
										/>
										<InfoRow
											label="Last Name"
											value={formatText(client.lastname)}
										/>
										<InfoRow
											label="Business Name"
											value={formatText(client.fullname)}
										/>
										<InfoRow
											label="Date of Birth"
											value={formatDate(client.dateOfBirth)}
										/>
										<InfoRow
											label="Gender"
											value={readCodeValueLabel(client.gender)}
										/>
										<InfoRow
											label="Legal Form"
											value={readEnumLabel(client.legalForm)}
										/>
										<InfoRow
											label="Client Type"
											value={readCodeValueLabel(client.clientType)}
										/>
										<InfoRow
											label="Client Classification"
											value={readCodeValueLabel(client.clientClassification)}
										/>
										<InfoRow
											label="Main Business Line"
											value={mainBusinessLineName}
										/>
										<InfoRow
											label="Activation Date"
											value={formatDate(client.activationDate)}
										/>
										<InfoRow label="Status" value={statusChip.label} />
										<InfoRow
											label="Status Code"
											value={formatCodeLabel(client.status?.code)}
										/>
									</CardContent>
								</Card>

								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-base">Address</CardTitle>
										<CardDescription>
											Primary client address from address records
										</CardDescription>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Address Line 1"
											value={formatText(primaryAddress?.addressLine1)}
										/>
										<InfoRow
											label="Address Line 2"
											value={formatText(primaryAddress?.addressLine2)}
										/>
										<InfoRow
											label="Address Line 3"
											value={formatText(primaryAddress?.addressLine3)}
										/>
										<InfoRow
											label="City / Town"
											value={formatText(
												primaryAddress?.city || primaryAddress?.townVillage,
											)}
										/>
										<InfoRow
											label="District / County"
											value={formatText(primaryAddress?.countyDistrict)}
										/>
										<InfoRow
											label="State / Province"
											value={formatText(primaryAddress?.stateName)}
										/>
										<InfoRow
											label="Country"
											value={formatText(
												primaryAddress?.countryName ||
													primaryAddress?.countryId,
											)}
										/>
										<InfoRow
											label="Postal Code"
											value={formatText(primaryAddress?.postalCode)}
										/>
									</CardContent>
								</Card>

								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-base">
											KYC & Identifiers
										</CardTitle>
										<CardDescription>
											Documents captured during onboarding and updates
										</CardDescription>
									</CardHeader>
									<CardContent>
										{identifiers.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												No client identifiers found.
											</p>
										) : (
											<div className="space-y-3">
												{identifiers.map((identifier) => (
													<div
														key={identifier.id || identifier.documentKey}
														className="flex items-start justify-between gap-3 border-b pb-2 last:border-b-0"
													>
														<span className="text-sm text-muted-foreground">
															{formatText(identifier.documentType?.name)}
														</span>
														<span className="text-sm font-medium text-right">
															{formatText(identifier.documentKey)}
														</span>
													</div>
												))}
											</div>
										)}
									</CardContent>
								</Card>

								<Card className="lg:col-span-2">
									<CardHeader className="pb-3">
										<CardTitle className="text-base">
											Group Membership
										</CardTitle>
									</CardHeader>
									<CardContent>
										{groups.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												Client is not assigned to any group.
											</p>
										) : (
											<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
												{groups.map((group) => (
													<div
														key={group.id || group.name}
														className="rounded-sm border border-border/60 p-3"
													>
														<p className="text-sm font-semibold">
															{formatText(group.name)}
														</p>
														<p className="text-xs text-muted-foreground">
															Group ID: {formatText(group.id)} | Account:{" "}
															{formatText(group.accountNo)}
														</p>
													</div>
												))}
											</div>
										)}
									</CardContent>
								</Card>
							</div>
						</TabsContent>

						<TabsContent value="accounts">
							<div className="grid grid-cols-1 gap-4">
								<Card>
									<CardHeader>
										<CardTitle>Loan Accounts</CardTitle>
										<CardDescription>
											{loanAccounts.length} linked loan account
											{loanAccounts.length === 1 ? "" : "s"}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<DataTable
											columns={loanColumns}
											data={loanAccounts}
											getRowId={(row) =>
												row.id || row.accountNo || "loan-account"
											}
											emptyMessage="No linked loan accounts."
										/>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Savings Accounts</CardTitle>
										<CardDescription>
											{savingsAccounts.length} linked savings account
											{savingsAccounts.length === 1 ? "" : "s"}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<DataTable
											columns={savingsColumns}
											data={savingsAccounts}
											getRowId={(row) =>
												row.id || row.accountNo || "savings-account"
											}
											emptyMessage="No linked savings accounts."
										/>
									</CardContent>
								</Card>
							</div>
						</TabsContent>

						<TabsContent value="identifiers">
							<Card>
								<CardHeader>
									<CardTitle>Client Identifiers</CardTitle>
									<CardDescription>
										KYC and identity references tied to this client
									</CardDescription>
								</CardHeader>
								<CardContent>
									<DataTable
										columns={identifierColumns}
										data={identifiers}
										getRowId={(row) =>
											row.id || row.documentKey || "identifier"
										}
										emptyMessage="No client identifiers found."
									/>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="activity">
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<History className="h-4 w-4" />
											Lifecycle Timeline
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Submitted On"
											value={formatDate(client.timeline?.submittedOnDate)}
										/>
										<InfoRow
											label="Submitted By"
											value={formatText(
												[
													client.timeline?.submittedByFirstname,
													client.timeline?.submittedByLastname,
												]
													.filter(Boolean)
													.join(" "),
											)}
										/>
										<InfoRow
											label="Activated On"
											value={formatDate(client.timeline?.activatedOnDate)}
										/>
										<InfoRow
											label="Activated By"
											value={formatText(
												[
													client.timeline?.activatedByFirstname,
													client.timeline?.activatedByLastname,
												]
													.filter(Boolean)
													.join(" "),
											)}
										/>
									</CardContent>
								</Card>

								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Building2 className="h-4 w-4" />
											Organisational Assignment
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Office ID"
											value={formatText(client.officeId)}
										/>
										<InfoRow
											label="Office Name"
											value={formatText(client.officeName)}
										/>
										<InfoRow
											label="Savings Product ID"
											value={formatText(client.savingsProductId)}
										/>
										<InfoRow
											label="Savings Product"
											value={formatText(client.savingsProductName)}
										/>
									</CardContent>
								</Card>

								<Card className="lg:col-span-2">
									<CardHeader>
										<CardTitle>Recent Transactions</CardTitle>
										<CardDescription>
											Most recent 25 client transactions
										</CardDescription>
									</CardHeader>
									<CardContent>
										<DataTable
											columns={transactionColumns}
											data={transactions}
											getRowId={(row) => row.id || `${row.date}-${row.amount}`}
											emptyMessage="No transactions found for this client."
										/>
									</CardContent>
								</Card>
							</div>
						</TabsContent>
					</div>
				</Tabs>
			</div>
		</PageShell>
	);
}
