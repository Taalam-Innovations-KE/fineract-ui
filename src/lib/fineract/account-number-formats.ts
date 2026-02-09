import type {
	GetAccountNumberFormatsIdResponse,
	PostAccountNumberFormatsRequest,
} from "@/lib/fineract/generated/types.gen";

export const PREFIX_SHORT_NAME_TYPE_ID = 401;

export type AccountNumberFormatRecord = GetAccountNumberFormatsIdResponse & {
	prefixCharacter?: string;
};

export type AccountNumberFormatMutationRequest =
	PostAccountNumberFormatsRequest & {
		prefixCharacter?: string;
	};
