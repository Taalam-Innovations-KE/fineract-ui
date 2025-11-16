import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compliance & Risk",
};

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Compliance &amp; risk</h1>
        <p className="text-sm text-muted-foreground">
          Monitor KYC, delinquency, NPA, and high-risk operations.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">KYC &amp; identifiers</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Completion rates, exceptions for missing/expired IDs, and KYC datatables.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Delinquency &amp; NPA</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            PAR, NPA balances, aging buckets, and watchlists for problem loans.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">High-risk actions &amp; audit</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Maker-checker queues, audit explorer, and security posture overview.
          </p>
        </section>
      </div>
    </div>
  );
}

