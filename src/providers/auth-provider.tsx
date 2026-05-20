"use client";

import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

interface AuthProviderProps {
	children: React.ReactNode;
	session?: Session | null;
}

function SessionSync() {
	const pathname = usePathname();
	const { update } = useSession();
	const lastSyncedPath = useRef<string | null>(null);

	useEffect(() => {
		if (!pathname || lastSyncedPath.current === pathname) {
			return;
		}

		lastSyncedPath.current = pathname;
		void update();
	}, [pathname, update]);

	return null;
}

export function AuthProvider({ children, session = null }: AuthProviderProps) {
	return (
		<SessionProvider refetchOnWindowFocus session={session}>
			<SessionSync />
			{children}
		</SessionProvider>
	);
}
