import {
  makeUnpaginatingAirtableGetRequest,
  makeAirtableGetRequest,
} from "./requests-factory";
import {
  AirtableListBasesResponse,
  AirtableListTablesResponse,
  AirtableListRecordsResponse,
} from "./resource-responses";
import assert from "node:assert"; // TODO: replace this with throw errors

export function getListOfBases(personalAccessToken: string) {
  assert(personalAccessToken.length > 0);
  return makeUnpaginatingAirtableGetRequest<AirtableListBasesResponse>(
    personalAccessToken,
    `https://api.airtable.com/v0/meta/bases`,
    (newResult, accumulatingResult) => {
      accumulatingResult.bases.push(...newResult.bases);
    }
  );
}

export function getListOfTablesInBase(
  personalAccessToken: string,
  baseId: string
) {
  assert(personalAccessToken.length > 0);
  assert(baseId.length > 0);
  return makeAirtableGetRequest<AirtableListTablesResponse>(
    personalAccessToken,
    `https://api.airtable.com/v0/meta/bases/${baseId}/tables`
  );
}

export function getListOfRecordsInTable(
  personalAccessToken: string,
  baseId: string,
  tableId: string
) {
  assert(personalAccessToken.length > 0);
  assert(baseId.length > 0);
  assert(tableId.length > 0);
  return makeUnpaginatingAirtableGetRequest<AirtableListRecordsResponse>(
    personalAccessToken,
    `https://api.airtable.com/v0/${baseId}/${tableId}`,
    (newResult, accumulatingResult) => {
      accumulatingResult.records.push(...newResult.records);
    },
    {
      returnFieldsByFieldId: "true",
    }
  );
}
