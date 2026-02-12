import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

// Inter - Modern fintech sans-serif across the application
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Taalam FinCore",
	description:
		"Modern financial core platform for banking and financial services management",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await auth();

	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.variable} antialiased font-sans`}>
				<AuthProvider session={session}>
					<ThemeProvider>
						<QueryProvider>
							{children}
							<Toaster richColors closeButton />
						</QueryProvider>
					</ThemeProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
