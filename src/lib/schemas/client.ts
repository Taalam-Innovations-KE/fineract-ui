export type ClientKind = "individual" | "business";

export type LookupOption = {
	id?: number;
	name?: string;
	value?: string;
	isDefault?: boolean;
};

export type OfficeData = {
	id: number;
	name: string;
	nameDecorated?: string;
};

export type AddressOptions = {
	addressTypeIdOptions?: LookupOption[];
	countryIdOptions?: LookupOption[];
	stateProvinceIdOptions?: LookupOption[];
};

export type ClientTemplateResponse = {
	isAddressEnabled?: boolean;
	address?: AddressOptions;
	addressOptions?: AddressOptions;
	clientClassificationOptions?: LookupOption[];
	clientLegalFormOptions?: LookupOption[];
	clientNonPersonMainBusinessLineOptions?: LookupOption[];
	clientTypeOptions?: LookupOption[];
	genderOptions?: LookupOption[];
	officeOptions?: OfficeData[];
	staffOptions?: Array<{ id: number; displayName: string }>;
	savingProductOptions?: LookupOption[];
};

export type ClientFormData = {
	clientKind: ClientKind;
	firstname: string;
	middlename?: string;
	lastname: string;
	fullname: string;
	officeId?: number;
	genderId?: number;
	clientTypeId?: number;
	clientClassificationId?: number;
	legalFormId?: number;
	businessTypeId?: number;
	mobileNo?: string;
	emailAddress?: string;
	externalId?: string;
	active?: boolean;
	activationDate?: string;
	dateOfBirth?: string;
	addressLine1?: string;
	city?: string;
	countryId?: number;
	nationalId?: string;
	passportNo?: string;
	taxId?: string;
	businessLicenseNo?: string;
	registrationNo?: string;
	groupId?: number;
	savingsProductId?: number;
	staffId?: number;
	datatables?: Array<Record<string, unknown>>;
};
