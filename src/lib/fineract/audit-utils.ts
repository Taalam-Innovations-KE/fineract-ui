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

			const itemObj =
				item && typeof item === "object"
					? (item as Record<string, unknown>)
					: null;
			const rawId =
				itemObj?.id ??
				itemObj?.auditId ??
				itemObj?.resourceId ??
				itemObj?.historyId;

			return {
				...event,
				id: rawId !== undefined ? `audit-${String(rawId)}` : `audit-${index}`,
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
		const timestamp = resolveAuditTimestamp(obj);
		if (!timestamp) return null;

		// Extract user - try multiple possible fields
		const user =
			obj.maker ||
			obj.checker ||
			obj.createdBy ||
			obj.lastModifiedBy ||
			obj.user ||
			"System";
		const userStr =
			typeof user === "string"
				? user
				: typeof user === "number"
					? String(user)
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
	// Native audit list fields from /v1/audits
	if (item.actionName && typeof item.actionName === "string") {
		const actionName = item.actionName;
		const status = determineStatusFromProcessingResult(item.processingResult);
		const entityPrefix =
			item.entityName && typeof item.entityName === "string"
				? `${humanizeAuditLabel(item.entityName)} `
				: "";

		return {
			action: `${entityPrefix}${humanizeAuditLabel(actionName)}`.trim(),
			status,
			icon:
				status === "error"
					? "X"
					: status === "warning"
						? "AlertTriangle"
						: "Info",
		};
	}

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

function determineStatusFromProcessingResult(
	value: unknown,
): AuditEvent["status"] {
	if (typeof value !== "string") return "info";
	const normalized = value.toLowerCase();
	if (normalized.includes("processed") || normalized.includes("success")) {
		return "success";
	}
	if (normalized.includes("awaiting") || normalized.includes("pending")) {
		return "warning";
	}
	if (normalized.includes("error") || normalized.includes("failed")) {
		return "error";
	}
	return "info";
}

function humanizeAuditLabel(value: string): string {
	return value
		.replaceAll(/[_-]+/g, " ")
		.trim()
		.replace(/\s+/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveAuditTimestamp(item: Record<string, unknown>): string | null {
	const candidate =
		item.madeOnDate ??
		item.makerDateTime ??
		item.checkerDateTime ??
		item.createdDate ??
		item.lastModifiedDate ??
		item.timestamp;

	if (!candidate) return null;

	if (typeof candidate === "string") return candidate;
	if (typeof candidate === "number") return new Date(candidate).toISOString();
	if (Array.isArray(candidate)) {
		const date = fromDateParts(candidate);
		return date ? date.toISOString() : null;
	}

	return null;
}

function fromDateParts(value: unknown[]): Date | null {
	const numeric = value.filter((v): v is number => typeof v === "number");
	if (numeric.length < 3) return null;
	const [year, month, day, hour = 0, minute = 0, second = 0] = numeric;
	return new Date(year, month - 1, day, hour, minute, second);
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
