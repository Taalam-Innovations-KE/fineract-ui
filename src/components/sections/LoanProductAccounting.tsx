import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	GetLoanProductsResponse,
	GetLoanProductsTemplateResponse,
} from "@/lib/fineract/generated/types.gen";

interface LoanProductAccountingProps {
	data: GetLoanProductsResponse;
	enumMap: Record<string, string>;
	templateData?: GetLoanProductsTemplateResponse;
}

function renderStrategyVisualization(strategyName: string) {
	// Check if it's a comma-separated list of components
	const components = strategyName
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s && !s.toLowerCase().includes("order"));

	if (components.length > 1) {
		// Visual flow for sequential strategies
		return (
			<div className="flex items-center gap-2 flex-wrap">
				{components.map((component, index) => (
					<Fragment key={component}>
						<Badge variant="outline" className="text-xs">
							{component}
						</Badge>
						{index < components.length - 1 && (
							<span className="text-muted-foreground">→</span>
						)}
					</Fragment>
				))}
			</div>
		);
	} else {
		// Single badge for advanced or non-sequential strategies
		return (
			<Badge variant="secondary" className="text-xs">
				{strategyName}
			</Badge>
		);
	}
}

export function LoanProductAccounting({
	data,
	enumMap,
	templateData,
}: LoanProductAccountingProps) {
	return (
		<TooltipProvider>
			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<div className="text-xs uppercase text-muted-foreground">
						Accounting Rule
					</div>
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="text-sm cursor-help">
								{enumMap[data.accountingRule?.code || ""] ||
									data.accountingRule?.code ||
									"—"}
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>Code: {data.accountingRule?.code || "N/A"}</p>
							{data.accountingRule?.description && (
								<p className="mt-1 text-xs">
									{data.accountingRule.description}
								</p>
							)}
						</TooltipContent>
					</Tooltip>
					{data.accountingRule?.description && (
						<div className="text-xs text-muted-foreground mt-1">
							{data.accountingRule.description}
						</div>
					)}
				</div>
				<div>
					<div className="text-xs uppercase text-muted-foreground">
						Transaction Processing Strategy
					</div>
					<div className="text-sm">
						{data.transactionProcessingStrategy || "—"}
					</div>
				</div>
				<div>
					<div className="text-xs uppercase text-muted-foreground">
						Transaction Processing Strategy Name
					</div>
					<div className="text-sm">
						{data.transactionProcessingStrategyName || "—"}
					</div>
					{data.transactionProcessingStrategyName && (
						<div className="text-xs text-muted-foreground mt-1">
							This strategy determines the order in which payments are applied
							to loan components during repayment processing.
						</div>
					)}
					{data.transactionProcessingStrategyName && templateData && (
						<div className="mt-2">
							{renderStrategyVisualization(
								data.transactionProcessingStrategyName,
							)}
						</div>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
}
