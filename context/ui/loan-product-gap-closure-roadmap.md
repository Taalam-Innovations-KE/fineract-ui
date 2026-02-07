# Loan Product Gap-Closure Roadmap

Source: live `GET /v1/loanproducts/template` on `2026-02-07` (tenant `default`)

## Current Baseline

- Template exposes `83` top-level keys and advanced configuration groups.
- Current submit payload maps `44` fields of `PostLoanProductsRequest` (`136` fields total).
- Core product creation works, but advanced lifecycle controls are partially or not implemented.

## Delivery Strategy

### Slice 1 (implemented in this pass)

- Add schedule model support to wizard and payload:
  - `loanScheduleType` (`CUMULATIVE` / `PROGRESSIVE`)
  - `loanScheduleProcessingType` (`HORIZONTAL` / `VERTICAL`)
- Add borrower-cycle toggles to wizard and payload:
  - `includeInBorrowerCycle`
  - `useBorrowerCycle`
- Ensure edit form round-trips these fields from existing product data.

### Slice 2 (implemented in this pass)

- Multi-disbursement and tranche controls:
  - `multiDisburseLoan`, `maxTrancheCount`, `disallowExpectedDisbursements`
  - `allowApprovedDisbursedAmountsOverApplied`, `overApplied*`
  - `allowFullTermForTranche`, `syncExpectedWithDisbursementDate`

### Slice 3 (implemented in this pass)

- Interest recalculation detail block:
  - `interestRecalculationCompoundingMethod`
  - `recalculationCompoundingFrequency*`
  - `recalculationRestFrequency*`
  - `preClosureInterestCalculationStrategy`
  - `isArrearsBasedOnOriginalSchedule`, `disallowInterestCalculationOnPastDue`

### Slice 4 (implemented in this pass)

- Delinquency and repayment behavior enrichment:
  - `delinquencyBucketId`
  - `accountMovesOutOfNPAOnlyOnArrearsCompletion`
  - `graceOnPrincipalPayment`, `graceOnInterestPayment`
  - `principalThresholdForLastInstallment`
  - `repaymentStartDateType`

### Slice 5 (implemented in this pass)

- Advanced payment allocation / credit allocation:
  - `paymentAllocation`
  - `creditAllocation`
  - `supportedInterestRefundTypes`

### Slice 6 (implemented in this pass)

- Capitalized income and buy-down fee families:
  - `enableIncomeCapitalization`, `capitalizedIncome*`
  - `enableBuyDownFee`, `buyDownFee*`

### Slice 7 (implemented in this pass)

- Charge-off behavior and mappings:
  - `chargeOffBehaviour`
  - `writeOffReasonsToExpenseMappings`
  - `chargeOffReasonToExpenseAccountMappings`

### Slice 8 (implemented in this pass)

- Edit safety hardening:
  - Preserve unsupported/unknown fields during update (merge-with-existing strategy).
  - Prevent accidental loss of advanced backend configuration.

## Definition of Done (per slice)

- UI fields visible only when relevant (no clutter for basic flows).
- Zod schema + step validation updated.
- Payload builder mapped and typed.
- Edit page transform supports round-trip fields.
- `pnpm lint` clean.
