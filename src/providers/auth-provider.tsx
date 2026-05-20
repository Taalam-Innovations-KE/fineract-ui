"use client";

import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";

interface AuthProviderProps {
	children: React.ReactNode;
	session?: Session | null;
}

function SessionSync() {
	const pathname = usePathname();
	const { update } = useSession();

	useEffect(() => {
		if (!pathname) {
			return;
		}

		void update();
	}, [pathname, update]);

	return null;
}

export function AuthProvider({ children, session }: AuthProviderProps) {
	return (
		<SessionProvider refetchOnWindowFocus session={session}>
			<SessionSync />
			{children}
		</SessionProvider>
	);
}
