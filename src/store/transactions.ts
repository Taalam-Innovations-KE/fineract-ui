import { create } from "zustand";
import { persist } from "zustand/middleware";

type TransactionStatus = "pending" | "approved" | "rejected";

interface TransactionStore {
	statuses: Record<string, TransactionStatus>; // transactionId -> status
	setStatus: (transactionId: string, status: TransactionStatus) => void;
	getStatus: (transactionId: string) => TransactionStatus;
}

export const useTransactionStore = create<TransactionStore>()(
	persist(
		(set, get) => ({
			statuses: {},
			setStatus: (transactionId, status) =>
				set((state) => ({
					statuses: { ...state.statuses, [transactionId]: status },
				})),
			getStatus: (transactionId) => get().statuses[transactionId] || "pending",
		}),
		{
			name: "transaction-statuses",
		},
	),
);
