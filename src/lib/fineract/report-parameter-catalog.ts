export type ReportParameterCatalogDataType = "integer" | "string" | "date";
export type ReportParameterCatalogSource = "user" | "system";
export type ReportParameterCatalogWidget =
	| "dropdown"
	| "datepicker"
	| "textbox"
	| "hidden";

export interface ReportParameterCatalogDefinition {
	type: ReportParameterCatalogDataType;
	source: ReportParameterCatalogSource;
	widget: ReportParameterCatalogWidget;
	label?: string;
	format?: string;
	optionsEndpoint?: string;
}

export type ReportParameterCatalogOverride =
	Partial<ReportParameterCatalogDefinition>;

export interface ReportParameterCatalogReportDefinition {
	name: string;
	resolvedReportName?: string;
	required: string[];
	optional: string[];
	paramOverrides?: Record<string, ReportParameterCatalogOverride>;
}

export interface ResolvedReportParameterCatalogField
	extends ReportParameterCatalogDefinition {
	key: string;
	required: boolean;
	systemSubstitution?: string;
}

const SYSTEM_PARAMETER_SUBSTITUTIONS = {
	userhierarchy: "authenticated_user.office.hierarchy",
} as const;

const PARAMETER_CATALOG = {
	Account: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		optionsEndpoint: "/v1/runreports/Account%20No?parameterType=true",
	},
	Branch: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		optionsEndpoint: "/v1/runreports/Branch?parameterType=true",
	},
	CurrencyId: {
		type: "string",
		source: "user",
		widget: "dropdown",
		label: "Currency",
		optionsEndpoint: "/v1/runreports/CurrencyId?parameterType=true",
	},
	Enddate: {
		type: "date",
		source: "user",
		widget: "datepicker",
		label: "End Date",
		format: "dd-MM-yyyy",
	},
	"Loan Officer": {
		type: "integer",
		source: "user",
		widget: "dropdown",
		optionsEndpoint: "/v1/runreports/Loan%20Officer?parameterType=true",
	},
	Startdate: {
		type: "date",
		source: "user",
		widget: "datepicker",
		label: "Start Date",
		format: "dd-MM-yyyy",
	},
	account: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		optionsEndpoint: "/v1/runreports/account?parameterType=true",
	},
	accountNo: {
		type: "string",
		source: "user",
		widget: "textbox",
		label: "Savings Account Id",
	},
	branch: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		label: "Branch",
		optionsEndpoint: "/v1/runreports/Branch?parameterType=true",
	},
	centerId: {
		type: "integer",
		source: "user",
		widget: "textbox",
	},
	currencyId: {
		type: "string",
		source: "user",
		widget: "dropdown",
		label: "Currency",
		optionsEndpoint: "/v1/runreports/CurrencyId?parameterType=true",
	},
	date: {
		type: "date",
		source: "user",
		widget: "datepicker",
		label: "As On",
		format: "yyyy-MM-dd",
	},
	endDate: {
		type: "date",
		source: "user",
		widget: "datepicker",
		label: "End Date",
		format: "dd-MM-yyyy",
	},
	fromDate: {
		type: "date",
		source: "user",
		widget: "datepicker",
		label: "From :",
		format: "yyyy-MM-dd",
	},
	fundId: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		label: "Fund",
		optionsEndpoint: "/v1/runreports/fundId?parameterType=true",
	},
	loanOfficer: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		label: "Loan Officer",
		optionsEndpoint: "/v1/runreports/Loan%20Officer?parameterType=true",
	},
	loanOfficerId: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		label: "Select loan Officer :",
		optionsEndpoint: "/v1/runreports/selectLoanOfficer?parameterType=true",
	},
	loanProductId: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		label: "Loan Product",
		optionsEndpoint: "/v1/runreports/loanProductId?parameterType=true",
	},
	loanPurposeId: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		label: "Loan Purpose",
		optionsEndpoint: "/v1/runreports/loanPurposeId?parameterType=true",
	},
	obligDateType: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		label: "Obligation Date Type",
		optionsEndpoint: "/v1/runreports/obligDateType?parameterType=true",
	},
	officeId: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		label: "Select Office",
		optionsEndpoint: "/v1/runreports/selectOffice?parameterType=true",
	},
	ondate: {
		type: "date",
		source: "user",
		widget: "datepicker",
		label: "On Date",
		format: "yyyy-MM-dd",
	},
	parType: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		label: "PAR calculation",
		optionsEndpoint: "/v1/runreports/parType?parameterType=true",
	},
	selectLoan: {
		type: "string",
		source: "user",
		widget: "dropdown",
		label: "Loan",
		optionsEndpoint: "/v1/runreports/selectLoan?parameterType=true",
	},
	selectOffice: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		label: "Select Office :",
		optionsEndpoint: "/v1/runreports/selectOffice?parameterType=true",
	},
	selectProduct: {
		type: "integer",
		source: "user",
		widget: "dropdown",
		label: "Select Product :",
		optionsEndpoint: "/v1/runreports/selectProduct?parameterType=true",
	},
	startDate: {
		type: "date",
		source: "user",
		widget: "datepicker",
		label: "Start Date",
		format: "dd-MM-yyyy",
	},
	toDate: {
		type: "date",
		source: "user",
		widget: "datepicker",
		label: "To :",
		format: "yyyy-MM-dd",
	},
	todate: {
		type: "date",
		source: "user",
		widget: "datepicker",
		format: "dd-MM-yyyy",
	},
	transactionId: {
		type: "integer",
		source: "user",
		widget: "textbox",
		label: "Transaction ID",
	},
	userhierarchy: {
		type: "string",
		source: "system",
		widget: "hidden",
		label: "User Hierarchy",
	},
	userid: {
		type: "integer",
		source: "user",
		widget: "textbox",
		label: "User ID",
	},
} as const satisfies Record<string, ReportParameterCatalogDefinition>;

const REPORT_DEFINITIONS = [
	{
		name: "Active Loan Summary per Branch",
		required: ["userhierarchy"],
		optional: ["userid"],
	},
	{
		name: "Active Loans - Details(Pentaho)",
		required: [
			"userhierarchy",
			"branch",
			"loanOfficer",
			"currencyId",
			"loanProductId",
			"fundId",
			"loanPurposeId",
		],
		optional: [],
	},
	{
		name: "Active Loans - Summary(Pentaho)",
		required: [
			"userhierarchy",
			"parType",
			"Branch",
			"loanOfficer",
			"CurrencyId",
			"loanProductId",
			"fundId",
			"loanPurposeId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
		},
	},
	{
		name: "Active Loans Passed Final Maturity(Pentaho)",
		required: [
			"userhierarchy",
			"Branch",
			"Loan Officer",
			"loanPurposeId",
			"CurrencyId",
			"loanProductId",
			"fundId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Office",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
			loanProductId: {
				label: "Loan ProductId",
			},
		},
	},
	{
		name: "Active Loans Passed Final Maturity Summary(Pentaho)",
		required: [
			"userhierarchy",
			"Branch",
			"Loan Officer",
			"loanPurposeId",
			"CurrencyId",
			"loanProductId",
			"fundId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Office",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
			loanProductId: {
				label: "Loan ProductId",
			},
		},
	},
	{
		name: "Active Loans by Disbursal Period(Pentaho)",
		required: [
			"userhierarchy",
			"startDate",
			"endDate",
			"Branch",
			"loanOfficer",
			"loanPurposeId",
			"CurrencyId",
			"loanProductId",
			"fundId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Office",
			},
			loanProductId: {
				label: "Loan ProductId",
			},
		},
	},
	{
		name: "Active Loans in last installment(Pentaho)",
		required: [
			"userhierarchy",
			"Branch",
			"Loan Officer",
			"loanPurposeId",
			"CurrencyId",
			"loanProductId",
			"fundId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Office",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
			loanProductId: {
				label: "Loan ProductId",
			},
		},
	},
	{
		name: "Active Loans in last installment Summary(Pentaho)",
		required: [
			"userhierarchy",
			"Branch",
			"Loan Officer",
			"fundId",
			"CurrencyId",
			"loanProductId",
			"loanPurposeId",
			"parType",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
		},
	},
	{
		name: "Aging Detail(Pentaho)",
		required: ["userhierarchy", "Branch"],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Office",
			},
		},
	},
	{
		name: "Aging Summary (Arrears in Months)(Pentaho)",
		required: ["userhierarchy", "Branch", "CurrencyId"],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
		},
	},
	{
		name: "Aging Summary (Arrears in Weeks)(Pentaho)",
		required: ["userhierarchy", "Branch"],
		optional: ["CurrencyId"],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
		},
	},
	{
		name: "Balance Outstanding",
		required: ["userhierarchy", "branch"],
		optional: ["ondate", "userid"],
	},
	{
		name: "Balance Sheet",
		required: ["userhierarchy", "date", "branch"],
		optional: [],
		paramOverrides: {
			branch: {
				label: "Select Branch",
			},
		},
	},
	{
		name: "Branch Expected Cash Flow",
		required: ["userhierarchy", "fromDate", "toDate", "selectOffice"],
		optional: [],
	},
	{
		name: "Client Listing(Pentaho)",
		required: ["userhierarchy", "selectOffice"],
		optional: [],
		paramOverrides: {
			selectOffice: {
				label: "Select Branch",
				optionsEndpoint: "/v1/runreports/Select_Office?parameterType=true",
			},
		},
	},
	{
		name: "Client Loan Account Schedule",
		required: ["userhierarchy", "startDate", "endDate", "selectLoan"],
		optional: ["userid"],
		paramOverrides: {
			startDate: {
				format: "yyyy-MM-dd",
			},
			endDate: {
				format: "yyyy-MM-dd",
			},
		},
	},
	{
		name: "Client Loans Listing(Pentaho)",
		required: [
			"userhierarchy",
			"Branch",
			"Loan Officer",
			"CurrencyId",
			"loanProductId",
			"fundId",
			"loanPurposeId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Office",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
		},
	},
	{
		name: "Client Saving Transactions",
		required: ["accountNo", "startDate", "endDate"],
		optional: ["userid"],
		paramOverrides: {
			startDate: {
				format: "yyyy-MM-dd",
			},
			endDate: {
				format: "yyyy-MM-dd",
			},
			userid: {
				label: "UserID",
			},
		},
	},
	{
		name: "Client Savings Summary",
		required: [
			"userhierarchy",
			"fromDate",
			"toDate",
			"selectOffice",
			"selectProduct",
		],
		optional: [],
		paramOverrides: {
			selectOffice: {
				optionsEndpoint: "/v1/runreports/SelectOffice?parameterType=true",
			},
		},
	},
	{
		name: "Collection Report",
		required: ["userhierarchy", "fromDate", "toDate", "branch"],
		optional: ["userid"],
		paramOverrides: {
			branch: {
				optionsEndpoint: "/v1/runreports/branch?parameterType=true",
			},
		},
	},
	{
		name: "Disbursal Report",
		required: ["userhierarchy", "fromDate", "toDate", "branch"],
		optional: ["userid"],
	},
	{
		name: "Expected Payments By Date - Basic(Pentaho)",
		required: [
			"userhierarchy",
			"startDate",
			"endDate",
			"Branch",
			"Loan Officer",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
		},
	},
	{
		name: "Expected Payments By Date - Formatted",
		required: [
			"userhierarchy",
			"startDate",
			"endDate",
			"officeId",
			"loanOfficerId",
		],
		optional: [],
		paramOverrides: {
			startDate: {
				label: "From :",
				format: "yyyy-MM-dd",
			},
			endDate: {
				label: "To :",
				format: "yyyy-MM-dd",
			},
		},
	},
	{
		name: "Funds Disbursed Between Dates Summary(Pentaho)",
		required: ["userhierarchy", "startDate", "endDate", "CurrencyId", "fundId"],
		optional: [],
	},
	{
		name: "Funds Disbursed Between Dates Summary by Office(Pentaho)",
		required: [
			"userhierarchy",
			"startDate",
			"endDate",
			"Branch",
			"CurrencyId",
			"fundId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
		},
	},
	{
		name: "GeneralLedgerReport",
		required: ["fromDate", "toDate", "userhierarchy", "account", "branch"],
		optional: [],
		paramOverrides: {
			account: {
				label: "account",
			},
			branch: {
				label: "branch",
				optionsEndpoint: "/v1/runreports/branch?parameterType=true",
			},
		},
	},
	{
		name: "Income Statement",
		required: ["userhierarchy", "fromDate", "toDate", "branch"],
		optional: [],
		paramOverrides: {
			branch: {
				widget: "textbox",
			},
		},
	},
	{
		name: "Loan Account Schedule",
		resolvedReportName: "Loan Account statement",
		required: ["ondate", "todate", "Account"],
		optional: [],
		paramOverrides: {
			ondate: {
				label: "ondate",
				format: "dd-MM-yyyy",
			},
			todate: {
				label: "todate",
			},
			Account: {
				label: "Account",
			},
		},
	},
	{
		name: "Loan Transaction Receipt",
		required: ["userhierarchy"],
		optional: ["transactionId"],
	},
	{
		name: "Loans Awaiting Disbursal(Pentaho)",
		required: [
			"userhierarchy",
			"Branch",
			"Loan Officer",
			"CurrencyId",
			"loanPurposeId",
			"loanProductId",
			"fundId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Office",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
		},
	},
	{
		name: "Loans Awaiting Disbursal Summary(Pentaho)",
		required: [
			"userhierarchy",
			"Branch",
			"Loan Officer",
			"CurrencyId",
			"fundId",
		],
		optional: ["loanPurposeId", "loanProductId"],
		paramOverrides: {
			Branch: {
				label: "Office",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
			loanPurposeId: {
				label: "Loan PurposeId",
			},
		},
	},
	{
		name: "Loans Awaiting Disbursal Summary by Month(Pentaho)",
		required: [
			"userhierarchy",
			"Branch",
			"Loan Officer",
			"loanPurposeId",
			"CurrencyId",
			"loanProductId",
			"fundId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Office",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
			loanPurposeId: {
				label: "Loan PurposeId",
			},
			loanProductId: {
				label: "Loan ProductId",
			},
		},
	},
	{
		name: "Loans Pending Approval(Pentaho)",
		required: [
			"userhierarchy",
			"Branch",
			"Loan Officer",
			"loanProductId",
			"loanPurposeId",
			"fundId",
		],
		optional: ["CurrencyId"],
		paramOverrides: {
			Branch: {
				label: "Branch/Office",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
		},
	},
	{
		name: "Obligation Met Loans Details(Pentaho)",
		required: [
			"userhierarchy",
			"startDate",
			"endDate",
			"obligDateType",
			"Branch",
			"Loan Officer",
			"CurrencyId",
			"fundId",
			"loanProductId",
			"loanPurposeId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
		},
	},
	{
		name: "Obligation Met Loans Summary(Pentaho)",
		required: [
			"userhierarchy",
			"Startdate",
			"Enddate",
			"Branch",
			"Loan Officer",
			"CurrencyId",
			"loanProductId",
			"loanPurposeId",
			"fundId",
			"obligDateType",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
			obligDateType: {
				label: "Oblig Date Type",
			},
		},
	},
	{
		name: "Portfolio at Risk(Pentaho)",
		required: [
			"userhierarchy",
			"Branch",
			"fundId",
			"loanOfficer",
			"CurrencyId",
			"loanProductId",
			"loanPurposeId",
			"parType",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
			loanOfficer: {
				optionsEndpoint: "/v1/runreports/loanOfficer?parameterType=true",
			},
		},
	},
	{
		name: "Portfolio at Risk by Branch(Pentaho)",
		required: [
			"userhierarchy",
			"Branch",
			"parType",
			"Loan Officer",
			"CurrencyId",
			"fundId",
			"loanPurposeId",
			"loanProductId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
			parType: {
				label: "parType",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
		},
	},
	{
		name: "Rescheduled Loans(Pentaho)",
		required: [
			"userhierarchy",
			"startDate",
			"endDate",
			"Branch",
			"CurrencyId",
			"loanProductId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
		},
	},
	{
		name: "Savings Transaction Receipt",
		required: ["userhierarchy"],
		optional: ["transactionId"],
	},
	{
		name: "Savings Transactions",
		required: ["userhierarchy", "accountNo", "fromDate", "toDate"],
		optional: [],
		paramOverrides: {
			accountNo: {
				label: "Select Account No:",
			},
		},
	},
	{
		name: "Staff Assignment History",
		required: ["centerId"],
		optional: [],
		paramOverrides: {
			centerId: {
				label: "centerId",
			},
		},
	},
	{
		name: "Trial Balance",
		required: ["userhierarchy", "fromDate", "toDate", "branch"],
		optional: [],
		paramOverrides: {
			branch: {
				label: "Select Branch :",
			},
		},
	},
	{
		name: "TxnRunningBalances(Pentaho)",
		required: [
			"userhierarchy",
			"startDate",
			"endDate",
			"Branch",
			"Loan Officer",
		],
		optional: [],
		paramOverrides: {
			startDate: {
				label: "Start DAte",
			},
			Branch: {
				label: "Branch",
			},
			"Loan Officer": {
				label: "Loan Officer",
			},
		},
	},
	{
		name: "Written-Off Loans(Pentaho)",
		required: [
			"userhierarchy",
			"startDate",
			"endDate",
			"Branch",
			"CurrencyId",
			"loanProductId",
		],
		optional: [],
		paramOverrides: {
			Branch: {
				label: "Branch",
			},
		},
	},
] as const satisfies ReportParameterCatalogReportDefinition[];

const REPORT_DEFINITION_MAP = new Map<
	string,
	ReportParameterCatalogReportDefinition
>();

for (const reportDefinition of REPORT_DEFINITIONS) {
	REPORT_DEFINITION_MAP.set(
		normalizeLookupKey(reportDefinition.name),
		reportDefinition,
	);
	if (reportDefinition.resolvedReportName) {
		REPORT_DEFINITION_MAP.set(
			normalizeLookupKey(reportDefinition.resolvedReportName),
			reportDefinition,
		);
	}
}

function normalizeLookupKey(value: string): string {
	return value.trim().toLowerCase();
}

export function resolveReportParameterCatalog(
	reportName?: string | null,
): ReportParameterCatalogReportDefinition | null {
	if (!reportName) {
		return null;
	}

	return REPORT_DEFINITION_MAP.get(normalizeLookupKey(reportName)) || null;
}

export function getSystemParameterSubstitution(
	parameterKey: string,
): string | undefined {
	return SYSTEM_PARAMETER_SUBSTITUTIONS[
		parameterKey as keyof typeof SYSTEM_PARAMETER_SUBSTITUTIONS
	];
}

export function getReportParameterCatalogFields(
	reportName?: string | null,
): ResolvedReportParameterCatalogField[] {
	const reportDefinition = resolveReportParameterCatalog(reportName);
	if (!reportDefinition) {
		return [];
	}

	const orderedKeys = [
		...reportDefinition.required,
		...reportDefinition.optional,
	];
	const seen = new Set<string>();

	return orderedKeys.flatMap((parameterKey) => {
		if (seen.has(parameterKey)) {
			return [];
		}
		seen.add(parameterKey);

		const baseDefinition =
			PARAMETER_CATALOG[parameterKey as keyof typeof PARAMETER_CATALOG];
		if (!baseDefinition) {
			return [];
		}

		const override = reportDefinition.paramOverrides?.[parameterKey];
		const resolvedField: ResolvedReportParameterCatalogField = {
			key: parameterKey,
			type: override?.type || baseDefinition.type,
			source: override?.source || baseDefinition.source,
			widget: override?.widget || baseDefinition.widget,
			label: override?.label || baseDefinition.label,
			format: override?.format || baseDefinition.format,
			optionsEndpoint:
				override?.optionsEndpoint || baseDefinition.optionsEndpoint,
			required: reportDefinition.required.includes(parameterKey),
			systemSubstitution: getSystemParameterSubstitution(parameterKey),
		};

		return [resolvedField];
	});
}

export function getOptionsEndpointReportName(
	optionsEndpoint?: string | null,
): string | null {
	if (!optionsEndpoint) {
		return null;
	}

	try {
		const parsed = new URL(optionsEndpoint, "https://placeholder.local");
		const match = parsed.pathname.match(/\/v1\/runreports\/(.+)$/);
		if (!match?.[1]) {
			return null;
		}

		return decodeURIComponent(match[1]);
	} catch {
		return null;
	}
}
