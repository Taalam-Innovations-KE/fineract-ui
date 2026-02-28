import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json({
		legacyOutputTypeSupported: false,
		defaultExportTarget: "JSON",
		availableExportTargets: ["JSON", "PRETTY_JSON", "CSV", "PDF"],
		flags: {
			JSON: "exportJSON=true",
			PRETTY_JSON: "pretty=true",
			CSV: "exportCSV=true",
			PDF: "exportPDF=true",
		},
		note: "Legacy Pentaho output-type values are disabled on this branch. Use datatable export flags only.",
	});
}
