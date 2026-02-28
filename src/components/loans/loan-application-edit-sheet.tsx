"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isValid, parse, parseISO } from "date-fns";
import { useMemo } from "react";
import {
	type Client,
	type LoanApplicationSubmitPayload,
	LoanBookingWizard,
	type LoanProduct,
} from "@/components/loans/loan-booking-wizard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateStringToFormat } from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetClientsResponse,
	GetLoanProductsResponse,
	GetLoansLoanIdResponse,
	PostLoansRequest,
} from "@/lib/fineract/generated/types.gen";
import type { LoanApplicationInput } from "@/lib/schemas/loan-application";
import { useTenantStore } from "@/store/tenant";

interface LoanApplicationEditSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	loan: GetLoansLoanIdResponse;
	onSuccess?: () => void;
}

function hasNumberId<T extends { id?: number }>(
	item: T,
): item is T & { id: number } {
	return typeof item.id === "number";
}

function getToday(): string {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function toDateInputValue(value: unknown): string | undefined {
	if (!value) return undefined;

	if (Array.isArray(value) && value.length >= 3) {
		const [year, month, day] = value;
		if (
			typeof year === "number" &&
			typeof month === "number" &&
			typeof day === "number"
		) {
			return format(new Date(year, month - 1, day), "yyyy-MM-dd");
		}
	}

	if (typeof value !== "string") return undefined;

	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return value;
	}

	const parsedFineract = parse(value, "dd MMMM yyyy", new Date());
	if (isValid(parsedFineract)) {
		return format(parsedFineract, "yyyy-MM-dd");
	}

	const parsedIso = parseISO(value);
	if (isValid(parsedIso)) {
		return format(parsedIso, "yyyy-MM-dd");
	}

	const parsedNative = new Date(value);
	if (isValid(parsedNative)) {
		return format(parsedNative, "yyyy-MM-dd");
	}

	return undefined;
}

function mapLoanToInitialValues(
	loan: GetLoansLoanIdResponse,
): Partial<LoanApplicationInput> {
	const dynamicLoan = loan as Record<string, unknown>;
	const submittedOnDate =
		toDateInputValue(loan.timeline?.submittedOnDate) || getToday();
	const expectedDisbursementDate =
		toDateInputValue(loan.timeline?.expectedDisbursementDate) ||
		submittedOnDate;
	const repaymentsStartingFromDate = toDateInputValue(
		dynamicLoan.repaymentsStartingFromDate,
	);
	const interestChargedFromDate = toDateInputValue(
		dynamicLoan.interestChargedFromDate,
	);

	return {
		clientId: loan.clientId,
		productId: loan.loanProductId,
		principal: loan.principal,
		numberOfRepayments: loan.numberOfRepayments,
		interestRatePerPeriod: loan.interestRatePerPeriod,
		loanTermFrequency: loan.termFrequency || loan.numberOfRepayments,
		loanTermFrequencyType:
			loan.termPeriodFrequencyType?.id || loan.repaymentFrequencyType?.id || 2,
		repaymentEvery: loan.repaymentEvery || 1,
		repaymentFrequencyType: loan.repaymentFrequencyType?.id || 2,
		submittedOnDate,
		expectedDisbursementDate,
		repaymentsStartingFromDate,
		interestChargedFromDate,
		externalId: loan.externalId || "",
		graceOnPrincipalPayment: loan.graceOnPrincipalPayment,
		graceOnInterestPayment: loan.graceOnInterestPayment,
		graceOnInterestCharged: loan.graceOnInterestCharged,
		graceOnArrearsAgeing: loan.graceOnArrearsAgeing,
		enableDownPayment: loan.enableDownPayment,
		disbursedAmountPercentageForDownPayment:
			loan.disbursedAmountPercentageForDownPayment,
		enableAutoRepaymentForDownPayment: loan.enableAutoRepaymentForDownPayment,
		maxOutstandingLoanBalance: loan.summary?.maxOutstandingLoanBalance,
		isTopup:
			typeof dynamicLoan.isTopup === "boolean"
				? dynamicLoan.isTopup
				: undefined,
		loanIdToClose:
			typeof dynamicLoan.loanIdToClose === "number"
				? dynamicLoan.loanIdToClose
				: undefined,
		disbursementData:
			loan.disbursementDetails
				?.map((item) => ({
					principal: item.principal || 0,
					expectedDisbursementDate:
						toDateInputValue(item.expectedDisbursementDate) ||
						expectedDisbursementDate,
				}))
				.filter((item) => item.principal > 0) || [],
		charges:
			loan.charges
				?.map((charge) => ({
					chargeId: charge.chargeId || charge.id || 0,
					amount: charge.amount,
				}))
				.filter((charge) => charge.chargeId > 0) || [],
	};
}

function inferLoanType(
	loanType: GetLoansLoanIdResponse["loanType"],
): PostLoansRequest["loanType"] {
	const signature =
		`${loanType?.code || ""} ${loanType?.description || ""}`.toLowerCase();
	if (signature.includes("jlg")) return "jlg";
	if (signature.includes("group")) return "group";
	return "individual";
}

function toFineractDateValue(value: unknown): string | undefined {
	const dateInput = toDateInputValue(value);
	if (!dateInput) return undefined;
	return formatDateStringToFormat(dateInput, "dd MMMM yyyy");
}

function EditWizardSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between overflow-x-auto pb-2">
				{Array.from({ length: 7 }).map((_, index) => (
					<div key={index} className="flex flex-1 items-center min-w-0">
						<div className="flex flex-col items-center">
							<Skeleton className="h-10 w-10 rounded-full" />
							<Skeleton className="mt-2 h-3 w-16" />
						</div>
						{index < 6 && <Skeleton className="mx-2 h-[2px] min-w-4 flex-1" />}
					</div>
				))}
			</div>
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-28 w-full" />
		</div>
	);
}

export function LoanApplicationEditSheet({
	open,
	onOpenChange,
	loan,
	onSuccess,
}: LoanApplicationEditSheetProps) {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const loanForEditQuery = useQuery({
		queryKey: ["loan-edit", tenantId, loan.id],
		queryFn: async () => {
			if (!loan.id) return loan;
			const response = await fetch(
				`${BFF_ROUTES.loans}/${loan.id}?associations=all`,
				{
					headers: { "fineract-platform-tenantid": tenantId },
				},
			);
			if (!response.ok) {
				throw new Error("Failed to fetch full loan details");
			}
			return response.json() as Promise<GetLoansLoanIdResponse>;
		},
		enabled: open && Boolean(tenantId && loan.id),
		staleTime: 60 * 1000,
		refetchOnWindowFocus: false,
	});

	const loanForEdit = loanForEditQuery.data || loan;
	const initialValues = useMemo(
		() => mapLoanToInitialValues(loanForEdit),
		[loanForEdit],
	);
	const submissionDefaults = useMemo(
		() => ({
			loanType: inferLoanType(loanForEdit.loanType),
			interestType: loanForEdit.interestType?.id,
			interestCalculationPeriodType:
				loanForEdit.interestCalculationPeriodType?.id,
			amortizationType: loanForEdit.amortizationType?.id,
			transactionProcessingStrategyCode:
				loanForEdit.transactionProcessingStrategyCode,
		}),
		[loanForEdit],
	);
	const basePayload = useMemo<Partial<LoanApplicationSubmitPayload>>(() => {
		const dynamicLoan = loanForEdit as Record<string, unknown>;
		return {
			clientId: loanForEdit.clientId,
			productId: loanForEdit.loanProductId,
			principal: loanForEdit.principal,
			numberOfRepayments: loanForEdit.numberOfRepayments,
			interestRatePerPeriod: loanForEdit.interestRatePerPeriod,
			loanTermFrequency:
				loanForEdit.termFrequency || loanForEdit.numberOfRepayments,
			loanTermFrequencyType:
				loanForEdit.termPeriodFrequencyType?.id ||
				loanForEdit.repaymentFrequencyType?.id,
			repaymentEvery: loanForEdit.repaymentEvery,
			repaymentFrequencyType: loanForEdit.repaymentFrequencyType?.id,
			submittedOnDate: toFineractDateValue(
				loanForEdit.timeline?.submittedOnDate,
			),
			expectedDisbursementDate: toFineractDateValue(
				loanForEdit.timeline?.expectedDisbursementDate,
			),
			repaymentsStartingFromDate: toFineractDateValue(
				dynamicLoan.repaymentsStartingFromDate,
			),
			externalId: loanForEdit.externalId,
			graceOnPrincipalPayment: loanForEdit.graceOnPrincipalPayment,
			graceOnInterestPayment: loanForEdit.graceOnInterestPayment,
			graceOnInterestCharged: loanForEdit.graceOnInterestCharged,
			graceOnArrearsAgeing: loanForEdit.graceOnArrearsAgeing,
			enableDownPayment: loanForEdit.enableDownPayment,
			disbursedAmountPercentageForDownPayment:
				loanForEdit.disbursedAmountPercentageForDownPayment,
			enableAutoRepaymentForDownPayment:
				loanForEdit.enableAutoRepaymentForDownPayment,
			maxOutstandingLoanBalance: loanForEdit.summary?.maxOutstandingLoanBalance,
			isTopup:
				typeof dynamicLoan.isTopup === "boolean"
					? dynamicLoan.isTopup
					: undefined,
			loanIdToClose:
				typeof dynamicLoan.loanIdToClose === "number"
					? dynamicLoan.loanIdToClose
					: undefined,
			disbursementData:
				loanForEdit.disbursementDetails
					?.map((item) => ({
						principal: item.principal,
						expectedDisbursementDate: toFineractDateValue(
							item.expectedDisbursementDate,
						),
					}))
					.filter(
						(item) =>
							typeof item.principal === "number" &&
							Boolean(item.expectedDisbursementDate),
					) || [],
			charges:
				loanForEdit.charges
					?.map((charge) => ({
						chargeId: charge.chargeId || charge.id,
						amount: charge.amount,
					}))
					.filter((charge) => typeof charge.chargeId === "number") || [],
			loanType: inferLoanType(loanForEdit.loanType),
			interestType: loanForEdit.interestType?.id,
			interestCalculationPeriodType:
				loanForEdit.interestCalculationPeriodType?.id,
			amortizationType: loanForEdit.amortizationType?.id,
			transactionProcessingStrategyCode:
				loanForEdit.transactionProcessingStrategyCode,
			dateFormat: "dd MMMM yyyy",
			locale: "en",
		};
	}, [loanForEdit]);

	const clientsQuery = useQuery({
		queryKey: ["loan-edit-clients", tenantId],
		queryFn: async () => {
			const response = await fetch(BFF_ROUTES.clients, {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) {
				throw new Error("Failed to fetch clients");
			}
			return response.json() as Promise<GetClientsResponse>;
		},
		enabled: open && Boolean(tenantId),
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});

	const productsQuery = useQuery({
		queryKey: ["loan-edit-products", tenantId],
		queryFn: async () => {
			const response = await fetch(BFF_ROUTES.loanProducts, {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) {
				throw new Error("Failed to fetch loan products");
			}
			return response.json() as Promise<GetLoanProductsResponse[]>;
		},
		enabled: open && Boolean(tenantId),
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});

	const updateMutation = useMutation({
		mutationFn: async (payload: LoanApplicationSubmitPayload) => {
			if (!loanForEdit.id) {
				throw new Error("Loan ID is missing");
			}

			const response = await fetch(`${BFF_ROUTES.loans}/${loanForEdit.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"fineract-platform-tenantid": tenantId,
				},
				body: JSON.stringify(payload),
			});

			const data = await response.json().catch(() => null);
			if (!response.ok) {
				throw (
					data || {
						message: "Failed to update loan application",
						status: response.status,
					}
				);
			}

			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["loan", tenantId] });
			queryClient.invalidateQueries({ queryKey: ["loans", tenantId] });
			onSuccess?.();
			onOpenChange(false);
		},
	});

	const clients: Client[] = useMemo(
		() => (clientsQuery.data?.pageItems || []).filter(hasNumberId),
		[clientsQuery.data],
	);

	const products: LoanProduct[] = useMemo(
		() => (productsQuery.data || []).filter(hasNumberId),
		[productsQuery.data],
	);

	const lookupError =
		loanForEditQuery.error || clientsQuery.error || productsQuery.error;
	const isLoadingLookups =
		loanForEditQuery.isLoading ||
		clientsQuery.isLoading ||
		productsQuery.isLoading;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full overflow-y-auto sm:max-w-5xl"
			>
				<SheetHeader>
					<SheetTitle>Edit Loan Application</SheetTitle>
					<SheetDescription>
						Update this loan application before it is approved and disbursed.
					</SheetDescription>
				</SheetHeader>

				<div className="mt-6">
					{isLoadingLookups && <EditWizardSkeleton />}

					{lookupError && (
						<Alert variant="destructive">
							<AlertTitle>Unable to load loan edit options</AlertTitle>
							<AlertDescription>
								{lookupError.message || "Please try again."}
							</AlertDescription>
						</Alert>
					)}

					{!isLoadingLookups && !lookupError && (
						<LoanBookingWizard
							clients={clients}
							products={products}
							isOpen={open}
							mode="edit"
							loanId={loanForEdit.id}
							initialValues={initialValues}
							lockClientProductSelection
							submissionDefaults={submissionDefaults}
							basePayload={basePayload}
							onSubmit={(payload) => updateMutation.mutateAsync(payload)}
							onCancel={() => onOpenChange(false)}
						/>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
