"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { theme, resolvedTheme, setTheme } = useTheme();
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const activeTheme = resolvedTheme ?? theme;
	const isDark = activeTheme === "dark";

	return (
		<Button
			type="button"
			variant="outline"
			size="icon"
			aria-label={
				isMounted
					? isDark
						? "Switch to light mode"
						: "Switch to dark mode"
					: "Switch theme"
			}
			onClick={() => setTheme(isDark ? "light" : "dark")}
			className="bg-background/70"
		>
			{isMounted ? (
				isDark ? (
					<Sun className="h-4 w-4" />
				) : (
					<Moon className="h-4 w-4" />
				)
			) : (
				<span className="h-4 w-4 rounded-full bg-muted/70" aria-hidden="true" />
			)}
		</Button>
	);
}
