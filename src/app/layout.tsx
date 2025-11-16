import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fineract Employee Console",
  description: "Internal banking console powered by Apache Fineract",
};

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/credit", label: "Credit" },
  { href: "/accounting", label: "Accounting" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/reporting", label: "Reporting" },
  { href: "/compliance", label: "Compliance & Risk" },
  { href: "/admin", label: "System Admin" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <div className="flex min-h-screen bg-background text-foreground">
            <aside className="hidden w-64 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">
                  FE
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    Fineract Employee Console
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Internal banking UI
                  </span>
                </div>
              </div>
              <nav className="flex flex-1 flex-col gap-1 text-sm">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 text-xs text-muted-foreground">
                <p>Tenant: —</p>
                <p>Branch: —</p>
              </div>
            </aside>
            <div className="flex min-h-screen flex-1 flex-col">
              <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    Apache Fineract Console
                  </span>
                  <span className="text-xs text-muted-foreground">
                    COB date: — • All data is internal-only
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden text-xs text-muted-foreground sm:block">
                    <span className="font-medium">Theme</span>
                  </div>
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 bg-background px-4 py-4 md:px-6 md:py-6">
                {children}
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
