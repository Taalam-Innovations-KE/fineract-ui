'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  loanProductBasicsSchema,
  loanProductTermsSchema,
  loanProductInterestSchema,
  loanProductSettingsSchema,
  loanProductAccountingSchema,
  loanProductFormToRequest,
  type CreateLoanProductFormData,
} from '@/lib/schemas/loan-product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoanProductWizardProps {
  currencies: string[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const steps = [
  { id: 1, name: 'Basics', schema: loanProductBasicsSchema },
  { id: 2, name: 'Terms', schema: loanProductTermsSchema },
  { id: 3, name: 'Interest', schema: loanProductInterestSchema },
  { id: 4, name: 'Settings', schema: loanProductSettingsSchema },
  { id: 5, name: 'Accounting', schema: loanProductAccountingSchema },
];

export function LoanProductWizard({ currencies, onSubmit, onCancel }: LoanProductWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateLoanProductFormData>>({
    accountingRule: 1,
    daysInYearType: 1,
    daysInMonthType: 1,
    isInterestRecalculationEnabled: false,
    amortizationType: 1,
    interestType: 0, // Declining balance
    interestCalculationPeriodType: 1,
    repaymentFrequencyType: 2, // Months
    interestRateFrequencyType: 3, // Per year
  });

  const currentSchema = steps.find(s => s.id === currentStep)?.schema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    reset,
  } = useForm<Partial<CreateLoanProductFormData>>({
    resolver: currentSchema ? zodResolver(currentSchema) as any : undefined,
    defaultValues: formData,
  });

  const handleNext = async (data: any) => {
    const isValid = await trigger();
    if (!isValid) return;

    setFormData(prev => ({ ...prev, ...data }));

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      reset({ ...formData, ...data });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const finalData = { ...formData, ...data };
      const requestData = loanProductFormToRequest(finalData as CreateLoanProductFormData);
      await onSubmit(requestData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  currentStep > step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "border-primary text-primary"
                    : "border-muted text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span className={cn(
                "mt-2 text-xs font-medium",
                currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.name}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "h-[2px] flex-1 mx-2",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit(currentStep === steps.length ? handleFinalSubmit : handleNext)}>
        {/* Step 1: Basics */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
              <Input id="name" {...register('name')} placeholder="e.g. Personal Loan" />
              {errors.name && <p className="text-sm text-destructive">{String(errors.name.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name <span className="text-destructive">*</span></Label>
              <Input id="shortName" {...register('shortName')} placeholder="e.g. PL" maxLength={4} />
              {errors.shortName && <p className="text-sm text-destructive">{String(errors.shortName.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} placeholder="Product description" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currencyCode">Currency <span className="text-destructive">*</span></Label>
                <Select id="currencyCode" {...register('currencyCode')}>
                  <option value="">Select</option>
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
                {errors.currencyCode && <p className="text-sm text-destructive">{String(errors.currencyCode.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="digitsAfterDecimal">Decimal Places <span className="text-destructive">*</span></Label>
                <Input
                  id="digitsAfterDecimal"
                  type="number"
                  {...register('digitsAfterDecimal', { valueAsNumber: true })}
                  min={0}
                  max={6}
                  defaultValue={2}
                />
                {errors.digitsAfterDecimal && <p className="text-sm text-destructive">{String(errors.digitsAfterDecimal.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="inMultiplesOf">Multiples Of</Label>
                <Input
                  id="inMultiplesOf"
                  type="number"
                  {...register('inMultiplesOf', { valueAsNumber: true })}
                  min={0}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Terms */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPrincipal">Min Principal</Label>
                <Input
                  id="minPrincipal"
                  type="number"
                  {...register('minPrincipal', { valueAsNumber: true })}
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="principal">Principal <span className="text-destructive">*</span></Label>
                <Input
                  id="principal"
                  type="number"
                  {...register('principal', { valueAsNumber: true })}
                  placeholder="10000"
                />
                {errors.principal && <p className="text-sm text-destructive">{String(errors.principal.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPrincipal">Max Principal</Label>
                <Input
                  id="maxPrincipal"
                  type="number"
                  {...register('maxPrincipal', { valueAsNumber: true })}
                  placeholder="100000"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minNumberOfRepayments">Min Repayments</Label>
                <Input
                  id="minNumberOfRepayments"
                  type="number"
                  {...register('minNumberOfRepayments', { valueAsNumber: true })}
                  placeholder="6"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfRepayments">Repayments <span className="text-destructive">*</span></Label>
                <Input
                  id="numberOfRepayments"
                  type="number"
                  {...register('numberOfRepayments', { valueAsNumber: true })}
                  placeholder="12"
                />
                {errors.numberOfRepayments && <p className="text-sm text-destructive">{String(errors.numberOfRepayments.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxNumberOfRepayments">Max Repayments</Label>
                <Input
                  id="maxNumberOfRepayments"
                  type="number"
                  {...register('maxNumberOfRepayments', { valueAsNumber: true })}
                  placeholder="24"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="repaymentEvery">Repayment Every <span className="text-destructive">*</span></Label>
                <Input
                  id="repaymentEvery"
                  type="number"
                  {...register('repaymentEvery', { valueAsNumber: true })}
                  placeholder="1"
                />
                {errors.repaymentEvery && <p className="text-sm text-destructive">{String(errors.repaymentEvery.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="repaymentFrequencyType">Frequency <span className="text-destructive">*</span></Label>
                <Select id="repaymentFrequencyType" {...register('repaymentFrequencyType', { valueAsNumber: true })}>
                  <option value={0}>Days</option>
                  <option value={1}>Weeks</option>
                  <option value={2}>Months</option>
                  <option value={3}>Years</option>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Interest */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Badge variant="info" className="w-full justify-center py-2">
              Interest Type: Declining Balance (Recommended for digital lending)
            </Badge>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minInterestRatePerPeriod">Min Rate</Label>
                <Input
                  id="minInterestRatePerPeriod"
                  type="number"
                  step="0.01"
                  {...register('minInterestRatePerPeriod', { valueAsNumber: true })}
                  placeholder="5.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestRatePerPeriod">Interest Rate <span className="text-destructive">*</span></Label>
                <Input
                  id="interestRatePerPeriod"
                  type="number"
                  step="0.01"
                  {...register('interestRatePerPeriod', { valueAsNumber: true })}
                  placeholder="12.00"
                />
                {errors.interestRatePerPeriod && <p className="text-sm text-destructive">{String(errors.interestRatePerPeriod.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxInterestRatePerPeriod">Max Rate</Label>
                <Input
                  id="maxInterestRatePerPeriod"
                  type="number"
                  step="0.01"
                  {...register('maxInterestRatePerPeriod', { valueAsNumber: true })}
                  placeholder="18.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interestRateFrequencyType">Rate Frequency <span className="text-destructive">*</span></Label>
                <Select id="interestRateFrequencyType" {...register('interestRateFrequencyType', { valueAsNumber: true })}>
                  <option value={2}>Per Month</option>
                  <option value={3}>Per Year</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amortizationType">Amortization <span className="text-destructive">*</span></Label>
                <Select id="amortizationType" {...register('amortizationType', { valueAsNumber: true })}>
                  <option value={0}>Equal Principal Payments</option>
                  <option value={1}>Equal Installments</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interestType">Interest Type <span className="text-destructive">*</span></Label>
                <Select id="interestType" {...register('interestType', { valueAsNumber: true })}>
                  <option value={0}>Declining Balance</option>
                  <option value={1}>Flat</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestCalculationPeriodType">Calculation Period <span className="text-destructive">*</span></Label>
                <Select id="interestCalculationPeriodType" {...register('interestCalculationPeriodType', { valueAsNumber: true })}>
                  <option value={0}>Daily</option>
                  <option value={1}>Same as Repayment</option>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="isInterestRecalculationEnabled" {...register('isInterestRecalculationEnabled')} />
              <Label htmlFor="isInterestRecalculationEnabled" className="cursor-pointer">
                Enable interest recalculation
              </Label>
            </div>
          </div>
        )}

        {/* Step 4: Settings */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transactionProcessingStrategyCode">Transaction Processing Strategy <span className="text-destructive">*</span></Label>
              <Select id="transactionProcessingStrategyCode" {...register('transactionProcessingStrategyCode')}>
                <option value="">Select strategy</option>
                <option value="mifos-standard-strategy">Mifos Standard</option>
                <option value="heavensfamily-strategy">Heavensfamily</option>
                <option value="creocore-strategy">Creocore</option>
                <option value="rbi-india-strategy">RBI India</option>
                <option value="principal-interest-penalties-fees-order-strategy">Principal, Interest, Penalties, Fees</option>
                <option value="interest-principal-penalties-fees-order-strategy">Interest, Principal, Penalties, Fees</option>
                <option value="early-repayment-strategy">Early Repayment</option>
              </Select>
              {errors.transactionProcessingStrategyCode && <p className="text-sm text-destructive">{String(errors.transactionProcessingStrategyCode.message)}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="graceOnPrincipalPayment">Grace on Principal</Label>
                <Input
                  id="graceOnPrincipalPayment"
                  type="number"
                  {...register('graceOnPrincipalPayment', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="graceOnInterestPayment">Grace on Interest</Label>
                <Input
                  id="graceOnInterestPayment"
                  type="number"
                  {...register('graceOnInterestPayment', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="graceOnArrearsAgeing">Grace on Arrears Ageing</Label>
                <Input
                  id="graceOnArrearsAgeing"
                  type="number"
                  {...register('graceOnArrearsAgeing', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inArrearsTolerance">In Arrears Tolerance</Label>
                <Input
                  id="inArrearsTolerance"
                  type="number"
                  {...register('inArrearsTolerance', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Accounting */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountingRule">Accounting Rule <span className="text-destructive">*</span></Label>
              <Select id="accountingRule" {...register('accountingRule', { valueAsNumber: true })}>
                <option value={1}>None</option>
                <option value={2}>Cash Based</option>
                <option value={3}>Accrual (Periodic)</option>
                <option value={4}>Accrual (Upfront)</option>
              </Select>
              {errors.accountingRule && <p className="text-sm text-destructive">{String(errors.accountingRule.message)}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="daysInYearType">Days in Year <span className="text-destructive">*</span></Label>
                <Select id="daysInYearType" {...register('daysInYearType', { valueAsNumber: true })}>
                  <option value={1}>Actual</option>
                  <option value={2}>360 Days</option>
                  <option value={3}>364 Days</option>
                  <option value={4}>365 Days</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="daysInMonthType">Days in Month <span className="text-destructive">*</span></Label>
                <Select id="daysInMonthType" {...register('daysInMonthType', { valueAsNumber: true })}>
                  <option value={1}>Actual</option>
                  <option value={2}>30 Days</option>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? onCancel : handleBack}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          <Button type="submit" disabled={isSubmitting}>
            {currentStep === steps.length ? (
              isSubmitting ? 'Creating...' : 'Create Product'
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
