export type AirtableFieldType =
  | "singleLineText"
  | "email"
  | "url"
  | "multilineText"
  | "number"
  | "percent"
  | "currency"
  | "singleSelect"
  | "multipleSelects"
  | "singleCollaborator"
  | "multipleCollaborators"
  | "multipleRecordLinks"
  | "date"
  | "dateTime"
  | "phoneNumber"
  | "multipleAttachments"
  | "checkbox"
  | "formula"
  | "createdTime"
  | "rollup"
  | "count"
  | "lookup"
  | "multipleLookupValues"
  | "autoNumber"
  | "barcode"
  | "rating"
  | "richText"
  | "duration"
  | "lastModifiedTime"
  | "button"
  | "createdBy"
  | "lastModifiedBy"
  | "externalSyncSource";

// NOTE: Options for data/time types are omitted: createdTime, lastModifiedTime, date, dateTime,

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#multipleattachment-fieldtype-options}
 */
export interface MultipleAttachmentsTypeReadOption {
  isReversed: boolean;
}

export type SingleCollaboratorTypeReadOption = Record<any, any>;
export type MultipleCollaboratorsTypeReadOption =
  SingleCollaboratorTypeReadOption;

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#checkbox-fieldtype-options}
 */
export interface CheckboxTypeReadOption {
  color:
    | "yellowBright"
    | "orangeBright"
    | "redBright"
    | "pinkBright"
    | "purpleBright"
    | "blueBright"
    | "cyanBright"
    | "tealBright"
    | "greenBright"
    | "grayBright";
  icon: "check" | "xCheckbox" | "star" | "heart" | "thumbsUp" | "flag" | "dot";
}

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#count-fieldtype-options}
 */
export interface CountTypeReadOption {
  isValid: boolean;
  recordLinkFieldId?: string | null;
}

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#currencynumber-fieldtype-options}
 */
export interface CurrencyTypeReadOption {
  precision: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  symbol: string;
}

/**
 * See {@link https://airtable.com/developers/web/api/field-model#durationnumber-fieldtype-options}
 */
export interface DurationTypeReadOption {
  durationFormat:
    | "h:mm"
    | "h:mm:ss"
    | "h:mm:ss.S"
    | "h:mm:ss.SS"
    | "h:mm:ss.SSS";
}

/**
 * See {@link https://airtable.com/developers/web/api/field-model#formula-fieldtype-options}
 */
export interface FormulaTypeReadOption {
  isValid: boolean;
  referencedFieldIds: Array<string> | null;
  result: any; // TODO
}

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#foreignkey-fieldtype-options}
 */
export interface MultipleRecordLinksTypeReadOption {
  isReversed: false;
  linkedTableId: string;
  prefersSingleRecordLink: boolean;
  inverseLinkFieldId?: string;
  viewIdForRecordSelection?: string;
}

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#lookup-fieldtype-options}
 */
export interface LookupTypeReadOption {
  fieldIdInLinkedTable: string | null;
  isValid: boolean;
  recordLinkFieldId: string | null;
  result: any; // TODO
}

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#multiselect-fieldtype-options}
 */
export interface MultipleSelectsTypeReadOption {
  choices: Array<{
    id: string;
    name: string;
    color?:
      | "blueLight2"
      | "cyanLight2"
      | "tealLight2"
      | "greenLight2"
      | "yellowLight2"
      | "orangeLight2"
      | "redLight2"
      | "pinkLight2"
      | "purpleLight2"
      | "grayLight2"
      | "blueLight1"
      | "cyanLight1"
      | "tealLight1"
      | "greenLight1"
      | "yellowLight1"
      | "orangeLight1"
      | "redLight1"
      | "pinkLight1"
      | "purpleLight1"
      | "grayLight1"
      | "blueBright"
      | "cyanBright"
      | "tealBright"
      | "greenBright"
      | "yellowBright"
      | "orangeBright"
      | "redBright"
      | "pinkBright"
      | "purpleBright"
      | "grayBright"
      | "blueDark1"
      | "cyanDark1"
      | "tealDark1"
      | "greenDark1"
      | "yellowDark1"
      | "orangeDark1"
      | "redDark1"
      | "pinkDark1"
      | "purpleDark1"
      | "grayDark1";
  }>;
}

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#select-fieldtype-options}
 */
export type SingleSelectTypeReadOption = MultipleSelectsTypeReadOption;

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#decimalorintegernumber-fieldtype-options}
 */
export interface NumberTypeReadOption {
  precision: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#percentnumber-fieldtype-options}
 */
export interface PercentTypeReadOption {
  precision: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#rating-fieldtype-options}
 */
export interface RatingTypeReadOption {
  color:
    | "yellowBright"
    | "orangeBright"
    | "redBright"
    | "pinkBright"
    | "purpleBright"
    | "blueBright"
    | "cyanBright"
    | "tealBright"
    | "greenBright"
    | "grayBright";
  icon: "star" | "heart" | "thumbsUp" | "flag" | "dot";
  max: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
}

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#rollup-fieldtype-options}
 */
export interface RollupTypeReadOption {
  fieldIdInLinkedTable?: string;
  recordLinkFieldId?: string;
  result?: any;
  isValid?: boolean;
  referencedFieldIds?: Array<string>;
}

/**
 * See: {@link https://airtable.com/developers/web/api/field-model#syncsource-fieldtype-options}
 */
export type ExternalSyncSourceTypeReadOption = MultipleSelectsTypeReadOption;

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

export interface AirtableField<T extends AirtableFieldType> {
  id: string;
  name: string;
  description: string;
  type: T;
  options: T extends "checkbox"
    ? CheckboxTypeReadOption
    : T extends "count"
    ? CountTypeReadOption
    : T extends "currency"
    ? CurrencyTypeReadOption
    : T extends "duration"
    ? DurationTypeReadOption
    : T extends "formula"
    ? FormulaTypeReadOption
    : T extends "multipleRecordLinks"
    ? MultipleRecordLinksTypeReadOption
    : T extends "lookup"
    ? LookupTypeReadOption
    : T extends "multipleSelects"
    ? MultipleSelectsTypeReadOption
    : T extends "number"
    ? NumberTypeReadOption
    : T extends "percent"
    ? PercentTypeReadOption
    : T extends "rating"
    ? RatingTypeReadOption
    : T extends "rollup"
    ? RollupTypeReadOption
    : T extends "singleSelect"
    ? SingleSelectTypeReadOption
    : T extends "externalSyncSource"
    ? ExternalSyncSourceTypeReadOption
    : T extends "singleCollaborator"
    ? SingleCollaboratorTypeReadOption
    : T extends "multipleCollaborators"
    ? MultipleCollaboratorsTypeReadOption
    : unknown;
}

export interface AirtableTable {
  id: string;
  name: string;
  description: string;
  primaryFieldId: string;
  fields: Array<AirtableField<any>>;
}

export interface AirtableRecord {
  id: string;
  createdTime: string; // A date timestamp in the ISO format, eg:"2018-01-01T00:00:00.000Z"
  fields: {
    [fieldIdOrName: string]: any;
  };
}

export interface AirtableListBasesResponse {
  bases: Array<AirtableBase>;
  offset?: string | undefined;
}

export interface AirtableListTablesResponse {
  tables: Array<AirtableTable>;
}

export interface AirtableListRecordsResponse {
  records: Array<AirtableRecord>;
  offset?: string | undefined;
}
