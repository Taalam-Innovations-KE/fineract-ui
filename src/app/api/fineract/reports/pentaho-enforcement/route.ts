import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json({
		legacyOutputTypeSupported: false,
		defaultExportTarget: "JSON",
		availableExportTargets: ["JSON", "PRETTY_JSON", "CSV", "PDF", "S3"],
		flags: {
			JSON: "exportJSON=true",
			PRETTY_JSON: "pretty=true",
			CSV: "exportCSV=true",
			PDF: "exportPDF=true",
			S3: "exportS3=true",
		},
		note: "Legacy Pentaho output-type values are disabled on this branch. Use datatable export flags only.",
	});
}
