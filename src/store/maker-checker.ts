"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface GlobalConfig {
	enabled: boolean;
}

interface Permission {
	code: string;
	grouping: string;
	selected: boolean;
}

interface MakerCheckerEntry {
	auditId: number;
	makerId: number;
	checkerId?: number;
	madeOnDate: string;
	processingResult: string;
	resourceId: string;
	entityName: string;
	commandAsJson?: string;
}

interface MakerCheckerState {
	globalConfig: GlobalConfig | null;
	permissions: Permission[];
	inbox: MakerCheckerEntry[];
	setGlobalConfig: (config: GlobalConfig) => void;
	setPermissions: (perms: Permission[]) => void;
	setInbox: (inbox: MakerCheckerEntry[]) => void;
	updatePermission: (code: string, selected: boolean) => void;
}

/**
 * Maker Checker store for managing configuration and approvals
 * Persisted for global config and permissions
 */
export const useMakerCheckerStore = create<MakerCheckerState>()(
	persist(
		(set, get) => ({
			globalConfig: null,
			permissions: [],
			inbox: [],
			setGlobalConfig: (config: GlobalConfig) => set({ globalConfig: config }),
			setPermissions: (perms: Permission[]) => set({ permissions: perms }),
			setInbox: (inbox: MakerCheckerEntry[]) => set({ inbox }),
			updatePermission: (code: string, selected: boolean) => {
				const perms = get().permissions.map((p) =>
					p.code === code ? { ...p, selected } : p,
				);
				set({ permissions: perms });
			},
		}),
		{
			name: "maker-checker-storage",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				globalConfig: state.globalConfig,
				permissions: state.permissions,
			}),
		},
	),
);
