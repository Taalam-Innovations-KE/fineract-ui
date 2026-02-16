import { redirect } from "next/navigation";

export default function LegacyPaymentTypesPage() {
	redirect("/config/financial/accounting/payment-types");
}
