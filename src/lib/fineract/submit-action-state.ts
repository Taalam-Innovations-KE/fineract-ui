import type {
	SubmitActionContext,
	SubmitActionError,
} from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";

export interface SubmitActionState {
	error: SubmitActionError | null;
}

export const INITIAL_SUBMIT_ACTION_STATE: SubmitActionState = {
	error: null,
};

export function successSubmitActionState(): SubmitActionState {
	return { error: null };
}

export function failedSubmitActionState(
	error: unknown,
	context: SubmitActionContext,
): SubmitActionState {
	return {
		error: toSubmitActionError(error, context),
	};
}
