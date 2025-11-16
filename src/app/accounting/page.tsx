import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accounting Dashboard",
};

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Accounting dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Branch-level and consolidated GL views, trial balances, and P&amp;L.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">GL snapshot</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Assets, liabilities, and equity for the current business date.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Trial balance &amp; closures</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Trial balance grid and GL closure status by branch.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Journal &amp; reconciliation</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Recent journal entries and suspense-account reconciliation tools.
          </p>
        </section>
      </div>
    </div>
  );
}

