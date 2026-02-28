/**
 * Fineract API endpoint paths (without /v1 prefix)
 * BFF will map these to actual Fineract paths
 */

export const FINERACT_ENDPOINTS = {
	// Organisation
	offices: "/v1/offices",
	staff: "/v1/staff",
	users: "/v1/users",
	usersTemplate: "/v1/users/template",
	roles: "/v1/roles",
	rolePermissions: (roleId: number | string) =>
		`/v1/roles/${roleId}/permissions`,
	permissions: "/v1/permissions",
	codes: "/v1/codes",
	workingDays: "/v1/workingdays",
	holidays: "/v1/holidays",
	delinquencyBuckets: "/v1/delinquency/buckets",
	delinquencyRanges: "/v1/delinquency/ranges",
	businessDate: "/v1/businessdate",
	configurations: "/v1/configurations",
	accountNumberFormats: "/v1/accountnumberformats",
	accountNumberFormatsTemplate: "/v1/accountnumberformats/template",
	jobs: "/v1/jobs",
	audits: "/v1/audits",
	batches: "/v1/batches",
	datatables: "/v1/datatables",
	clients: "/v1/clients",
	clientsTemplate: "/v1/clients/template",

	// Financial Setup
	currencies: "/v1/currencies",

	// Products
	loanProducts: "/v1/loanproducts",
	loanProductTemplate: "/v1/loanproducts/template",
	savingsProducts: "/v1/savingsproducts",
	savingsProductTemplate: "/v1/savingsproducts/template",
	savingsAccounts: "/v1/savingsaccounts",
	charges: "/v1/charges",
	chargeById: (chargeId: number | string) => `/v1/charges/${chargeId}`,

	// Loans
	loans: "/v1/loans",
	loansTemplate: "/v1/loans/template",
	rescheduleLoans: "/v1/rescheduleloans",
	rescheduleLoansTemplate: "/v1/rescheduleloans/template",
	rescheduleLoanById: (scheduleId: number | string) =>
		`/v1/rescheduleloans/${scheduleId}`,
	paymentTypes: "/v1/paymenttypes",
	paymentTypeById: (paymentTypeId: number | string) =>
		`/v1/paymenttypes/${paymentTypeId}`,

	// Loan Nested Resources
	loanGuarantors: (loanId: number) => `/v1/loans/${loanId}/guarantors`,
	loanGuarantorTemplate: (loanId: number) =>
		`/v1/loans/${loanId}/guarantors/template`,
	loanDocuments: (loanId: number) => `/v1/loans/${loanId}/documents`,
	loanCollaterals: (loanId: number) => `/v1/loans/${loanId}/collaterals`,
	loanCollateralTemplate: (loanId: number) =>
		`/v1/loans/${loanId}/collaterals/template`,
	loanTransactions: (loanId: number | string) =>
		`/v1/loans/${loanId}/transactions`,
	loanTransactionTemplate: (loanId: number | string) =>
		`/v1/loans/${loanId}/transactions/template`,

	// Operations - COB
	loansCatchUp: "/v1/loans/catch-up",
	loansCatchUpRunning: "/v1/loans/is-catch-up-running",
	loansOldestCOB: "/v1/loans/oldest-cob-closed",
	reports: "/v1/reports",
	reportsTemplate: "/v1/reports/template",
	reportById: (id: number | string) => `/v1/reports/${id}`,
	reportAvailableExports: (reportName: string) =>
		`/v1/runreports/availableExports/${encodeURIComponent(reportName)}`,
	runReport: (reportName: string) =>
		`/v1/runreports/${encodeURIComponent(reportName)}`,

	// Accounting - Journal Entries
	journalEntries: "/v1/journalentries",
	journalEntryById: (journalEntryId: number | string) =>
		`/v1/journalentries/${journalEntryId}`,
	glaccounts: "/v1/glaccounts",
	glAccountsTemplate: "/v1/glaccounts/template",
	glAccountsDownloadTemplate: "/v1/glaccounts/downloadtemplate",
	glAccountsUploadTemplate: "/v1/glaccounts/uploadtemplate",
	glAccountById: (glAccountId: number | string) =>
		`/v1/glaccounts/${glAccountId}`,
	accountingRules: "/v1/accountingrules",
	accountingRulesTemplate: "/v1/accountingrules/template",
	accountingRuleById: (accountingRuleId: number | string) =>
		`/v1/accountingrules/${accountingRuleId}`,
	financialActivityAccounts: "/v1/financialactivityaccounts",
	financialActivityAccountsTemplate: "/v1/financialactivityaccounts/template",
	financialActivityAccountById: (mappingId: number | string) =>
		`/v1/financialactivityaccounts/${mappingId}`,
	glClosures: "/v1/glclosures",
	glClosureById: (glClosureId: number | string) =>
		`/v1/glclosures/${glClosureId}`,
	provisioningCriteria: "/v1/provisioningcriteria",
	provisioningCriteriaTemplate: "/v1/provisioningcriteria/template",
	provisioningCriteriaById: (criteriaId: number | string) =>
		`/v1/provisioningcriteria/${criteriaId}`,
} as const;

/**
 * BFF routes (internal Next.js API routes)
 */
export const BFF_ROUTES = {
	// Organisation
	offices: "/api/fineract/offices",
	staff: "/api/fineract/staff",
	users: "/api/fineract/users",
	usersTemplate: "/api/fineract/users/template",
	onboarding: "/api/fineract/onboarding",
	roles: "/api/fineract/roles",
	rolePermissions: (roleId: number | string) =>
		`/api/fineract/roles/${roleId}/permissions`,
	permissions: "/api/fineract/permissions",
	codes: "/api/fineract/codes",
	workingDays: "/api/fineract/workingdays",
	holidays: "/api/fineract/holidays",
	delinquencyBuckets: "/api/fineract/delinquency/buckets",
	delinquencyRanges: "/api/fineract/delinquency/ranges",
	businessDate: "/api/fineract/businessdate",
	configurations: "/api/fineract/configurations",
	accountNumberFormats: "/api/fineract/accountnumberformats",
	accountNumberFormatsTemplate: "/api/fineract/accountnumberformats/template",
	jobs: "/api/fineract/jobs",
	audits: "/api/fineract/audits",
	batches: "/api/fineract/batches",
	datatables: "/api/fineract/datatables",
	clients: "/api/fineract/clients",
	clientsTemplate: "/api/fineract/clients/template",
	clientAudit: "/api/fineract/clients/audit",
	clientAccounts: (clientId: number | string) =>
		`/api/fineract/clients/${clientId}/accounts`,
	clientAddresses: (clientId: number | string) =>
		`/api/fineract/clients/${clientId}/addresses`,
	clientIdentifiers: (clientId: number | string) =>
		`/api/fineract/clients/${clientId}/identifiers`,
	clientIdentifierById: (
		clientId: number | string,
		identifierId: number | string,
	) => `/api/fineract/clients/${clientId}/identifiers/${identifierId}`,
	clientTransactions: (clientId: number | string) =>
		`/api/fineract/clients/${clientId}/transactions`,

	// Financial Setup
	currencies: "/api/fineract/currencies",

	// Products
	loanProducts: "/api/fineract/loanproducts",
	loanProductTemplate: "/api/fineract/loanproducts/template",
	savingsProducts: "/api/fineract/savingsproducts",
	savingsProductTemplate: "/api/fineract/savingsproducts/template",
	savingsAccounts: "/api/fineract/savingsaccounts",
	savingsAccountById: (accountId: number | string) =>
		`/api/fineract/savingsaccounts/${accountId}`,
	charges: "/api/fineract/charges",
	chargeById: (chargeId: number | string) =>
		`/api/fineract/charges/${chargeId}`,

	// Loans
	loans: "/api/fineract/loans",
	loansTemplate: "/api/fineract/loans/template",
	rescheduleLoans: "/api/fineract/rescheduleloans",
	rescheduleLoansTemplate: "/api/fineract/rescheduleloans/template",
	rescheduleLoanById: (scheduleId: number | string) =>
		`/api/fineract/rescheduleloans/${scheduleId}`,
	paymentTypes: "/api/fineract/paymenttypes",
	paymentTypeById: (paymentTypeId: number | string) =>
		`/api/fineract/paymenttypes/${paymentTypeId}`,
	loanAudit: "/api/fineract/loans/audit",
	loanGuarantors: (loanId: number) =>
		`/api/fineract/loans/${loanId}/guarantors`,
	loanGuarantorTemplate: (loanId: number) =>
		`/api/fineract/loans/${loanId}/guarantors/template`,
	loanDocuments: (loanId: number) => `/api/fineract/loans/${loanId}/documents`,
	loanCollaterals: (loanId: number) =>
		`/api/fineract/loans/${loanId}/collaterals`,
	loanCollateralTemplate: (loanId: number) =>
		`/api/fineract/loans/${loanId}/collaterals/template`,
	loanTransactions: (loanId: number | string) =>
		`/api/fineract/loans/${loanId}/transactions`,
	loanTransactionTemplate: (loanId: number | string) =>
		`/api/fineract/loans/${loanId}/transactions/template`,

	// Operations - COB
	loansCatchUp: "/api/fineract/loans/catch-up",
	loansCatchUpRunning: "/api/fineract/loans/is-catch-up-running",
	loansOldestCOB: "/api/fineract/loans/oldest-cob-closed",
	reports: "/api/fineract/reports",
	reportsTemplate: "/api/fineract/reports/template",
	reportById: (id: number | string) => `/api/fineract/reports/${id}`,
	reportsPentahoEnforcement: "/api/fineract/reports/pentaho-enforcement",
	reportAvailableExports: (reportName: string) =>
		`/api/fineract/reports/available-exports/${encodeURIComponent(reportName)}`,
	runReport: (reportName: string) =>
		`/api/fineract/reports/run/${encodeURIComponent(reportName)}`,

	// Accounting - Journal Entries
	journalEntries: "/api/fineract/journalentries",
	journalEntryById: (journalEntryId: number | string) =>
		`/api/fineract/journalentries/${journalEntryId}`,
	glaccounts: "/api/fineract/glaccounts",
	glAccountsTemplate: "/api/fineract/glaccounts/template",
	glAccountsDownloadTemplate: "/api/fineract/glaccounts/downloadtemplate",
	glAccountsUploadTemplate: "/api/fineract/glaccounts/uploadtemplate",
	glAccountById: (glAccountId: number | string) =>
		`/api/fineract/glaccounts/${glAccountId}`,
	accountingRules: "/api/fineract/accountingrules",
	accountingRulesTemplate: "/api/fineract/accountingrules/template",
	accountingRuleById: (accountingRuleId: number | string) =>
		`/api/fineract/accountingrules/${accountingRuleId}`,
	financialActivityAccounts: "/api/fineract/financialactivityaccounts",
	financialActivityAccountsTemplate:
		"/api/fineract/financialactivityaccounts/template",
	financialActivityAccountById: (mappingId: number | string) =>
		`/api/fineract/financialactivityaccounts/${mappingId}`,
	glClosures: "/api/fineract/glclosures",
	glClosureById: (glClosureId: number | string) =>
		`/api/fineract/glclosures/${glClosureId}`,
	provisioningCriteria: "/api/fineract/provisioningcriteria",
	provisioningCriteriaTemplate: "/api/fineract/provisioningcriteria/template",
	provisioningCriteriaById: (criteriaId: number | string) =>
		`/api/fineract/provisioningcriteria/${criteriaId}`,
} as const;
