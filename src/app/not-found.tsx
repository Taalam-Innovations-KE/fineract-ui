"use client";

import { ArrowLeft, Home, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NotFound() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
		}
	};

	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
			{/* Animated background elements */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				{/* Floating circles with theme colors */}
				<div className="absolute -left-20 top-1/4 h-64 w-64 animate-float rounded-full bg-primary/10 blur-3xl" />
				<div
					className="absolute right-0 top-1/3 h-96 w-96 animate-float rounded-full bg-primary/5 blur-3xl"
					style={{ animationDelay: "2s" }}
				/>
				<div
					className="absolute bottom-1/4 left-1/3 h-80 w-80 animate-float rounded-full bg-accent/20 blur-3xl"
					style={{ animationDelay: "4s" }}
				/>

				{/* Grid pattern overlay */}
				<div
					className="absolute inset-0 opacity-[0.02]"
					style={{
						backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px),
                                      linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
						backgroundSize: "50px 50px",
					}}
				/>
			</div>

			{/* Main content */}
			<div className="relative z-10 mx-auto max-w-4xl text-center">
				{/* Large animated 404 */}
				<div className="mb-8 space-y-4">
					<h1 className="animate-fade-in text-[clamp(6rem,20vw,12rem)] font-bold leading-none tracking-tighter text-foreground/5">
						404
					</h1>

					{/* Overlaid content */}
					<div className="relative -mt-32 space-y-6">
						{/* Icon/Illustration */}
						<div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 backdrop-blur-sm">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="h-12 w-12 text-primary"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M16 16s-1.5-2-4-2-4 2-4 2" />
								<line x1="9" y1="9" x2="9.01" y2="9" />
								<line x1="15" y1="9" x2="15.01" y2="9" />
							</svg>
						</div>

						<div className="space-y-2">
							<h2 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
								Page Not Found
							</h2>
							<p className="mx-auto max-w-md text-lg text-muted-foreground">
								The page you're looking for seems to have wandered off. It might
								have been moved or doesn't exist anymore.
							</p>
						</div>
					</div>
				</div>

				{/* Search box */}
				<div className="mb-8">
					<form onSubmit={handleSearch} className="mx-auto flex max-w-md gap-2">
						<div className="relative flex-1">
							<Input
								type="text"
								placeholder="Search Taalam FinCore..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="h-12 pl-10"
							/>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground"
							>
								<circle cx="11" cy="11" r="8" />
								<path d="m21 21-4.3-4.3" />
							</svg>
						</div>
						<Button type="submit" size="lg" className="h-12">
							<Search className="w-4 h-4 mr-2" />
							Search
						</Button>
					</form>
				</div>

				{/* Action buttons */}
				<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button
						size="lg"
						onClick={() => router.back()}
						variant="outline"
						className="min-w-[160px]"
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Go Back
					</Button>

					<Link href="/config">
						<Button size="lg" className="min-w-[160px]">
							<Home className="w-4 h-4 mr-2" />
							Go Home
						</Button>
					</Link>
				</div>

				{/* Helpful links */}
				<div className="mt-12 border-t border-border pt-8">
					<p className="mb-4 text-sm text-muted-foreground">
						Here are some helpful links instead:
					</p>
					<div className="flex flex-wrap justify-center gap-4 text-sm">
						<Link href="/config" className="text-primary hover:underline">
							Dashboard
						</Link>
						<span className="text-muted-foreground">•</span>
						<Link
							href="/config/organisation/offices"
							className="text-primary hover:underline"
						>
							Offices
						</Link>
						<span className="text-muted-foreground">•</span>
						<Link
							href="/config/organisation/staff"
							className="text-primary hover:underline"
						>
							Staff
						</Link>
						<span className="text-muted-foreground">•</span>
						<Link
							href="/config/products/loans"
							className="text-primary hover:underline"
						>
							Products
						</Link>
						<span className="text-muted-foreground">•</span>
						<Link
							href="/config/operations/cob"
							className="text-primary hover:underline"
						>
							Operations
						</Link>
					</div>
				</div>

				{/* Footer note */}
				<div className="mt-8">
					<p className="text-xs text-muted-foreground">
						Error Code: 404 | If this problem persists, please contact support
					</p>
				</div>
			</div>
		</div>
	);
}
