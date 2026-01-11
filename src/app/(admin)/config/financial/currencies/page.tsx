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
import { Badge } from '@/components/ui/badge';
import { BFF_ROUTES } from '@/lib/fineract/endpoints';
import { useTenantStore } from '@/store/tenant';
import { ChevronRight, ChevronLeft, Save, DollarSign } from 'lucide-react';
import type { CurrencyConfigurationData, CurrencyData } from '@/lib/fineract/generated/types.gen';

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

async function updateCurrencies(tenantId: string, currencies: string[]) {
  const response = await fetch(BFF_ROUTES.currencies, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
    body: JSON.stringify({ currencies }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update currencies');
  }

  return response.json();
}

export default function CurrenciesPage() {
  const { tenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
  const [selectedEnabled, setSelectedEnabled] = useState<Set<string>>(new Set());

  const {
    data: currencyConfig,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['currencies', tenantId],
    queryFn: () => fetchCurrencies(tenantId),
  });

  const updateMutation = useMutation({
    mutationFn: (currencies: string[]) => updateCurrencies(tenantId, currencies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies', tenantId] });
      setSelectedAvailable(new Set());
      setSelectedEnabled(new Set());
    },
  });

  const availableCurrencies = currencyConfig?.currencyOptions || [];
  const enabledCurrencies = currencyConfig?.selectedCurrencyOptions || [];

  const enabledCodes = new Set(enabledCurrencies.map((c) => c.code!));
  const actuallyAvailable = availableCurrencies.filter((c) => !enabledCodes.has(c.code!));

  const handleMoveToEnabled = () => {
    const newEnabled = [
      ...enabledCurrencies,
      ...actuallyAvailable.filter((c) => selectedAvailable.has(c.code!)),
    ];
    const codes = newEnabled.map((c) => c.code!);
    updateMutation.mutate(codes);
  };

  const handleMoveToAvailable = () => {
    const newEnabled = enabledCurrencies.filter((c) => !selectedEnabled.has(c.code!));
    const codes = newEnabled.map((c) => c.code!);
    updateMutation.mutate(codes);
  };

  const toggleAvailable = (code: string) => {
    const newSet = new Set(selectedAvailable);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedAvailable(newSet);
  };

  const toggleEnabled = (code: string) => {
    const newSet = new Set(selectedEnabled);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedEnabled(newSet);
  };

  return (
    <PageShell
      title="Currencies"
      subtitle="Manage enabled currencies for your platform"
    >
      <Card>
        <CardHeader>
          <CardTitle>Currency Configuration</CardTitle>
          <CardDescription>
            Select which currencies are enabled for use in your system. Move currencies
            between available and enabled lists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading currencies...
            </div>
          )}
          {error && (
            <div className="text-center py-8 text-destructive">
              Failed to load currencies. Please try again.
            </div>
          )}
          {!isLoading && !error && (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
              {/* Available Currencies */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Available Currencies</h4>
                  <Badge variant="secondary">{actuallyAvailable.length}</Badge>
                </div>
                <div className="border rounded-lg min-h-[400px] max-h-[400px] overflow-y-auto">
                  {actuallyAvailable.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      All currencies are enabled
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {actuallyAvailable.map((currency) => (
                        <div
                          key={currency.code}
                          onClick={() => toggleAvailable(currency.code!)}
                          className={`p-3 rounded-md cursor-pointer transition-colors ${
                            selectedAvailable.has(currency.code!)
                              ? 'bg-primary/10 border border-primary'
                              : 'hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">
                                {currency.code} - {currency.displayLabel}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Symbol: {currency.displaySymbol} | Decimals:{' '}
                                {currency.decimalPlaces}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex flex-col items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleMoveToEnabled}
                  disabled={selectedAvailable.size === 0 || updateMutation.isPending}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleMoveToAvailable}
                  disabled={selectedEnabled.size === 0 || updateMutation.isPending}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>

              {/* Enabled Currencies */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Enabled Currencies</h4>
                  <Badge variant="default">{enabledCurrencies.length}</Badge>
                </div>
                <div className="border rounded-lg min-h-[400px] max-h-[400px] overflow-y-auto">
                  {enabledCurrencies.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No currencies enabled
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {enabledCurrencies.map((currency) => (
                        <div
                          key={currency.code}
                          onClick={() => toggleEnabled(currency.code!)}
                          className={`p-3 rounded-md cursor-pointer transition-colors ${
                            selectedEnabled.has(currency.code!)
                              ? 'bg-primary/10 border border-primary'
                              : 'hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <div>
                              <div className="font-medium text-sm">
                                {currency.code} - {currency.displayLabel}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Symbol: {currency.displaySymbol} | Decimals:{' '}
                                {currency.decimalPlaces}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {updateMutation.isPending && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Updating currencies...
            </div>
          )}
          {updateMutation.isError && (
            <div className="mt-4 text-center text-sm text-destructive">
              Failed to update currencies. Please try again.
            </div>
          )}
          {updateMutation.isSuccess && (
            <div className="mt-4 text-center text-sm text-success">
              Currencies updated successfully!
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
