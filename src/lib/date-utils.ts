import { format, parse, parseISO } from "date-fns";

/**
 * Fineract date format configuration
 */
export const FINERACT_DATE_FORMAT = "dd MMMM yyyy";
export const FINERACT_LOCALE = "en";

/**
 * Formats a Date object to Fineract's expected string format
 */
export function formatDateForFineract(date: Date): string {
	return format(date, FINERACT_DATE_FORMAT);
}

/**
 * Parses a Fineract date string to a Date object
 */
export function parseFineractDate(dateString: string): Date {
	return parse(dateString, FINERACT_DATE_FORMAT, new Date());
}

/**
 * Returns the date format and locale to send with requests
 */
export function getFineractDateConfig() {
	return {
		dateFormat: FINERACT_DATE_FORMAT,
		locale: FINERACT_LOCALE,
	};
}

/**
 * Formats a Date object to ISO string for display
 */
export function formatDateForDisplay(date: Date | string): string {
	if (typeof date === "string") {
		return date;
	}
	return format(date, "dd MMM yyyy");
}

/**
 * Formats a date string (e.g., YYYY-MM-DD) to the specified dateFormat
 */
export function formatDateStringToFormat(
	dateString: string,
	dateFormat: string,
): string {
	try {
		let date: Date;
		// Check if dateString is in YYYY-MM-DD format
		if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
			date = parseISO(dateString);
		} else {
			// Assume it's in the dateFormat, parse it back
			date = parse(dateString, dateFormat, new Date());
		}
		if (isNaN(date.getTime())) {
			throw new Error(`Invalid date string: ${dateString}`);
		}
		return format(date, dateFormat); // Format to specified dateFormat
	} catch (error) {
		console.error("Error formatting date:", error, dateString, dateFormat);
		throw error;
	}
}
