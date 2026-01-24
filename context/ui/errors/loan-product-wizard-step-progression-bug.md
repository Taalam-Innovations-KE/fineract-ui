# Loan Product Wizard Step Progression Bug

## Issue Summary
The loan product creation wizard in the Fineract UI fails to progress between steps despite valid form data entry. Users cannot complete the multi-step form to create new loan products.

## Observed Behavior
- Form fields can be filled correctly
- Step validation appears to pass (no error messages shown)
- Clicking "Next" button does not advance to the next step
- Form remains stuck on current step indefinitely
- No network requests for form submission occur

## Root Cause Analysis
The bug stems from improper state management in the wizard's step validation system:

1. **Step Component State Isolation**: Each step uses its own `react-hook-form` instance with independent validation
2. **Asynchronous State Updates**: Step validity is communicated via callback (`onDataValid`/`onDataInvalid`) that triggers React state updates
3. **Race Condition**: When users modify form fields:
   - If form validity doesn't change (stays valid), the validation callback isn't re-triggered
   - Wizard's `wizardData` state isn't updated with new field values
   - Next button click checks stale validity state
4. **React Batching**: State updates from form changes and Next button clicks are batched, causing timing issues where validity checks use outdated state

## Technical Details
- **File**: `src/components/config/loan-product-wizard.tsx`
- **Issue Location**: Step validation and data propagation between wizard steps
- **Affected Components**: `LoanProductWizard`, individual step components (`LoanProductAmountStep`, etc.)
- **Form Library**: `react-hook-form` with `zodResolver`
- **Validation Mode**: `onChange`

## Impact
- **Severity**: High - Core functionality broken
- **User Experience**: Complete blocker for loan product creation
- **Business Impact**: Administrators cannot configure new loan products through the UI

## Reproduction Steps
1. Start Fineract UI dev server
2. Navigate to `/config/products/loans`
3. Click "Create Loan Product"
4. Fill Step 1 fields (name, short name, currency)
5. Click "Next" - should advance to Step 2
6. Fill Step 2 fields (loan amounts)
7. Click "Next" - **fails to advance to Step 3**

## Potential Solutions
1. **Unify Form State**: Use a single `react-hook-form` instance across all wizard steps instead of per-step forms
2. **Synchronous Validation**: Implement synchronous step validation without async state updates
3. **Watch Form Values**: Use `useWatch` or `watch` to monitor form changes and update wizard state reactively
4. **Debounced Updates**: Add debouncing to form validation callbacks to prevent race conditions
5. **Step Reset Logic**: Implement proper form reset when step data changes

## Workaround
None available - manual form progression is blocked.

## Environment
- **Framework**: Next.js 16, React 19
- **Form Management**: react-hook-form v7
- **Validation**: Zod
- **UI Components**: shadcn/ui
- **Date**: 2025-01-24

## Related Files
- `src/components/config/loan-product-wizard.tsx`
- `src/components/config/loan-product-steps/LoanProductAmountStep.tsx`
- `src/lib/schemas/loan-product.ts`