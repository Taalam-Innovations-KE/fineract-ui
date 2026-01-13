import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import Image from "next/image";

export default async function SignInPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
	const resolvedSearchParams = await searchParams;
	const callbackUrl = resolvedSearchParams?.callbackUrl || "/config";

	return (
		<div className="flex h-screen overflow-hidden">
			{/* Left Side - Sign In Form */}
			<div className="flex h-full w-full flex-col justify-center overflow-y-auto px-8 lg:w-1/2 lg:px-16">
				<div className="mx-auto w-full max-w-md space-y-8">
					{/* Logo/Brand */}
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="h-6 w-6 text-primary-foreground"
								>
									<path d="M3 3v18h18" />
									<path d="m19 9-5 5-4-4-3 3" />
								</svg>
							</div>
							<h1 className="text-2xl font-bold text-foreground">
								Taalam FinCore
							</h1>
						</div>
						<h2 className="text-3xl font-bold text-foreground">
							Sign Into Your Account
						</h2>
					</div>

					{resolvedSearchParams?.error && (
						<div className="rounded-sm bg-destructive/10 p-3 text-sm text-destructive">
							Authentication failed. Please check your credentials.
						</div>
					)}

					{/* Credentials Form */}
					<form
						action={async (formData: FormData) => {
							"use server";
							const username = formData.get("username");
							const password = formData.get("password");
							const tenantId = formData.get("tenantId") || "default";

							await signIn("credentials", {
								username,
								password,
								tenantId,
								redirectTo: callbackUrl,
							});
						}}
						className="space-y-6"
					>
						<div className="space-y-4">
							{/* Username */}
							<div className="space-y-2">
								<Label htmlFor="username" className="text-sm font-medium">
									Username
								</Label>
								<div className="relative">
									<Input
										id="username"
										name="username"
										type="text"
										placeholder="Enter your username"
										required
										className="pl-10"
									/>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="absolute left-3 top-3 h-5 w-5 text-muted-foreground"
									>
										<path d="M20 21a8 8 0 0 0-16 0" />
										<circle cx="12" cy="7" r="4" />
									</svg>
								</div>
							</div>

							{/* Password */}
							<div className="space-y-2">
								<Label htmlFor="password" className="text-sm font-medium">
									Password
								</Label>
								<div className="relative">
									<Input
										id="password"
										name="password"
										type="password"
										placeholder="Enter your password"
										required
										className="pl-10"
									/>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="absolute left-3 top-3 h-5 w-5 text-muted-foreground"
									>
										<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
										<path d="M7 11V7a5 5 0 0 1 10 0v4" />
									</svg>
								</div>
							</div>

							{/* Tenant ID */}
							<div className="space-y-2">
								<Label htmlFor="tenantId" className="text-sm font-medium">
									Tenant ID
								</Label>
								<Input
									id="tenantId"
									name="tenantId"
									type="text"
									placeholder="default"
									defaultValue="default"
								/>
							</div>
						</div>

						{/* Remember Me & Forgot Password */}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2">
								<Checkbox id="remember" disabled />
								<label
									htmlFor="remember"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Remember me
								</label>
							</div>
							<Link
								href="/auth/forgot-password"
								className="text-sm font-medium text-primary hover:underline"
							>
								Forgot Password
							</Link>
						</div>

						{/* Login Button */}
						<Button type="submit" className="w-full" size="lg">
							Sign in with Credentials
						</Button>
					</form>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<Separator />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">
								Or continue with
							</span>
						</div>
					</div>

					{/* Keycloak Form */}
					<form
						action={async () => {
							"use server";
							await signIn("keycloak", {
								redirectTo: callbackUrl,
							});
						}}
					>
						<Button
							type="submit"
							variant="outline"
							className="w-full"
							size="lg"
						>
							Sign in with Keycloak
						</Button>
					</form>

					{/* Register Link */}
					<div className="text-center text-sm">
						<span className="text-muted-foreground">
							Don't have an account?{" "}
						</span>
						<Link
							href="/auth/register"
							className="font-medium text-primary hover:underline"
						>
							Register here
						</Link>
					</div>
				</div>
			</div>

			{/* Right Side - Illustration */}
			<div className="relative hidden h-full bg-primary lg:block lg:w-1/2">
				<Image
					src="/login-illustration.svg"
					alt="Taalam FinCore - Financial Management"
					fill
					className="object-cover"
					sizes="(min-width: 1024px) 50vw, 100vw"
					priority
				/>
			</div>
		</div>
	);
}
