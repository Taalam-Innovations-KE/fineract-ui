# Client Onboarding Field Matrix

Source template: `GET /v1/clients/template?staffInSelectedOfficeOnly=true`  
Captured on: `2026-02-07`  
Tenant: `default`

## Template Snapshot

| Template key | Value |
|---|---|
| `activationDate` | `[2026, 2, 7]` |
| `officeId` | `1` |
| `isStaff` | `false` |
| `isAddressEnabled` | `false` |
| `officeOptions` | `6` |
| `staffOptions` | `1` |
| `genderOptions` | `2` |
| `clientLegalFormOptions` | `2` (`Person`, `Entity`) |
| `clientTypeOptions` | `0` |
| `clientClassificationOptions` | `0` |
| `clientNonPersonMainBusinessLineOptions` | `0` |
| `savingProductOptions` | `0` |

## Step 1: Profile

| Field | Individual | Organization | Required | Source |
|---|---|---|---|---|
| `officeId` | Yes | Yes | Yes | Template (`officeOptions`) |
| `clientKind` (UI state) | Yes | Yes | Yes | UI-only routing field |
| `legalFormId` | Yes | Yes | Yes | Template (`clientLegalFormOptions`) |

## Step 2: Identity Details

| Field | Individual | Organization | Required | Source |
|---|---|---|---|---|
| `firstname` | Yes | No | Yes (individual) | User input |
| `lastname` | Yes | No | Yes (individual) | User input |
| `middlename` | Yes | No | No | User input |
| `dateOfBirth` | Yes | No | No | User input |
| `genderId` | Yes | No | No | Template (`genderOptions`) |
| `fullname` | No | Yes | Yes (organization) | User input |
| `businessTypeId` -> `clientNonPersonDetails.mainBusinessLineId` | No | Yes | Yes (organization) | Template (`clientNonPersonMainBusinessLineOptions`) |
| `staffId` | Yes | Yes | No | Template (`staffOptions`) |
| `savingsProductId` | Yes | Yes | No | Template (`savingProductOptions`) |

## Step 3: Contact and KYC

| Field | Individual | Organization | Required | Source |
|---|---|---|---|---|
| `mobileNo` | Yes | Yes | No | User input |
| `emailAddress` | Yes | Yes | No | User input |
| `externalId` | Yes | Yes | No | User input |
| `clientTypeId` | Yes | Yes | No | Template (`clientTypeOptions`) |
| `clientClassificationId` | Yes | Yes | No | Template (`clientClassificationOptions`) |
| `nationalId` | Yes | No | One of `nationalId` or `passportNo` | User input + identifier template |
| `passportNo` | Yes | No | One of `nationalId` or `passportNo` | User input + identifier template |
| `businessLicenseNo` | No | Yes | Yes (organization) | User input + identifier template |
| `registrationNo` | No | Yes | No | User input + identifier template |
| `taxId` | Yes | Yes | No | User input + identifier template |

## Step 4: Address and Activation

| Field | Individual | Organization | Required | Source |
|---|---|---|---|---|
| `active` | Yes | Yes | No | User input |
| `activationDate` | Yes | Yes | Required when `active=true` | Template default + user input |
| `addressLine1` | Yes | Yes | No | User input |
| `city` | Yes | Yes | Required when `isAddressEnabled=true` | User input |
| `countryId` | Yes | Yes | Required when `isAddressEnabled=true` | Template (`addressOptions.countryIdOptions`) |

## Submission Mapping

`POST /v1/clients` currently submits:

- Always: `officeId`, `active`, `legalFormId`, `locale`
- Conditional dates: `activationDate`, `dateOfBirth`, `dateFormat`
- Individual: `firstname`, `middlename`, `lastname`, `genderId`
- Organization: `fullname`, `clientNonPersonDetails.mainBusinessLineId`
- Optional shared: `mobileNo`, `emailAddress`, `externalId`, `clientTypeId`, `clientClassificationId`, `staffId`, `savingsProductId`
- Optional address: `address[]` when address is enabled

Identifier documents are posted separately to `POST /v1/clients/{clientId}/identifiers`.

## Current Configuration Gaps

| Gap | Impact |
|---|---|
| `clientNonPersonMainBusinessLineOptions` is empty | Organization onboarding is blocked |
| `clientTypeOptions` is empty | Client type cannot be selected |
| `clientClassificationOptions` is empty | Classification cannot be selected |
| `savingProductOptions` is empty | Default savings product cannot be selected |
| `isAddressEnabled=false` | Address inputs are not required in current tenant |
