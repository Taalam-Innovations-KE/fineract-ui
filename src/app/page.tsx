import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Fineract employee console</h1>
        <p className="text-sm text-muted-foreground">
          Choose a workspace to get started. Each dashboard is backed by Fineract
          APIs and the role/permission model.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Credit</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Loan applications, approvals, disbursals, arrears, and collections.
          </p>
          <Link
            href="/credit"
            className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
          >
            Open credit dashboard
          </Link>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Accounting</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            GL, trial balance, P&amp;L, and reconciliation tools.
          </p>
          <Link
            href="/accounting"
            className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
          >
            Open accounting dashboard
          </Link>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Onboarding &amp; reporting</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            KYC-driven onboarding and flexible reporting for teams.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-primary">
            <Link href="/onboarding" className="hover:underline">
              Open onboarding
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/reporting" className="hover:underline">
              Open reporting
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
