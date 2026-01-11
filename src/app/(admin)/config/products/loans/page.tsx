'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/config/page-shell';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerContent,
  DrawerClose,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { LoanProductWizard } from '@/components/config/loan-product-wizard';
import { BFF_ROUTES } from '@/lib/fineract/endpoints';
import { useTenantStore } from '@/store/tenant';
import { Plus, CreditCard, TrendingUp, Percent } from 'lucide-react';
import type { CurrencyConfigurationData } from '@/lib/fineract/generated/types.gen';

async function fetchLoanProducts(tenantId: string) {
  const response = await fetch(BFF_ROUTES.loanProducts, {
    headers: {
      'x-tenant-id': tenantId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch loan products');
  }

  return response.json();
}

async function fetchCurrencies(tenantId: string): Promise<CurrencyConfigurationData> {
  const response = await fetch(BFF_ROUTES.currencies, {
    headers: {
      'x-tenant-id': tenantId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch currencies');
  }

  return response.json();
}

async function createLoanProduct(tenantId: string, data: any) {
  const response = await fetch(BFF_ROUTES.loanProducts, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create loan product');
  }

  return response.json();
}

export default function LoanProductsPage() {
  const { tenantId } = useTenantStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['loanProducts', tenantId],
    queryFn: () => fetchLoanProducts(tenantId),
  });

  const { data: currencyConfig } = useQuery({
    queryKey: ['currencies', tenantId],
    queryFn: () => fetchCurrencies(tenantId),
  });

  const enabledCurrencies = currencyConfig?.selectedCurrencyOptions?.map(c => c.code!) || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => createLoanProduct(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanProducts', tenantId] });
      setIsDrawerOpen(false);
    },
  });

  return (
    <PageShell
      title="Loan Products"
      subtitle="Configure and manage loan product offerings"
      actions={
        <Button onClick={() => setIsDrawerOpen(true)} disabled={enabledCurrencies.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Create Loan Product
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div>
          {enabledCurrencies.length === 0 && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="text-center text-sm text-muted-foreground">
                  Please enable at least one currency in the{' '}
                  <a href="/config/financial/currencies" className="text-primary hover:underline">
                    Currencies
                  </a>{' '}
                  module before creating loan products.
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Loan Products</CardTitle>
              <CardDescription>
                {products.length} product{products.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  Loading loan products...
                </div>
              )}
              {error && (
                <div className="text-center py-8 text-destructive">
                  Failed to load loan products. Please try again.
                </div>
              )}
              {!isLoading && !error && products.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No loan products found. Create your first loan product to get started.
                </div>
              )}
              {!isLoading && !error && products.length > 0 && (
                <div className="space-y-2">
                  {products.map((product: any) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.shortName} • {product.currency?.code}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {product.principal && (
                          <Badge variant="secondary">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {product.currency?.displaySymbol}{product.principal}
                          </Badge>
                        )}
                        {product.interestRatePerPeriod !== undefined && (
                          <Badge variant="info">
                            <Percent className="h-3 w-3 mr-1" />
                            {product.interestRatePerPeriod}%
                          </Badge>
                        )}
                        {product.accountingRule && (
                          <Badge variant="outline">
                            {product.accountingRule.value || 'No Accounting'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Product statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{products.length}</div>
                <div className="text-sm text-muted-foreground">Total Products</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{enabledCurrencies.length}</div>
                <div className="text-sm text-muted-foreground">Currencies</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Loan Product Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerHeader>
          <div className="flex items-center justify-between flex-1">
            <div>
              <DrawerTitle>Create Loan Product</DrawerTitle>
              <DrawerDescription className="mt-1">
                Configure a new loan product with a multi-step wizard
              </DrawerDescription>
            </div>
            <DrawerClose onClick={() => setIsDrawerOpen(false)} />
          </div>
        </DrawerHeader>
        <DrawerContent>
          <LoanProductWizard
            currencies={enabledCurrencies}
            onSubmit={(data) => createMutation.mutateAsync(data)}
            onCancel={() => setIsDrawerOpen(false)}
          />
        </DrawerContent>
      </Drawer>
    </PageShell>
  );
}
