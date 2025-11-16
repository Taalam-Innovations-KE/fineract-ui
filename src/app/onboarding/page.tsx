import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Onboarding",
};

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Customer onboarding</h1>
        <p className="text-sm text-muted-foreground">
          Guide KYC officers and front office through capturing and validating client data.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Onboarding pipeline</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pending clients, required KYC datatables, and missing fields.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Client 360°</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Consolidated profile across identifiers, addresses, groups, and accounts.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Actions &amp; flows</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Create/update client flows and hooks for external KYC checks.
          </p>
        </section>
      </div>
    </div>
  );
}

