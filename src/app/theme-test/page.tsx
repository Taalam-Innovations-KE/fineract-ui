export default function ThemeTest() {
	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-7xl space-y-12">
				{/* Header */}
				<div className="space-y-2">
					<h1 className="text-4xl font-bold text-foreground">
						Fineract Banking UI Theme
					</h1>
					<p className="text-lg text-muted-foreground">
						Professional color scheme for financial applications
					</p>
				</div>

				{/* Color Swatches */}
				<section className="space-y-6">
					<h2 className="text-2xl font-semibold text-foreground">
						Color Palette
					</h2>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{/* Primary */}
						<div className="space-y-3">
							<div className="h-24 rounded-lg bg-primary flex items-center justify-center">
								<span className="text-primary-foreground font-semibold">
									Primary
								</span>
							</div>
							<p className="text-sm text-muted-foreground">
								Brand color for main actions and trust
							</p>
						</div>

						{/* Success */}
						<div className="space-y-3">
							<div className="h-24 rounded-lg bg-success flex items-center justify-center">
								<span className="text-success-foreground font-semibold">
									Success
								</span>
							</div>
							<p className="text-sm text-muted-foreground">
								Positive states and confirmations
							</p>
						</div>

						{/* Warning */}
						<div className="space-y-3">
							<div className="h-24 rounded-lg bg-warning flex items-center justify-center">
								<span className="text-warning-foreground font-semibold">
									Warning
								</span>
							</div>
							<p className="text-sm text-muted-foreground">
								Pending states and cautions
							</p>
						</div>

						{/* Destructive */}
						<div className="space-y-3">
							<div className="h-24 rounded-lg bg-destructive flex items-center justify-center">
								<span className="text-destructive-foreground font-semibold">
									Destructive
								</span>
							</div>
							<p className="text-sm text-muted-foreground">
								Errors and negative actions
							</p>
						</div>

						{/* Accent */}
						<div className="space-y-3">
							<div className="h-24 rounded-lg bg-accent flex items-center justify-center">
								<span className="text-accent-foreground font-semibold">
									Accent
								</span>
							</div>
							<p className="text-sm text-muted-foreground">
								Information and secondary actions
							</p>
						</div>

						{/* Muted */}
						<div className="space-y-3">
							<div className="h-24 rounded-lg bg-muted flex items-center justify-center border border-border">
								<span className="text-muted-foreground font-semibold">
									Muted
								</span>
							</div>
							<p className="text-sm text-muted-foreground">
								Subtle backgrounds
							</p>
						</div>
					</div>
				</section>

				{/* Cards */}
				<section className="space-y-6">
					<h2 className="text-2xl font-semibold text-foreground">
						Card Surfaces
					</h2>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						<div className="rounded-lg border border-border bg-card p-6 space-y-2">
							<h3 className="font-semibold text-card-foreground">
								Account Balance
							</h3>
							<p className="text-3xl font-bold tabular-nums">$42,891.50</p>
							<p className="text-sm text-muted-foreground">Available balance</p>
						</div>

						<div className="rounded-lg border border-border bg-card p-6 space-y-2">
							<h3 className="font-semibold text-card-foreground">
								Monthly Income
							</h3>
							<p className="text-3xl font-bold tabular-nums text-success">
								+$5,234.00
							</p>
							<p className="text-sm text-muted-foreground">This month</p>
						</div>

						<div className="rounded-lg border border-border bg-card p-6 space-y-2">
							<h3 className="font-semibold text-card-foreground">
								Outstanding Loan
							</h3>
							<p className="text-3xl font-bold tabular-nums text-destructive">
								-$12,450.00
							</p>
							<p className="text-sm text-muted-foreground">Remaining balance</p>
						</div>
					</div>
				</section>

				{/* Buttons */}
				<section className="space-y-6">
					<h2 className="text-2xl font-semibold text-foreground">Buttons</h2>

					<div className="flex flex-wrap gap-4">
						<button className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
							Primary Button
						</button>

						<button className="rounded-lg bg-secondary px-6 py-3 font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80">
							Secondary Button
						</button>

						<button className="rounded-lg border border-border bg-background px-6 py-3 font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
							Outline Button
						</button>

						<button className="rounded-lg bg-destructive px-6 py-3 font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90">
							Destructive Button
						</button>

						<button className="rounded-lg bg-success px-6 py-3 font-semibold text-success-foreground transition-colors hover:bg-success/90">
							Success Button
						</button>

						<button className="rounded-lg bg-warning px-6 py-3 font-semibold text-warning-foreground transition-colors hover:bg-warning/90">
							Warning Button
						</button>
					</div>
				</section>

				{/* Badges */}
				<section className="space-y-6">
					<h2 className="text-2xl font-semibold text-foreground">
						Badges & Status
					</h2>

					<div className="flex flex-wrap gap-3">
						<span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
							Active
						</span>

						<span className="inline-flex items-center rounded-full bg-success px-3 py-1 text-sm font-semibold text-success-foreground">
							Approved
						</span>

						<span className="inline-flex items-center rounded-full bg-warning px-3 py-1 text-sm font-semibold text-warning-foreground">
							Pending
						</span>

						<span className="inline-flex items-center rounded-full bg-destructive px-3 py-1 text-sm font-semibold text-destructive-foreground">
							Rejected
						</span>

						<span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">
							Inactive
						</span>
					</div>
				</section>

				{/* Typography */}
				<section className="space-y-6">
					<h2 className="text-2xl font-semibold text-foreground">Typography</h2>

					<div className="space-y-4">
						<div>
							<h1 className="text-4xl font-bold text-foreground">Heading 1</h1>
							<p className="text-sm text-muted-foreground">4xl / Bold</p>
						</div>

						<div>
							<h2 className="text-3xl font-semibold text-foreground">
								Heading 2
							</h2>
							<p className="text-sm text-muted-foreground">3xl / Semibold</p>
						</div>

						<div>
							<h3 className="text-2xl font-semibold text-foreground">
								Heading 3
							</h3>
							<p className="text-sm text-muted-foreground">2xl / Semibold</p>
						</div>

						<div>
							<p className="text-base text-foreground">
								Body text - regular weight
							</p>
							<p className="text-sm text-muted-foreground">Base / Regular</p>
						</div>

						<div>
							<p className="text-sm text-muted-foreground">
								Small text - muted foreground
							</p>
							<p className="text-xs text-muted-foreground">Small / Regular</p>
						</div>
					</div>
				</section>

				{/* Financial Data */}
				<section className="space-y-6">
					<h2 className="text-2xl font-semibold text-foreground">
						Financial Data Display
					</h2>

					<div className="rounded-lg border border-border bg-card">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border">
									<th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
										Date
									</th>
									<th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
										Description
									</th>
									<th className="px-6 py-3 text-right text-sm font-semibold text-muted-foreground">
										Amount
									</th>
									<th className="px-6 py-3 text-center text-sm font-semibold text-muted-foreground">
										Status
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-border">
									<td className="px-6 py-4 text-sm text-foreground">
										Jan 10, 2026
									</td>
									<td className="px-6 py-4 text-sm text-foreground">
										Salary Deposit
									</td>
									<td className="px-6 py-4 text-right text-sm tabular-nums font-mono text-success font-semibold">
										+$5,000.00
									</td>
									<td className="px-6 py-4 text-center">
										<span className="inline-flex items-center rounded-full bg-success px-2 py-1 text-xs font-semibold text-success-foreground">
											Completed
										</span>
									</td>
								</tr>
								<tr className="border-b border-border">
									<td className="px-6 py-4 text-sm text-foreground">
										Jan 9, 2026
									</td>
									<td className="px-6 py-4 text-sm text-foreground">
										Loan Payment
									</td>
									<td className="px-6 py-4 text-right text-sm tabular-nums font-mono text-destructive font-semibold">
										-$450.00
									</td>
									<td className="px-6 py-4 text-center">
										<span className="inline-flex items-center rounded-full bg-success px-2 py-1 text-xs font-semibold text-success-foreground">
											Completed
										</span>
									</td>
								</tr>
								<tr className="border-b border-border">
									<td className="px-6 py-4 text-sm text-foreground">
										Jan 8, 2026
									</td>
									<td className="px-6 py-4 text-sm text-foreground">
										Transfer to Savings
									</td>
									<td className="px-6 py-4 text-right text-sm tabular-nums font-mono text-foreground">
										$1,000.00
									</td>
									<td className="px-6 py-4 text-center">
										<span className="inline-flex items-center rounded-full bg-warning px-2 py-1 text-xs font-semibold text-warning-foreground">
											Pending
										</span>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</section>

				{/* Dark Mode Toggle Note */}
				<section className="rounded-lg border border-border bg-muted p-6">
					<h3 className="font-semibold text-foreground mb-2">Dark Mode</h3>
					<p className="text-sm text-muted-foreground">
						To toggle dark mode, add or remove the{" "}
						<code className="rounded bg-background px-1 py-0.5 font-mono text-xs">
							dark
						</code>{" "}
						class from the{" "}
						<code className="rounded bg-background px-1 py-0.5 font-mono text-xs">
							html
						</code>{" "}
						element. The theme automatically adjusts all colors for optimal
						visibility and reduced eye strain.
					</p>
				</section>
			</div>
		</div>
	);
}
