import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit Dashboard",
};

export default function CreditPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Credit dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live view of the loan book, pipeline, and collections.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Pipeline</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Applications queued, pending approvals, and loans awaiting disbursal.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Portfolio quality</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            PAR cards, aging buckets, and NPA balances from arrears data.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Collections worklists</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Today&apos;s due installments and overdue repayments with quick actions.
          </p>
        </section>
      </div>
    </div>
  );
}

