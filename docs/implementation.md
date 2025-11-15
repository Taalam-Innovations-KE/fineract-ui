# Employee Console Implementation Plan

This document breaks the envisioned Fineract employee UI into concrete, incremental tasks that we can implement in this Next.js + shadcn app.

## 1. Foundations & Infrastructure

- **F1 – Environment & API client**
  - Add base config for Fineract URL, tenant, and auth headers.
  - Implement a typed API client (e.g., `src/lib/fineractClient.ts`) with error handling and retry rules.
- **F2 – Auth & session**
  - Implement login/logout flow against Fineract auth (session or token based).
  - Store current user, roles, and permissions in a global store (e.g., React context or Zustand).
- **F3 – Role & permission checks**
  - Model permissions (e.g., `READ_LOAN`, `APPROVE_LOAN`) in TypeScript.
  - Build helpers/HOCs/hooks for guarding routes, modules, and actions based on permissions and maker‑checker flags.
- **F4 – Layout & navigation shell**
  - Implement the global layout with left sidebar and header (branch/tenant + COB date).
  - Scaffold top‑level routes: Dashboard, Credit, Accounting, Onboarding, Reporting, Compliance, Admin.
- **F5 – Global search**
  - Implement a “search everywhere” component that queries `/clients`, `/groups`, `/loans`, `/savings`.
  - Normalize and display results with type badges and deep links to detail views.
- **F6 – UI primitives**
  - Wrap shadcn components into shared primitives (Card, DataTable, Filters, Modals, Toasts).
  - Define standard loading, empty‑state, and error patterns.

## 2. Credit Dashboard (Loans & Collections)

- **C1 – Pipeline views**
  - Applications queued: list loans with status `SUBMITTED_AND_PENDING_APPROVAL` (`/loans?status=...`), filterable by product, officer, and office.
  - Pending approvals: show loans requiring `APPROVE_LOAN` / `_CHECKER` with quick links to `/loans/{id}/template?templateType=approval`.
  - Awaiting disbursal: list “approved, not disbursed” loans (align with “Loans Awaiting Disbursal” reports).
- **C2 – Portfolio quality & arrears**
  - Surface PAR cards using Portfolio at Risk/Aging reports and `m_loan_arrears_aging`.
  - Implement aging bucket cards (1–30, 31–60, 61–90, 90+) that deep‑link into filtered loan lists.
  - Show NPA counts/balances based on `m_loan.is_npa` and product `overdue_days_for_npa`.
- **C3 – Collections worklists**
  - Today’s due installments: list loans due today/next N days from COB outputs.
  - Overdue repayments: list loans with `pastDueDays > 0` from delinquency services.
  - Add quick actions for repayments and recovery payments (`/loans/{id}/transactions?command=repayment|recoverypayment`).
- **C4 – Loan detail view**
  - Tabs: Summary, Schedule, Transactions, Collateral, Arrears & Delinquency, COB History.
  - Wire to Loan APIs, `LoanScheduleData`, `/loans/{id}/collaterals`, arrears tables, and COB metadata.
  - Enforce maker‑checker on actions (e.g., write‑off, reschedule, charge‑off).

## 3. Accounting Dashboard

- **A1 – GL & branch snapshot**
  - Cards for total assets/liabilities/equity using `acc_gl_account` and `acc_gl_journal_entry`.
  - Branch selector filtering by `office_id`, including interbranch GL balances.
- **A2 – Trial balance & closures**
  - Trial balance grid backed by `m_trial_balance` with as‑of date picker.
  - GL closure status per branch (latest closure) with visual closed/open indicators.
- **A3 – P&L and balance sheet**
  - Launch seeded Balance Sheet, Income Statement, and Trial Balance reports with office/period filters.
  - KPI cards (Net Interest Income, Fee Income, LLP Expense) derived from the same data.
- **A4 – Journal & reconciliation tools**
  - Recent journal entries table (`/journalentries`) with filters and reversal actions subject to permissions and maker‑checker.
  - Suspense/reconciliation widgets for key GLs (configurable list of accounts).

## 4. Customer Onboarding Dashboard

- **O1 – Onboarding pipeline**
  - New applications: clients in pending status (`/clients?status=pending`) with missing KYC details highlighted.
  - KYC checklist: per client, show required datatables (e.g., `KYC_Checklist`) and identifiers `/clients/{id}/identifiers`.
  - Address completeness: flag missing mandatory addresses when `enable-address=true`.
- **O2 – Client 360° view**
  - Consolidate client attributes, identifiers, addresses, non‑person details, group memberships, and linked loans/savings.
  - Timeline of events from `m_portfolio_command_source` (created, activated, updated, closed).
- **O3 – Actions & flows**
  - Forms for create/update client with inline API‑driven validation messages.
  - Flows to capture/manage identifiers, constrained by Customer Identifier code values.
  - Hook integration points for external KYC/AML checks.

## 5. Reporting Dashboard

- **R1 – Report catalog & favorites**
  - Fetch report list from `/reports`, group by `reportCategory`, and allow starring favorites (user preference storage).
- **R2 – Report execution UI**
  - Auto‑generate parameter forms from stretchy report metadata.
  - For table reports, render `GenericResultsetData` in a pageable, filterable grid with CSV/XLS/PDF export.
  - For Pentaho reports, request and display/download PDFs.
- **R3 – Scheduled reports**
  - UI for `ReportMailingJob`: list jobs, status, last/next run, and last error.
  - Create/edit job flow with cron, parameters, recipients, and format.

## 6. Compliance & Risk Dashboard

- **CR1 – KYC & identifier monitoring**
  - Branch‑level KYC completion rates based on required identifiers and datatables.
  - Exception lists for missing/expired IDs or inconsistent KYC data (via custom reports).
- **CR2 – Delinquency & NPA**
  - PAR, NPA balances, and delinquency buckets using `m_loan_arrears_aging` and delinquency services.
  - Watchlists of loans with frequent rescheduling/repeat delinquencies.
- **CR3 – High‑risk actions & audit**
  - Queue of pending maker‑checker actions from `m_portfolio_command_source` for key operations.
  - Audit explorer filtered by user, entity, date, and command type.
  - Surface security posture: auth schemes, 2FA adoption, powerful roles.

## 7. System Administration Dashboard

- **S1 – User & role management**
  - CRUD for users (`/users`) and role assignments (`m_appuser_role`).
  - Role and permission management (`/roles`, `/permissions`, maker‑checker flags).
- **S2 – Configuration & reference data**
  - UI for key `c_configuration` settings with inline help.
  - Management of codes/code values (`/codes`) for collateral, loan purposes, identifiers, etc.
- **S3 – Jobs, COB, and health**
  - Job scheduler UI for `/jobs` (enable/disable, cron, run now, status).
  - Specialized COB panel for Loan COB and catch‑up endpoints (`/v1/loans/oldest-cob-closed`, `/catch-up`, `/is-catch-up-running`).
  - Environment/health tab consuming `/actuator/health` and exposing key metrics.

## 8. Security, Testing, and Quality

- **Q1 – Security & config hygiene**
  - Centralize sensitive config in environment variables and avoid client‑side secrets.
  - Implement secure logout, session timeout handling, and basic XSS/CSRF mitigations.
- **Q2 – Testing strategy**
  - Define minimal smoke tests for critical flows: login, global search, loan detail, report execution.
  - Add component tests for core UI primitives and dashboard widgets as the app evolves.
- **Q3 – Observability**
  - Add basic frontend logging/tracing hooks and error reporting.
  - Capture key UI events (e.g., approvals, disbursals) for auditability and UX tuning.

