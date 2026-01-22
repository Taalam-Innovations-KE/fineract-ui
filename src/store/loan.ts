"use client";

import { create } from "zustand";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated";

interface LoanState {
	currentLoan: GetLoansLoanIdResponse | null;
	setCurrentLoan: (loan: GetLoansLoanIdResponse | null) => void;
}

/**
 * Loan store for managing current loan details state
 */
export const useLoanStore = create<LoanState>((set) => ({
	currentLoan: null,
	setCurrentLoan: (loan: GetLoansLoanIdResponse | null) =>
		set({ currentLoan: loan }),
}));
