"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Banknote,
	Calendar,
	CreditCard,
	Eye,
	PenLine,
	Plus,
	Users,
} from "lucide-react";
import Link from "next/link";
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
	GetClientsPageItemsResponse,
	GetClientsResponse,
	GetLoanProductsResponse,
	GetLoansLoanIdResponse,
	GetLoansTemplateResponse,
	PostLoansRequest,
	PutLoansLoanIdRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

type LoanFormData = {
	clientId: number;
	productId: number;
	principal: number;
	numberOfRepayments: number;
	interestRatePerPeriod: number;
	interestType?: number;
	amortizationType?: number;
	interestCalculationPeriodType?: number;
	transactionProcessingStrategyCode?: string;
	loanTermFrequency: number;
	loanTermFrequencyType: number;
	repaymentEvery: number;
	repaymentFrequencyType: number;
	expectedDisbursementDate: string;
	submittedOnDate: string;
	externalId?: string;
	loanOfficerId?: number;
	loanPurposeId?: number;
};

type LoanProduct = GetLoanProductsResponse & {
	id?: number;
	name?: string;
	minPrincipal?: number;
	maxPrincipal?: number;
	principal?: number;
	minNumberOfRepayments?: number;
	maxNumberOfRepayments?: number;
	numberOfRepayments?: number;
	interestRatePerPeriod?: number;
	repaymentEvery?: number;
	repaymentFrequencyType?: { id?: number; value?: string };
};

type LookupOption = {
	id?: number;
	value?: string;
	name?: string;
	code?: string;
};

type TransactionProcessingStrategyOption = {
	code?: string;
	name?: string;
};

type LoanOfficerOption = {
	id?: number;
	displayName?: string;
	firstname?: string;
	lastname?: string;
};

type LoanTemplateResponse = GetLoansTemplateResponse & {
	principal?: number;
	proposedPrincipal?: number;
	approvedPrincipal?: number;
	termFrequency?: number;
	termPeriodFrequencyType?: { id?: number; value?: string };
	numberOfRepayments?: number;
	interestRatePerPeriod?: number;
	repaymentEvery?: number;
	repaymentFrequencyType?: { id?: number; value?: string };
	interestRateFrequencyType?: { id?: number; value?: string };
	interestType?: { id?: number; value?: string };
	amortizationType?: { id?: number; value?: string };
	interestCalculationPeriodType?: { id?: number; value?: string };
	transactionProcessingStrategyCode?: string;
	product?: LoanProduct;
	loanProductName?: string;
	loanProductDescription?: string;
	expectedDisbursementDate?: number[] | string;
	termFrequencyTypeOptions?: LookupOption[];
	repaymentFrequencyTypeOptions?: LookupOption[];
	interestRateFrequencyTypeOptions?: LookupOption[];
	interestTypeOptions?: LookupOption[];
	amortizationTypeOptions?: LookupOption[];
	interestCalculationPeriodTypeOptions?: LookupOption[];
	transactionProcessingStrategyOptions?: TransactionProcessingStrategyOption[];
	loanOfficerOptions?: LoanOfficerOption[];
	loanPurposeOptions?: LookupOption[];
};

type LoanListItem = {
	id?: number;
	accountNo?: string;
	clientId?: number;
	clientName?: string;
	productId?: number;
	productName?: string;
	principal?: number;
	status?: { id?: number; value?: string; active?: boolean };
	loanType?: { value?: string };
	currency?: { code?: string; displaySymbol?: string };
};

type LoansResponse = {
	totalFilteredRecords?: number;
	pageItems?: LoanListItem[];
};

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString()}`;
}

function _formatDate(dateStr: string) {
	if (!dateStr) return "";
	const date = new Date(dateStr);
	const year = date.getFullYear();
	const _month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${day} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()]} ${year}`;
}

function formatTemplateDate(value?: string | number[]) {
	if (!value) return "";
	if (Array.isArray(value)) {
		const [year, month, day] = value;
		if (!year || !month || !day) return "";
		return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
			2,
		)}`;
	}
	return value;
}

function getToday() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function toDateInputValue(value?: string) {
	if (!value) return "";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	const year = parsed.getFullYear();
	const month = String(parsed.getMonth() + 1).padStart(2, "0");
	const day = String(parsed.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
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

async function fetchLoanProducts(tenantId: string): Promise<LoanProduct[]> {
	const response = await fetch(BFF_ROUTES.loanProducts, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch loan products");
	}

	return response.json();
}

async function fetchLoanTemplate(
	tenantId: string,
	clientId: number,
	productId: number,
): Promise<LoanTemplateResponse> {
	const query = new URLSearchParams({
		templateType: "individual",
		clientId: String(clientId),
		productId: String(productId),
	});
	const response = await fetch(`${BFF_ROUTES.loansTemplate}?${query}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch loan template");
	}

	return response.json();
}

async function fetchLoans(tenantId: string): Promise<LoansResponse> {
	const response = await fetch(BFF_ROUTES.loans, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch loans");
	}

	return response.json();
}

async function fetchLoanDetails(
	tenantId: string,
	loanId: number,
): Promise<GetLoansLoanIdResponse> {
	const response = await fetch(`${BFF_ROUTES.loans}/${loanId}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch loan details");
	}

	return response.json();
}

async function createLoan(tenantId: string, payload: PostLoansRequest) {
	const response = await fetch(BFF_ROUTES.loans, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			data.message ||
				data.errors?.[0]?.defaultUserMessage ||
				"Failed to create loan",
		);
	}

	return data;
}

async function updateLoan(
	tenantId: string,
	loanId: number,
	payload: PutLoansLoanIdRequest,
) {
	const response = await fetch(`${BFF_ROUTES.loans}/${loanId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			data.message ||
				data.errors?.[0]?.defaultUserMessage ||
				"Failed to update loan",
		);
	}

	return data;
}

export default function LoansPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
	const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
	const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(
		null,
	);

	const loansQuery = useQuery({
		queryKey: ["loans", tenantId],
		queryFn: () => fetchLoans(tenantId),
	});

	const loanDetailsQuery = useQuery({
		queryKey: ["loan", tenantId, selectedLoanId],
		queryFn: () => fetchLoanDetails(tenantId, selectedLoanId ?? 0),
		enabled: Boolean(selectedLoanId) && drawerMode === "edit" && isDrawerOpen,
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const clientsQuery = useQuery({
		queryKey: ["clients", tenantId],
		queryFn: () => fetchClients(tenantId),
		enabled: isDrawerOpen,
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const productsQuery = useQuery({
		queryKey: ["loanProducts", tenantId],
		queryFn: () => fetchLoanProducts(tenantId),
		enabled: isDrawerOpen,
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const createMutation = useMutation({
		mutationFn: (payload: PostLoansRequest) => createLoan(tenantId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["loans", tenantId] });
			setIsDrawerOpen(false);
			setToastMessage("Loan application submitted successfully");
		},
	});

	const updateMutation = useMutation({
		mutationFn: (payload: PutLoansLoanIdRequest) =>
			updateLoan(tenantId, selectedLoanId!, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["loans", tenantId] });
			setIsDrawerOpen(false);
			setSelectedLoanId(null);
			setDrawerMode("create");
			setToastMessage("Loan updated successfully");
		},
	});

	const {
		register,
		handleSubmit,
		control,
		reset,
		setError,
		clearErrors,
		setValue,
		getValues,
		watch,
		formState: { errors },
	} = useForm<LoanFormData>({
		defaultValues: {
			submittedOnDate: getToday(),
			expectedDisbursementDate: getToday(),
			loanTermFrequencyType: 2,
			repaymentFrequencyType: 2,
			repaymentEvery: 1,
			loanOfficerId: undefined,
			loanPurposeId: undefined,
			interestType: undefined,
			amortizationType: undefined,
			interestCalculationPeriodType: undefined,
			transactionProcessingStrategyCode: undefined,
		},
	});

	const watchClientId = watch("clientId");
	const watchProductId = watch("productId");

	const loanTemplateQuery = useQuery({
		queryKey: ["loanTemplate", tenantId, watchClientId, watchProductId],
		queryFn: () =>
			fetchLoanTemplate(
				tenantId,
				watchClientId as number,
				watchProductId as number,
			),
		enabled: isDrawerOpen && Boolean(watchClientId) && Boolean(watchProductId),
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const loanTemplate = loanTemplateQuery.data as
		| LoanTemplateResponse
		| undefined;
	const templateProduct = loanTemplate?.product;

	const fallbackRepaymentFrequencyOptions: LookupOption[] = [
		{ id: 0, value: "Days" },
		{ id: 1, value: "Weeks" },
		{ id: 2, value: "Months" },
	];
	const repaymentFrequencyOptions = loanTemplate?.repaymentFrequencyTypeOptions
		?.length
		? loanTemplate.repaymentFrequencyTypeOptions
		: fallbackRepaymentFrequencyOptions;
	const termFrequencyOptions = loanTemplate?.termFrequencyTypeOptions || [];
	const loanOfficerOptions = loanTemplate?.loanOfficerOptions || [];
	const loanPurposeOptions = loanTemplate?.loanPurposeOptions || [];
	const interestTypeOptions = loanTemplate?.interestTypeOptions || [];
	const amortizationTypeOptions = loanTemplate?.amortizationTypeOptions || [];
	const interestCalculationPeriodTypeOptions =
		loanTemplate?.interestCalculationPeriodTypeOptions || [];
	const transactionProcessingStrategyOptions =
		loanTemplate?.transactionProcessingStrategyOptions || [];

	const hasRepaymentFrequencyOptions = loanTemplate
		? (loanTemplate.repaymentFrequencyTypeOptions?.length ?? 0) > 0
		: true;
	const hasTermFrequencyOptions = loanTemplate
		? termFrequencyOptions.length > 0
		: true;
	const hasInterestTypeOptions = loanTemplate
		? Boolean(loanTemplate.interestType?.id) || interestTypeOptions.length > 0
		: true;
	const hasAmortizationTypeOptions = loanTemplate
		? Boolean(loanTemplate.amortizationType?.id) ||
			amortizationTypeOptions.length > 0
		: true;
	const hasInterestCalculationPeriodTypeOptions = loanTemplate
		? Boolean(loanTemplate.interestCalculationPeriodType?.id) ||
			interestCalculationPeriodTypeOptions.length > 0
		: true;
	const hasTransactionProcessingStrategyOptions = loanTemplate
		? Boolean(loanTemplate.transactionProcessingStrategyCode) ||
			transactionProcessingStrategyOptions.length > 0
		: true;

	const minPrincipal =
		templateProduct?.minPrincipal ?? selectedProduct?.minPrincipal ?? 1;
	const maxPrincipal =
		templateProduct?.maxPrincipal ?? selectedProduct?.maxPrincipal;
	const minRepayments =
		templateProduct?.minNumberOfRepayments ??
		selectedProduct?.minNumberOfRepayments ??
		1;
	const maxRepayments =
		templateProduct?.maxNumberOfRepayments ??
		selectedProduct?.maxNumberOfRepayments;

	const hasLoanOfficerOptions = loanTemplate
		? loanOfficerOptions.length > 0
		: true;
	const hasLoanPurposeOptions = loanTemplate
		? loanPurposeOptions.length > 0
		: true;

	const clients = useMemo(
		() => (clientsQuery.data?.pageItems || []) as GetClientsPageItemsResponse[],
		[clientsQuery.data],
	);
	const activeClients = clients.filter((c) => c.active);

	const loanProducts = useMemo(
		() => (productsQuery.data || []) as LoanProduct[],
		[productsQuery.data],
	);

	const loans = loansQuery.data?.pageItems || [];
	const pendingLoans = loans.filter(
		(loan) =>
			loan.status?.value?.toLowerCase() === "submitted and pending approval",
	);
	const activeLoans = loans.filter((loan) => loan.status?.active);

	const isTemplateLoading =
		loanTemplateQuery.isLoading &&
		Boolean(watchClientId) &&
		Boolean(watchProductId);
	const isEditLoading =
		drawerMode === "edit" && loanDetailsQuery.isLoading && isDrawerOpen;
	const isLookupsLoading =
		isDrawerOpen &&
		(clientsQuery.isLoading ||
			productsQuery.isLoading ||
			isTemplateLoading ||
			isEditLoading);

	const lookupErrors = [
		clientsQuery.error,
		productsQuery.error,
		loanTemplateQuery.error,
		loanDetailsQuery.error,
	].filter(Boolean) as Error[];

	const hasMissingClients = !clients.length;
	const hasMissingProducts = !loanProducts.length;
	const hasMissingTemplateOptions =
		loanTemplate &&
		(!hasRepaymentFrequencyOptions ||
			!hasTermFrequencyOptions ||
			!hasInterestTypeOptions ||
			!hasAmortizationTypeOptions ||
			!hasInterestCalculationPeriodTypeOptions ||
			!hasTransactionProcessingStrategyOptions);

	const disableSubmit =
		isLookupsLoading ||
		hasMissingClients ||
		hasMissingProducts ||
		hasMissingTemplateOptions ||
		createMutation.isPending ||
		updateMutation.isPending;

	const loanColumns = [
		{
			header: "Loan",
			cell: (loan: LoanListItem) => (
				<div>
					<div className="font-medium">{loan.accountNo || "—"}</div>
					<div className="text-xs text-muted-foreground">
						{loan.productName || "Unknown product"}
					</div>
				</div>
			),
		},
		{
			header: "Client",
			cell: (loan: LoanListItem) => (
				<span className={loan.clientName ? "" : "text-muted-foreground"}>
					{loan.clientName || "—"}
				</span>
			),
		},
		{
			header: "Principal",
			cell: (loan: LoanListItem) => (
				<span className="font-mono">
					{formatCurrency(loan.principal, loan.currency?.displaySymbol)}
				</span>
			),
		},
		{
			header: "Status",
			cell: (loan: LoanListItem) => {
				const status = loan.status?.value?.toLowerCase() || "";
				let variant:
					| "default"
					| "secondary"
					| "success"
					| "warning"
					| "destructive" = "secondary";
				if (status.includes("active")) variant = "success";
				else if (status.includes("pending")) variant = "warning";
				else if (status.includes("closed") || status.includes("rejected"))
					variant = "destructive";

				return (
					<Badge variant={variant} className="text-xs px-2 py-0.5">
						{loan.status?.value || "Unknown"}
					</Badge>
				);
			},
		},
		{
			header: "Actions",
			cell: (loan: LoanListItem) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setIsDrawerOpen(false);
							reset();
						}}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={disableSubmit}>
						{drawerMode === "edit" ? (
							updateMutation.isPending ? (
								"Saving..."
							) : (
								<>
									<PenLine className="mr-2 h-4 w-4" />
									Update Loan
								</>
							)
						) : createMutation.isPending ? (
							"Submitting..."
						) : (
							<>
								<Plus className="mr-2 h-4 w-4" />
								Book Loan
							</>
						)}
					</Button>
				</div>
			),
			className: "text-right",
			headerClassName: "text-right",
		},
	];

	useEffect(() => {
		if (!isDrawerOpen) return;
		if (drawerMode === "create") {
			const today = getToday();
			reset({
				clientId: undefined,
				productId: undefined,
				principal: undefined,
				numberOfRepayments: undefined,
				interestRatePerPeriod: undefined,
				interestType: undefined,
				amortizationType: undefined,
				interestCalculationPeriodType: undefined,
				transactionProcessingStrategyCode: undefined,
				loanTermFrequency: undefined,
				loanTermFrequencyType: 2,
				repaymentEvery: 1,
				repaymentFrequencyType: 2,
				expectedDisbursementDate: today,
				submittedOnDate: today,
				externalId: "",
				loanOfficerId: undefined,
				loanPurposeId: undefined,
			});
			setSelectedProduct(null);
		}
	}, [drawerMode, isDrawerOpen, reset]);

	useEffect(() => {
		if (!isDrawerOpen || drawerMode !== "edit") return;
		if (!loanDetailsQuery.data) return;
		const loan = loanDetailsQuery.data;
		const productId = loan.loanProductId;
		const product = loanProducts.find((item) => item.id === productId) || null;
		setSelectedProduct(product);
		reset({
			clientId: loan.clientId ?? undefined,
			productId: productId ?? undefined,
			principal: loan.principal ?? undefined,
			numberOfRepayments: loan.numberOfRepayments ?? undefined,
			interestRatePerPeriod: loan.interestRatePerPeriod ?? undefined,
			interestType: loan.interestType?.id ?? undefined,
			amortizationType: loan.amortizationType?.id ?? undefined,
			interestCalculationPeriodType:
				loan.interestCalculationPeriodType?.id ?? undefined,
			transactionProcessingStrategyCode:
				loan.transactionProcessingStrategyCode ?? undefined,
			loanTermFrequency: loan.termFrequency ?? undefined,
			loanTermFrequencyType: loan.termPeriodFrequencyType?.id ?? 2,
			repaymentEvery: loan.repaymentEvery ?? 1,
			repaymentFrequencyType: loan.repaymentFrequencyType?.id ?? 2,
			expectedDisbursementDate: toDateInputValue(
				loan.timeline?.expectedDisbursementDate,
			),
			submittedOnDate: toDateInputValue(loan.timeline?.submittedOnDate),
			externalId: loan.externalId || "",
			loanOfficerId: loan.loanOfficerId ?? undefined,
			loanPurposeId: loan.loanPurposeId ?? undefined,
		});
	}, [drawerMode, isDrawerOpen, loanDetailsQuery.data, loanProducts, reset]);

	useEffect(() => {
		if (!loanTemplate || drawerMode === "edit") return;
		const templateDisbursementDate = formatTemplateDate(
			loanTemplate.timeline?.expectedDisbursementDate ||
				loanTemplate.expectedDisbursementDate,
		);

		setSelectedProduct(templateProduct || null);
		if (loanTemplate.principal) setValue("principal", loanTemplate.principal);
		if (loanTemplate.numberOfRepayments)
			setValue("numberOfRepayments", loanTemplate.numberOfRepayments);
		if (loanTemplate.interestRatePerPeriod)
			setValue("interestRatePerPeriod", loanTemplate.interestRatePerPeriod);
		if (
			getValues("interestType") === undefined &&
			loanTemplate.interestType?.id
		) {
			setValue("interestType", loanTemplate.interestType.id);
		} else if (
			getValues("interestType") === undefined &&
			interestTypeOptions[0]?.id !== undefined
		) {
			setValue("interestType", interestTypeOptions[0].id);
		}
		if (
			getValues("amortizationType") === undefined &&
			loanTemplate.amortizationType?.id
		) {
			setValue("amortizationType", loanTemplate.amortizationType.id);
		} else if (
			getValues("amortizationType") === undefined &&
			amortizationTypeOptions[0]?.id !== undefined
		) {
			setValue("amortizationType", amortizationTypeOptions[0].id);
		}
		if (
			getValues("interestCalculationPeriodType") === undefined &&
			loanTemplate.interestCalculationPeriodType?.id
		) {
			setValue(
				"interestCalculationPeriodType",
				loanTemplate.interestCalculationPeriodType.id,
			);
		} else if (
			getValues("interestCalculationPeriodType") === undefined &&
			interestCalculationPeriodTypeOptions[0]?.id !== undefined
		) {
			setValue(
				"interestCalculationPeriodType",
				interestCalculationPeriodTypeOptions[0].id,
			);
		}
		if (
			!getValues("transactionProcessingStrategyCode") &&
			loanTemplate.transactionProcessingStrategyCode
		) {
			setValue(
				"transactionProcessingStrategyCode",
				loanTemplate.transactionProcessingStrategyCode,
			);
		} else if (
			!getValues("transactionProcessingStrategyCode") &&
			transactionProcessingStrategyOptions[0]?.code
		) {
			setValue(
				"transactionProcessingStrategyCode",
				transactionProcessingStrategyOptions[0].code,
			);
		}
		if (loanTemplate.termFrequency)
			setValue("loanTermFrequency", loanTemplate.termFrequency);
		if (loanTemplate.termPeriodFrequencyType?.id)
			setValue(
				"loanTermFrequencyType",
				loanTemplate.termPeriodFrequencyType.id,
			);
		if (loanTemplate.repaymentEvery)
			setValue("repaymentEvery", loanTemplate.repaymentEvery);
		if (loanTemplate.repaymentFrequencyType?.id)
			setValue(
				"repaymentFrequencyType",
				loanTemplate.repaymentFrequencyType.id,
			);
		if (templateDisbursementDate)
			setValue("expectedDisbursementDate", templateDisbursementDate);
		if (loanTemplate.loanOfficerOptions?.[0]?.id)
			setValue("loanOfficerId", loanTemplate.loanOfficerOptions[0].id);
		if (loanTemplate.loanPurposeOptions?.[0]?.id)
			setValue("loanPurposeId", loanTemplate.loanPurposeOptions[0].id);
	}, [
		drawerMode,
		loanTemplate,
		setValue,
		templateProduct,
		getValues,
		interestTypeOptions,
		amortizationTypeOptions,
		interestCalculationPeriodTypeOptions,
		transactionProcessingStrategyOptions,
	]);

	useEffect(() => {
		if (loanTemplate || !watchProductId || !loanProducts.length) return;
		const product = loanProducts.find((p) => p.id === watchProductId) || null;
		setSelectedProduct(product);
		if (drawerMode !== "create" || !product) return;
		if (product.principal) setValue("principal", product.principal);
		if (product.numberOfRepayments)
			setValue("numberOfRepayments", product.numberOfRepayments);
		if (product.interestRatePerPeriod)
			setValue("interestRatePerPeriod", product.interestRatePerPeriod);
		if (product.repaymentEvery)
			setValue("repaymentEvery", product.repaymentEvery);
		if (product.repaymentFrequencyType?.id)
			setValue("repaymentFrequencyType", product.repaymentFrequencyType.id);
	}, [drawerMode, loanTemplate, watchProductId, loanProducts, setValue]);

	useEffect(() => {
		if (!toastMessage) return;
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

	const onSubmit = (data: LoanFormData) => {
		clearErrors();
		let hasError = false;

		if (!data.clientId) {
			setError("clientId", { message: "Client is required" });
			hasError = true;
		}
		if (!data.productId) {
			setError("productId", { message: "Loan product is required" });
			hasError = true;
		}
		if (loanTemplate && !hasTermFrequencyOptions) {
			setError("loanTermFrequencyType", {
				message: "No loan term frequency options configured",
			});
			hasError = true;
		}
		if (loanTemplate && !hasRepaymentFrequencyOptions) {
			setError("repaymentFrequencyType", {
				message: "No repayment frequency options configured",
			});
			hasError = true;
		}
		if (hasError) return;

		const payload: PostLoansRequest &
			PutLoansLoanIdRequest & {
				loanOfficerId?: number;
				loanPurposeId?: number;
			} = {
			clientId: data.clientId,
			productId: data.productId,
			principal: data.principal,
			numberOfRepayments: data.numberOfRepayments,
			interestRatePerPeriod: data.interestRatePerPeriod,
			interestType: data.interestType,
			amortizationType: data.amortizationType,
			interestCalculationPeriodType: data.interestCalculationPeriodType,
			transactionProcessingStrategyCode: data.transactionProcessingStrategyCode,
			loanTermFrequency: data.loanTermFrequency || data.numberOfRepayments,
			loanTermFrequencyType: data.loanTermFrequencyType,
			repaymentEvery: data.repaymentEvery,
			repaymentFrequencyType: data.repaymentFrequencyType,
			expectedDisbursementDate: data.expectedDisbursementDate,
			submittedOnDate: data.submittedOnDate,
			dateFormat: "yyyy-MM-dd",
			locale: "en",
			loanType: "individual",
		};

		if (data.externalId) {
			payload.externalId = data.externalId;
		}
		if (data.loanOfficerId) {
			payload.loanOfficerId = data.loanOfficerId;
		}
		if (data.loanPurposeId) {
			payload.loanPurposeId = data.loanPurposeId;
		}

		if (drawerMode === "edit") {
			updateMutation.mutate(payload);
		} else {
			createMutation.mutate(payload);
		}
	};

	const handleDrawerClose = (open: boolean) => {
		setIsDrawerOpen(open);
		if (!open) {
			setSelectedLoanId(null);
			setDrawerMode("create");
			setSelectedProduct(null);
		}
	};

	return (
		<>
			<PageShell
				title="Loan Applications"
				subtitle="Book and manage loan applications for clients"
				actions={
					<Button
						onClick={() => {
							setDrawerMode("create");
							setSelectedLoanId(null);
							setIsDrawerOpen(true);
						}}
					>
						<Plus className="h-4 w-4 mr-2" />
						Book Loan
					</Button>
				}
			>
				<div className="space-y-6">
					<div className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
										<CreditCard className="h-5 w-5 text-primary" />
									</div>
									<div>
										<div className="text-2xl font-bold">{loans.length}</div>
										<div className="text-sm text-muted-foreground">
											Total Loans
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-warning/10">
										<Calendar className="h-5 w-5 text-warning" />
									</div>
									<div>
										<div className="text-2xl font-bold">
											{pendingLoans.length}
										</div>
										<div className="text-sm text-muted-foreground">
											Pending Approval
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-success/10">
										<Banknote className="h-5 w-5 text-success" />
									</div>
									<div>
										<div className="text-2xl font-bold">
											{activeLoans.length}
										</div>
										<div className="text-sm text-muted-foreground">
											Active Loans
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Loan Directory</CardTitle>
							<CardDescription>
								{loans.length} loan{loans.length !== 1 ? "s" : ""} in the system
							</CardDescription>
						</CardHeader>
						<CardContent>
							{loansQuery.isLoading && (
								<div className="py-6 text-center text-muted-foreground">
									Loading loans...
								</div>
							)}
							{loansQuery.error && (
								<div className="py-6 text-center text-destructive">
									Failed to load loans. Please try again.
								</div>
							)}
							{!loansQuery.isLoading && !loansQuery.error && (
								<DataTable
									data={loans}
									columns={loanColumns}
									getRowId={(loan) =>
										loan.id?.toString() || loan.accountNo || "loan-row"
									}
									emptyMessage="No loans found. Book your first loan to get started."
								/>
							)}
						</CardContent>
					</Card>
				</div>
			</PageShell>

			<Sheet open={isDrawerOpen} onOpenChange={handleDrawerClose}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>
							{drawerMode === "edit" ? "Edit Loan" : "Book New Loan"}
						</SheetTitle>
						<SheetDescription>
							{drawerMode === "edit"
								? "Review and update loan application details."
								: "Create a loan application for an existing client"}
						</SheetDescription>
					</SheetHeader>

					<div className="flex flex-col gap-4 mt-6">
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
									<Label htmlFor="clientId">
										Client <span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="clientId"
										rules={{ required: "Client is required" }}
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined && field.value !== null
														? String(field.value)
														: undefined
												}
												onValueChange={(value) => field.onChange(Number(value))}
												disabled={hasMissingClients}
											>
												<SelectTrigger id="clientId">
													<SelectValue placeholder="Select client" />
												</SelectTrigger>
												<SelectContent>
													{activeClients.map((client) => (
														<SelectItem
															key={client.id}
															value={String(client.id)}
														>
															{client.displayName || client.fullname} (
															{client.accountNo})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									{errors.clientId && (
										<p className="text-sm text-destructive">
											{errors.clientId.message}
										</p>
									)}
									{hasMissingClients && (
										<Alert variant="warning">
											<AlertTitle>No clients available</AlertTitle>
											<AlertDescription>
												Onboard clients before booking loans.
											</AlertDescription>
										</Alert>
									)}
								</div>

								<div className="space-y-2">
									<Label htmlFor="productId">
										Loan Product <span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="productId"
										rules={{ required: "Loan product is required" }}
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined && field.value !== null
														? String(field.value)
														: undefined
												}
												onValueChange={(value) => field.onChange(Number(value))}
												disabled={hasMissingProducts}
											>
												<SelectTrigger id="productId">
													<SelectValue placeholder="Select loan product" />
												</SelectTrigger>
												<SelectContent>
													{loanProducts.map((product) => (
														<SelectItem
															key={product.id}
															value={String(product.id)}
														>
															{product.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									{errors.productId && (
										<p className="text-sm text-destructive">
											{errors.productId.message}
										</p>
									)}
									{hasMissingProducts && (
										<Alert variant="warning">
											<AlertTitle>No loan products available</AlertTitle>
											<AlertDescription>
												Configure loan products before booking loans.
											</AlertDescription>
										</Alert>
									)}
								</div>

								{selectedProduct && (
									<div className="p-3 bg-muted/50 border text-sm space-y-1">
										<div className="font-medium">{selectedProduct.name}</div>
										<div className="text-muted-foreground">
											Principal: {formatCurrency(selectedProduct.minPrincipal)}{" "}
											- {formatCurrency(selectedProduct.maxPrincipal)}
										</div>
										<div className="text-muted-foreground">
											Interest: {selectedProduct.interestRatePerPeriod}% per{" "}
											{selectedProduct.repaymentFrequencyType?.value ||
												"period"}
										</div>
									</div>
								)}

								{loanTemplate && hasMissingTemplateOptions && (
									<Alert variant="warning">
										<AlertTitle>Missing loan template options</AlertTitle>
										<AlertDescription>
											Configure all required loan options before booking loans.
										</AlertDescription>
									</Alert>
								)}

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="loanOfficerId">Loan Officer</Label>
										<Controller
											control={control}
											name="loanOfficerId"
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
													disabled={!hasLoanOfficerOptions}
												>
													<SelectTrigger id="loanOfficerId">
														<SelectValue placeholder="Select loan officer" />
													</SelectTrigger>
													<SelectContent>
														{loanOfficerOptions
															.filter((option) => option.id)
															.map((option) => (
																<SelectItem
																	key={option.id}
																	value={String(option.id)}
																>
																	{option.displayName ||
																		`${option.firstname || ""} ${option.lastname || ""}`.trim() ||
																		"Unnamed"}
																</SelectItem>
															))}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.loanOfficerId && (
											<p className="text-sm text-destructive">
												{errors.loanOfficerId.message}
											</p>
										)}
										{!hasLoanOfficerOptions && (
											<p className="text-xs text-muted-foreground">
												No loan officer options configured.
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="loanPurposeId">Loan Purpose</Label>
										<Controller
											control={control}
											name="loanPurposeId"
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
													disabled={!hasLoanPurposeOptions}
												>
													<SelectTrigger id="loanPurposeId">
														<SelectValue placeholder="Select purpose" />
													</SelectTrigger>
													<SelectContent>
														{loanPurposeOptions
															.filter((option) => option.id)
															.map((option) => (
																<SelectItem
																	key={option.id}
																	value={String(option.id)}
																>
																	{option.value || option.name || "Unnamed"}
																</SelectItem>
															))}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.loanPurposeId && (
											<p className="text-sm text-destructive">
												{errors.loanPurposeId.message}
											</p>
										)}
										{!hasLoanPurposeOptions && (
											<p className="text-xs text-muted-foreground">
												No loan purpose options configured.
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="principal">
											Principal Amount{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Input
											id="principal"
											type="number"
											step="0.01"
											{...register("principal", {
												required: "Principal is required",
												valueAsNumber: true,
												min: {
													value: minPrincipal,
													message: `Minimum is ${minPrincipal}`,
												},
												max: maxPrincipal
													? {
															value: maxPrincipal,
															message: `Maximum is ${maxPrincipal}`,
														}
													: undefined,
											})}
											placeholder="Enter principal amount"
										/>
										{errors.principal && (
											<p className="text-sm text-destructive">
												{errors.principal.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="numberOfRepayments">
											Number of Repayments{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Input
											id="numberOfRepayments"
											type="number"
											{...register("numberOfRepayments", {
												required: "Number of repayments is required",
												valueAsNumber: true,
												min: {
													value: minRepayments,
													message: `Minimum is ${minRepayments}`,
												},
												max: maxRepayments
													? {
															value: maxRepayments,
															message: `Maximum is ${maxRepayments}`,
														}
													: undefined,
											})}
											placeholder="Enter number of repayments"
										/>
										{errors.numberOfRepayments && (
											<p className="text-sm text-destructive">
												{errors.numberOfRepayments.message}
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="interestRatePerPeriod">
											Interest Rate (%)
											{loanTemplate && (
												<span className="text-destructive"> *</span>
											)}
										</Label>
										<Input
											id="interestRatePerPeriod"
											type="number"
											step="0.01"
											{...register("interestRatePerPeriod", {
												required: loanTemplate
													? "Interest rate is required"
													: false,
												valueAsNumber: true,
											})}
											placeholder="Enter interest rate"
										/>
										{errors.interestRatePerPeriod && (
											<p className="text-sm text-destructive">
												{errors.interestRatePerPeriod.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="repaymentEvery">
											Repayment Every
											{loanTemplate && (
												<span className="text-destructive"> *</span>
											)}
										</Label>
										<div className="flex gap-2">
											<Input
												id="repaymentEvery"
												type="number"
												className="flex-1"
												{...register("repaymentEvery", {
													required: loanTemplate
														? "Repayment interval is required"
														: false,
													valueAsNumber: true,
												})}
												placeholder="1"
											/>
											<Controller
												control={control}
												name="repaymentFrequencyType"
												rules={{ required: "Repayment frequency is required" }}
												render={({ field }) => (
													<Select
														value={String(field.value || 2)}
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
														disabled={!hasRepaymentFrequencyOptions}
													>
														<SelectTrigger className="w-[140px]">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{repaymentFrequencyOptions
																.filter((option) => option.id !== undefined)
																.map((option) => (
																	<SelectItem
																		key={option.id}
																		value={String(option.id)}
																	>
																		{option.value || option.name || "Unknown"}
																	</SelectItem>
																))}
														</SelectContent>
													</Select>
												)}
											/>
										</div>
										{errors.repaymentFrequencyType && (
											<p className="text-sm text-destructive">
												{errors.repaymentFrequencyType.message}
											</p>
										)}
										{errors.repaymentEvery && (
											<p className="text-sm text-destructive">
												{errors.repaymentEvery.message}
											</p>
										)}
										{!hasRepaymentFrequencyOptions && (
											<p className="text-xs text-muted-foreground">
												No repayment frequency options configured.
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="loanTermFrequency">
											Loan Term <span className="text-destructive">*</span>
										</Label>
										<Input
											id="loanTermFrequency"
											type="number"
											{...register("loanTermFrequency", {
												required: "Loan term is required",
												valueAsNumber: true,
											})}
											placeholder="Enter loan term"
										/>
										{errors.loanTermFrequency && (
											<p className="text-sm text-destructive">
												{errors.loanTermFrequency.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="loanTermFrequencyType">
											Term Frequency <span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="loanTermFrequencyType"
											rules={{ required: "Term frequency is required" }}
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
													disabled={!hasTermFrequencyOptions}
												>
													<SelectTrigger id="loanTermFrequencyType">
														<SelectValue placeholder="Select term" />
													</SelectTrigger>
													<SelectContent>
														{termFrequencyOptions
															.filter((option) => option.id !== undefined)
															.map((option) => (
																<SelectItem
																	key={option.id}
																	value={String(option.id)}
																>
																	{option.value || option.name || "Unknown"}
																</SelectItem>
															))}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.loanTermFrequencyType && (
											<p className="text-sm text-destructive">
												{errors.loanTermFrequencyType.message}
											</p>
										)}
										{!hasTermFrequencyOptions && (
											<p className="text-xs text-muted-foreground">
												No loan term frequency options configured.
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="submittedOnDate">
											Submitted On <span className="text-destructive">*</span>
										</Label>
										<Input
											id="submittedOnDate"
											type="date"
											{...register("submittedOnDate", {
												required: "Submission date is required",
											})}
										/>
										{errors.submittedOnDate && (
											<p className="text-sm text-destructive">
												{errors.submittedOnDate.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="expectedDisbursementDate">
											Expected Disbursement{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Input
											id="expectedDisbursementDate"
											type="date"
											{...register("expectedDisbursementDate", {
												required: "Expected disbursement date is required",
											})}
										/>
										{errors.expectedDisbursementDate && (
											<p className="text-sm text-destructive">
												{errors.expectedDisbursementDate.message}
											</p>
										)}
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="externalId">External ID (Optional)</Label>
									<Input
										id="externalId"
										{...register("externalId")}
										placeholder="External reference ID"
									/>
								</div>

								{createMutation.isError && drawerMode === "create" && (
									<Alert variant="destructive">
										<AlertTitle>Submission failed</AlertTitle>
										<AlertDescription>
											{(createMutation.error as Error)?.message ||
												"Failed to book loan. Please try again."}
										</AlertDescription>
									</Alert>
								)}
								{updateMutation.isError && drawerMode === "edit" && (
									<Alert variant="destructive">
										<AlertTitle>Update failed</AlertTitle>
										<AlertDescription>
											{(updateMutation.error as Error)?.message ||
												"Failed to update loan. Please try again."}
										</AlertDescription>
									</Alert>
								)}

								<div className="flex items-center justify-end gap-2 pt-4">
									<Button
										type="button"
										variant="outline"
										onClick={() => handleDrawerClose(false)}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={disableSubmit}>
										{drawerMode === "edit"
											? updateMutation.isPending
												? "Saving..."
												: "Update Loan"
											: createMutation.isPending
												? "Submitting..."
												: "Book Loan"}
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
