import {
  Base,
  Table,
  Record as RecordEntry,
  Field,
  // Cell,
} from "@parkour-ops/airetable-contract";
import {
  getListOfBases,
  getListOfRecordsInTable,
  getListOfTablesInBase,
  AirtableTable,
  AirtableRecord,
} from "../../integrations/airtable";

function extractPrimaryFieldFromTable(table: AirtableTable): Field {
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
  };
}

function extractFieldsFromTable(table: AirtableTable): Record<string, Field> {
  const result: Record<string, Field> = {};
  table.fields.forEach((_f) => {
    result[_f.id] = {
      id: _f.id,
      name: _f.name,
      description: _f.description,
      type: _f.type,
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

async function fetchTables(
  personalAccessToken: string,
  baseId: string
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
      records: await fetchRecords(
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
