"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { theme, resolvedTheme, setTheme } = useTheme();

	// Use resolvedTheme which is undefined during SSR and set on client
	// This prevents hydration mismatch without needing a mounted state
	const activeTheme = resolvedTheme ?? theme;
	const isDark = activeTheme === "dark";
	const isClient = resolvedTheme !== undefined;

	return (
		<Button
			type="button"
			variant="outline"
			size="icon"
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
			onClick={() => setTheme(isDark ? "light" : "dark")}
			className="bg-background/70"
		>
			{isClient ? (
				isDark ? (
					<Sun className="h-4 w-4" />
				) : (
					<Moon className="h-4 w-4" />
				)
			) : (
				<Sun className="h-4 w-4 opacity-0" />
			)}
		</Button>
	);
}
