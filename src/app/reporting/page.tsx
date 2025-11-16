import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reporting Dashboard",
};

export default function ReportingPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Reporting</h1>
        <p className="text-sm text-muted-foreground">
          Operational, risk, and financial reports with scheduling and exports.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Report catalog</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Browse all reports, grouped by category, with user favorites.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Execution &amp; exports</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Parameter-driven execution and table/Pentaho outputs with export options.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Scheduled reports</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage report mailing jobs, schedules, and delivery status.
          </p>
        </section>
      </div>
    </div>
  );
}

