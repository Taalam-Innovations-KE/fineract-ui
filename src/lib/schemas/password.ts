export const FINERACT_PASSWORD_REGEX =
	/^(?!.*(.)\1)(?!.*\s)(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^\w\s]).{12,50}$/;

export const FINERACT_PASSWORD_MESSAGE =
	"Password must be 12-50 characters, include uppercase, lowercase, number, and symbol, and cannot contain spaces or repeating characters.";
