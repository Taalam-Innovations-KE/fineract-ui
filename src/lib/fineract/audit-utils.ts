export interface AuditEvent {
	id: string;
	timestamp: string;
	action: string;
	user: string;
	details?: Record<string, unknown>;
	status: "success" | "warning" | "error" | "info";
	icon?: string;
}

/**
 * Transform raw Fineract audit data into user-friendly audit events
 */
export function transformAuditData(rawAudit: unknown[]): AuditEvent[] {
	if (!Array.isArray(rawAudit)) {
		return [];
	}

	return rawAudit
		.map((item, index) => {
			// Handle different possible audit data structures
			const event = mapAuditItemToEvent(item);
			if (!event) return null;

			return {
				...event,
				id: `audit-${index}`,
			};
		})
		.filter((event): event is AuditEvent => event !== null)
		.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);
}

/**
 * Map individual audit item to AuditEvent
 */
function mapAuditItemToEvent(item: unknown): Omit<AuditEvent, "id"> | null {
	try {
		if (!item || typeof item !== "object") return null;

		const obj = item as Record<string, unknown>;

		// Extract timestamp - try multiple possible fields
		const timestamp = obj.createdDate || obj.lastModifiedDate || obj.timestamp;
		if (!timestamp || typeof timestamp !== "string") return null;

		// Extract user - try multiple possible fields
		const user = obj.createdBy || obj.lastModifiedBy || obj.user || "System";
		const userStr =
			typeof user === "string"
				? user
				: typeof user === "object" &&
						user &&
						"username" in user &&
						typeof (user as Record<string, unknown>).username === "string"
					? ((user as Record<string, unknown>).username as string)
					: "Unknown";

		// Determine action and status based on available data
		const { action, status, icon } = determineActionAndStatus(obj);

		return {
			timestamp,
			action,
			user: userStr,
			details: obj,
			status,
			icon,
		};
	} catch (error) {
		console.warn("Failed to map audit item:", item, error);
		return null;
	}
}

/**
 * Determine action type, status, and icon based on audit item data
 */
function determineActionAndStatus(item: Record<string, unknown>): {
	action: string;
	status: AuditEvent["status"];
	icon?: string;
} {
	// Check for command-based actions (from our loan command API)
	if (item.command && typeof item.command === "string") {
		switch (item.command) {
			case "approve":
				return {
					action: "Loan Approved",
					status: "success",
					icon: "CheckCircle",
				};
			case "disburse":
				return {
					action: "Loan Disbursed",
					status: "success",
					icon: "DollarSign",
				};
			case "reject":
				return { action: "Loan Rejected", status: "error", icon: "X" };
			case "withdraw":
				return {
					action: "Loan Withdrawn",
					status: "warning",
					icon: "AlertTriangle",
				};
			case "undoapproval":
				return { action: "Approval Undone", status: "warning", icon: "Undo" };
			default:
				return { action: `Loan ${item.command}`, status: "info" };
		}
	}

	// Check for status changes
	if (item.status && typeof item.status === "string") {
		const statusStr = item.status.toLowerCase();
		if (statusStr.includes("approved")) {
			return {
				action: "Status Changed to Approved",
				status: "success",
				icon: "CheckCircle",
			};
		}
		if (statusStr.includes("disbursed")) {
			return {
				action: "Status Changed to Disbursed",
				status: "success",
				icon: "DollarSign",
			};
		}
		if (statusStr.includes("rejected")) {
			return {
				action: "Status Changed to Rejected",
				status: "error",
				icon: "X",
			};
		}
	}

	// Check for creation events
	if (item.id && !item.lastModifiedDate) {
		return { action: "Loan Created", status: "info", icon: "Plus" };
	}

	// Check for modification events
	if (item.lastModifiedDate) {
		return { action: "Loan Modified", status: "info", icon: "Edit" };
	}

	// Default fallback
	return { action: "Audit Event", status: "info", icon: "Info" };
}

/**
 * Format timestamp for display
 */
export function formatAuditTimestamp(timestamp: string): string {
	try {
		const date = new Date(timestamp);
		return date.toLocaleString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	} catch {
		return timestamp;
	}
}

/**
 * Filter audit events by criteria
 */
export interface AuditFilters {
	dateFrom?: string;
	dateTo?: string;
	user?: string;
	action?: string;
	status?: AuditEvent["status"];
}

export function filterAuditEvents(
	events: AuditEvent[],
	filters: AuditFilters,
): AuditEvent[] {
	return events.filter((event) => {
		if (filters.dateFrom) {
			const eventDate = new Date(event.timestamp);
			const fromDate = new Date(filters.dateFrom);
			if (eventDate < fromDate) return false;
		}

		if (filters.dateTo) {
			const eventDate = new Date(event.timestamp);
			const toDate = new Date(filters.dateTo);
			toDate.setHours(23, 59, 59, 999); // End of day
			if (eventDate > toDate) return false;
		}

		if (
			filters.user &&
			!event.user.toLowerCase().includes(filters.user.toLowerCase())
		) {
			return false;
		}

		if (
			filters.action &&
			!event.action.toLowerCase().includes(filters.action.toLowerCase())
		) {
			return false;
		}

		if (filters.status && event.status !== filters.status) {
			return false;
		}

		return true;
	});
}

/**
 * Get unique values for filter dropdowns
 */
export function getAuditFilterOptions(events: AuditEvent[]) {
	const users = [...new Set(events.map((e) => e.user))].sort();
	const actions = [...new Set(events.map((e) => e.action))].sort();
	const statuses: AuditEvent["status"][] = [
		"success",
		"warning",
		"error",
		"info",
	];

	return { users, actions, statuses };
}
