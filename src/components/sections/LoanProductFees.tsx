import { Card, CardContent } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

import type { GetLoanProductsResponse } from "@/lib/fineract/generated/types.gen";

interface ExtendedGetLoanProductsResponse extends GetLoanProductsResponse {
	charges?: {
		id: number;
		name: string;
		amount: number;
		currency: { code: string; displaySymbol: string };
		chargeTimeType: { value: string };
		chargeCalculationType: { value: string };
	}[];
}

interface LoanProductFeesProps {
	data: ExtendedGetLoanProductsResponse;
	formatCurrency: (amount: number | undefined, symbol?: string) => string;
	enumMap: Record<string, string>;
}

export function LoanProductFees({
	data,
	formatCurrency,
	enumMap,
}: LoanProductFeesProps) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Supported Interest Refund Types
							</div>
							<div className="text-sm">
								{data.supportedInterestRefundTypes?.length
									? data.supportedInterestRefundTypes
											.map((type) => type.value || type.code)
											.join(", ")
									: "—"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Charge Off Behaviour
							</div>
							<div className="text-sm">
								{enumMap[data.chargeOffBehaviour?.code || ""] ||
									data.chargeOffBehaviour?.code ||
									"—"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Enable Buy Down Fee
							</div>
							<div className="text-sm">
								{data.enableBuyDownFee ? "Yes" : "No"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Buy Down Fee Calculation Type
							</div>
							<div className="text-sm">
								{data.buyDownFeeCalculationType?.value ||
									data.buyDownFeeCalculationType?.code ||
									"—"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Buy Down Fee Income Type
							</div>
							<div className="text-sm">
								{data.buyDownFeeIncomeType?.value ||
									data.buyDownFeeIncomeType?.code ||
									"—"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Buy Down Fee Strategy
							</div>
							<div className="text-sm">
								{data.buyDownFeeStrategy?.value ||
									data.buyDownFeeStrategy?.code ||
									"—"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Merchant Buy Down Fee
							</div>
							<div className="text-sm">
								{data.merchantBuyDownFee ? "Yes" : "No"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Enable Income Capitalization
							</div>
							<div className="text-sm">
								{data.enableIncomeCapitalization ? "Yes" : "No"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Capitalized Income Calculation Type
							</div>
							<div className="text-sm">
								{data.capitalizedIncomeCalculationType?.value ||
									data.capitalizedIncomeCalculationType?.code ||
									"—"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Capitalized Income Strategy
							</div>
							<div className="text-sm">
								{data.capitalizedIncomeStrategy?.value ||
									data.capitalizedIncomeStrategy?.code ||
									"—"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Capitalized Income Type
							</div>
							<div className="text-sm">
								{data.capitalizedIncomeType?.value ||
									data.capitalizedIncomeType?.code ||
									"—"}
							</div>
						</div>
					</div>
					{data.charges?.length > 0 && (
						<div>
							<div className="text-sm font-medium mb-2">Associated Charges</div>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Calculation Type</TableHead>
										<TableHead>Time</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.charges.map((charge) => (
										<TableRow key={charge.id}>
											<TableCell className="font-medium">
												{charge.name}
											</TableCell>
											<TableCell>
												{formatCurrency(
													charge.amount,
													charge.currency?.displaySymbol,
												)}
											</TableCell>
											<TableCell>
												{charge.chargeCalculationType?.value}
											</TableCell>
											<TableCell>{charge.chargeTimeType?.value}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
