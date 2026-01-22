"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface GlobalConfig {
	enabled: boolean;
}

interface Permission {
	id: number;
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

interface SuperCheckerUser {
	id: number;
	username: string;
	displayName?: string;
	email?: string;
	isSuperChecker: boolean;
	officeName?: string;
}

interface MakerCheckerImpact {
	totalPermissions: number;
	enabledPermissions: number;
	totalUsers: number;
	superCheckerUsers: number;
	pendingApprovals: number;
}

interface MakerCheckerState {
	globalConfig: GlobalConfig | null;
	permissions: Permission[];
	inbox: MakerCheckerEntry[];
	superCheckerUsers: SuperCheckerUser[];
	impact: MakerCheckerImpact | null;
	setGlobalConfig: (config: GlobalConfig) => void;
	setPermissions: (perms: Permission[]) => void;
	setInbox: (inbox: MakerCheckerEntry[]) => void;
	setSuperCheckerUsers: (users: SuperCheckerUser[]) => void;
	setImpact: (impact: MakerCheckerImpact) => void;
	updatePermission: (code: string, selected: boolean) => void;
	updateSuperCheckerStatus: (userId: number, isSuperChecker: boolean) => void;
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
			superCheckerUsers: [],
			impact: null,
			setGlobalConfig: (config: GlobalConfig) => set({ globalConfig: config }),
			setPermissions: (perms: Permission[]) => set({ permissions: perms }),
			setInbox: (inbox: MakerCheckerEntry[]) => set({ inbox }),
			setSuperCheckerUsers: (users: SuperCheckerUser[]) =>
				set({ superCheckerUsers: users }),
			setImpact: (impact: MakerCheckerImpact) => set({ impact }),
			updatePermission: (code: string, selected: boolean) => {
				const perms = get().permissions.map((p) =>
					p.code === code ? { ...p, selected } : p,
				);
				set({ permissions: perms });
			},
			updatePermissionsBulk: (codes: string[], selected: boolean) => {
				const perms = get().permissions.map((p) =>
					codes.includes(p.code) ? { ...p, selected } : p,
				);
				set({ permissions: perms });
			},
			updateSuperCheckerStatus: (userId: number, isSuperChecker: boolean) => {
				const users = get().superCheckerUsers.map((user) =>
					user.id === userId ? { ...user, isSuperChecker } : user,
				);
				set({ superCheckerUsers: users });
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
