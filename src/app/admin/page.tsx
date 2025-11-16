import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Administration",
};

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">System administration</h1>
        <p className="text-sm text-muted-foreground">
          Control panel for users, roles, configuration, jobs, and system health.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">User &amp; role management</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage users, roles, and permissions mapped to Fineract&apos;s role model.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Configuration &amp; codes</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Edit configuration keys and reference data like codes and code values.
          </p>
        </section>
        <section className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Jobs, COB, and health</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Job scheduler, COB controls, and environment health indicators.
          </p>
        </section>
      </div>
    </div>
  );
}

