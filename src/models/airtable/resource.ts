import {
  Base,
  Table,
  Record as RecordEntry,
  Field,
  RecordsReference,
  FieldsReference,
  // Cell,
} from "@parkour-ops/airetable-contract";
import {
  getListOfBases,
  getListOfRecordsInTable,
  getListOfTablesInBase,
  AirtableTable,
  AirtableRecord,
  AirtableField,
  AirtableFieldType,
  MultipleRecordLinksTypeReadOption,
  FormulaTypeReadOption,
  RollupTypeReadOption,
  CurrencyTypeReadOption,
  NumberTypeReadOption,
  PercentTypeReadOption,
  DurationTypeReadOption,
  SingleSelectTypeReadOption,
  MultipleSelectsTypeReadOption,
  ExternalSyncSourceTypeReadOption
} from "../../integrations/airtable";

function extractPrimaryFieldFromTable(table: AirtableTable): Field<any> {
  const _primaryField = table.fields.find(
    (_f) => _f.id === table.primaryFieldId
  );
  if (!_primaryField)
    throw Error("Failed to extract primary field from raw table data.");
  return {
    id: _primaryField.id,
    name: _primaryField.name,
    description: _primaryField.description,
    type: _primaryField.type,
    references: computeReferences(table, _primaryField),
    currencySymbol: computeCurrencySymbol(_primaryField),
    precision: computePrecision(_primaryField),
    formatString: computeFormatString(_primaryField),
    selectionChoices: computeSelectionChoices(_primaryField)
  };
}

// TODO: Clean this up!
function computeReferences<T extends AirtableFieldType>(table: AirtableTable, field: AirtableField<T>) {
  switch (field.type) {
    case "multipleRecordLinks":
      const mriOptions = (<MultipleRecordLinksTypeReadOption>field.options);
      const mriLinkedTableId = mriOptions.linkedTableId;
      const mriInverseReferenceFieldId = mriOptions.inverseLinkFieldId;
      const mriLimitedToOneRecord = mriOptions.prefersSingleRecordLink;
      return <RecordsReference>{
        recordsFromTable: {
          table: {
            id: mriLinkedTableId,
            inverseReferenceFieldId: mriInverseReferenceFieldId,
          },
          limitedToOneRecord: mriLimitedToOneRecord
        }
      };
    case "formula":
      const fieldIds = (<FormulaTypeReadOption>field.options).referencedFieldIds;
      return <FieldsReference>{
        fieldsOfTable: fieldIds ? fieldIds.map( fId => { return { tableId: table.id, fieldId: fId } }) : []
      }
    case "rollup":
      const rollupResult = <FieldsReference>{
        fieldsOfTable: []
      };
      const rollupOptions = (<RollupTypeReadOption>field.options);
      const rollupLinkedTableId = (()=>{
        const recordLinkFieldId = rollupOptions?.recordLinkFieldId;
        if (!recordLinkFieldId) return;
        const recordLinkField = table.fields.find(f => f.id === recordLinkFieldId);
        if (!recordLinkField) return;
        return (<MultipleRecordLinksTypeReadOption>recordLinkField.options).linkedTableId;
      })();
      const rollupFieldInLinkedTable = rollupOptions.fieldIdInLinkedTable;
      if (rollupLinkedTableId && rollupFieldInLinkedTable)
        rollupResult.fieldsOfTable.push({ tableId: rollupLinkedTableId, fieldId: rollupFieldInLinkedTable });
      if (rollupOptions.referencedFieldIds) {
        rollupResult.fieldsOfTable.push(
          ...rollupOptions.referencedFieldIds.map( fId => { return {tableId: table.id, fieldId: fId} })
        );
      }
      return rollupResult;
    default:
      return undefined;
  }
}

function computeCurrencySymbol<T extends AirtableFieldType>(field: AirtableField<T>) {
  if (field.type === "currency") {
    return (<CurrencyTypeReadOption>field.options).symbol;
  }
  return undefined;
}

function computePrecision<T extends AirtableFieldType>(field: AirtableField<T>) {
  if (field.type === "currency") {
    return (<CurrencyTypeReadOption>field.options).precision;
  }
  else if (field.type === "number") {
    return (<NumberTypeReadOption>field.options).precision;
  }
  else if (field.type === "percent") {
    return (<PercentTypeReadOption>field.options).precision;
  }
  else return undefined;
}

function computeFormatString<T extends AirtableFieldType>(field: AirtableField<T>) {
  if (field.type === "duration") {
    return (<DurationTypeReadOption>field.options).durationFormat;
  }
  return undefined;
}

function computeSelectionChoices<T extends AirtableFieldType>(field: AirtableField<T>) {
  if (field.type === "singleSelect" || field.type === "multipleSelects" || field.type === "externalSyncSource") {
    return (<SingleSelectTypeReadOption | MultipleSelectsTypeReadOption | ExternalSyncSourceTypeReadOption>field.options).choices.map( c => { return { id: c.id, name: c.name } });
  }
  return undefined;
}

function extractFieldsFromTable(table: AirtableTable): Record<string, Field<any>> {
  const result: Record<string, Field<any>> = {};
  table.fields.forEach((_f) => {
    result[_f.id] = {
      id: _f.id,
      name: _f.name,
      description: _f.description,
      type: _f.type,
      references: computeReferences(table, _f),
      currencySymbol: computeCurrencySymbol(_f),
      precision: computePrecision(_f),
      formatString: computeFormatString(_f),
      selectionChoices: computeSelectionChoices(_f)
    };
  });
  return result;
}

// function extractCellsFromRecord(
//   record: AirtableRecord,
//   tableFields: ReturnType<typeof extractFieldsFromTable>
// ): Record<string, Cell> {
//   const result: Record<string, Cell> = {};
//   Object.entries(record.fields).forEach(([_fId, _fVal]) => {
//     result[_fId] = {
//       field: tableFields[_fId],
//       value: _fVal,
//     };
//   });
//   return result;
// }

async function fetchRecords(
  personalAccessToken: string,
  baseId: string,
  tableId: string,
  tableFields: ReturnType<typeof extractFieldsFromTable>
): Promise<Record<string, RecordEntry>> {
  const result: Record<string, RecordEntry> = {};
  // get records for table
  const _records = (
    await getListOfRecordsInTable(personalAccessToken, baseId, tableId)
  ).records;
  // produce entry for each entry
  _records.forEach((_r) => {
    result[_r.id] = {
      id: _r.id,
      createdTime: Date.parse(_r.createdTime),
      cells: _r.fields, //extractCellsFromRecord(_r, tableFields),
    };
  });
  // return
  return result;
}

export async function fetchTables(
  personalAccessToken: string,
  baseId: string,
  omitRecords?: boolean
): Promise<Record<string, Table>> {
  const result: Record<string, Table> = {};
  // get tables info for base
  const _tables = (await getListOfTablesInBase(personalAccessToken, baseId))
    .tables;
  // produce table for every entry
  for (const _t of _tables) {
    const tableFields = extractFieldsFromTable(_t);
    result[_t.id] = {
      id: _t.id,
      name: _t.name,
      description: _t.description,
      primaryField: extractPrimaryFieldFromTable(_t),
      fields: tableFields,
      records: omitRecords ? {} :
        await fetchRecords(
          personalAccessToken,
          baseId,
          _t.id,
          tableFields
        ),
    };
  }
  // return
  return result;
}

export async function readBase(
  personalAccessToken: string,
  baseId: string
): Promise<Base | null> {
  // get base info for requested base
  const _bases = (await getListOfBases(personalAccessToken)).bases;
  const _baseInfo = _bases.find((_b) => _b.id === baseId);
  if (!_baseInfo) return null;
  // produce result base stub
  const base: Base = {
    id: _baseInfo.id,
    name: _baseInfo.name,
    tables: await fetchTables(personalAccessToken, baseId),
  };
  // return
  return base;
}
