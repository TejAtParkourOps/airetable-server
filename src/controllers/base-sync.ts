import {
  Change,
  makeErrorResponse,
  makeSuccessResponse,
  StartSyncBaseRequest,
  StartSyncBaseResponse,
  SyncNotification,
  Field,
  Record as Rec,
} from "@parkour-ops/airetable-contract";
import { readProject } from "../models/project";
import {
  readBase,
  DecodedIdToken,
  AirtableWebhookNotification,
  ensureBaseEntry,
  readBaseEntry,
} from "../models/airtable";
import {
  SocketIoRouteHandler,
  RestApiRouteHandler,
  registerEvent,
} from "../server-framework";
import { Socket as SocketIoSocket, Server as SocketIoServer } from "socket.io";
import {
  getListOfWebhookPayloads,
  WebhookPayload,
  CreateTableSpec,
  ChangeTableSpec,
  CreateFieldSpec,
  CreateRecordSpec,
  ChangeFieldSpec,
  ChangeRecordSpec,
} from "../integrations/airtable";
import { untitled, undescribed } from "../generic";

export type BaseChangedEvent = {
  baseId: string;
  webhookId: string;
  timestamp: number;
};

async function subscribeToBaseChangedEvent(
  args: {
    socket: SocketIoSocket,
    personalAccessToken: string,
    baseId: string
  }
) {
  const {socket, personalAccessToken, baseId} = args;
  // ensure webhook is set up so we can receive change notifications at REST endpoint
  await ensureBaseEntry({personalAccessToken, baseId});
  // add user socket (representing session webhook) to room associated with base (since each base has only one webhook, shared across all projects affiliated with the base)
  socket.join(baseId);
}

function fieldSpecsToFields(
  baseId: string,
  tableId: string,
  fieldSpecs?: { [id: string]: CreateFieldSpec }
) {
  const fields: { [id: string]: Field } = {};
  if (!fieldSpecs) return fields;
  for (const [fieldId, fieldSpec] of Object.entries(fieldSpecs)) {
    fields[fieldId] = {
      id: fieldId,
      name: fieldSpec.name,
      description: undescribed,
      type: fieldSpec.type,
    };
  }
  return fields;
}

// function cellSpecsToCells(
//   tableFields: { [id: string]: Field },
//   cellSpecs?: { [id: string]: any }
// ) {
//   const cells: { [id: string]: Cell } = {};
//   if (!cellSpecs) return cells;
//   for (const [fieldId, cellValue] of Object.entries(cellSpecs)) {
//     cells[fieldId] = {
//       field: tableFields[fieldId],
//       value: cellValue,
//     };
//   }
//   return cells;
// }

function recordSpecsToRecords(
  baseId: string,
  tableId: string,
  tableFields: { [id: string]: Field },
  recordSpecs?: { [id: string]: CreateRecordSpec }
) {
  const records: { [id: string]: Rec } = {};
  if (!recordSpecs) return records;
  for (const [recordId, recordSpec] of Object.entries(recordSpecs)) {
    records[recordId] = {
      id: recordId,
      createdTime: Date.parse(recordSpec.createdTime),
      cells: recordSpec.cellValuesByFieldId, //cellSpecsToCells(tableFields, recordSpec.cellValuesByFieldId),
    };
  }
  return records;
}

function parseTableAdditions(
  baseId: string,
  createTableSpecs?: { [id: string]: CreateTableSpec }
) {
  const tablesToAdd: Array<Change<"create", "table">> = [];
  if (!createTableSpecs) return tablesToAdd;
  for (const [tableId, tableSpec] of Object.entries(createTableSpecs)) {
    const tableFields = fieldSpecsToFields(
      baseId,
      tableId,
      tableSpec.fieldsById
    );
    tablesToAdd.push({
      type: "create",
      resourceAddress: {
        is: "table",
        baseId,
        tableId,
        recordId: null,
        fieldId: null,
      },
      data: {
        id: tableId,
        name: tableSpec.metadata?.name ?? untitled,
        description: tableSpec.metadata?.description ?? undescribed,
        primaryField: tableFields[Object.keys(tableFields)[0]],
        fields: tableFields,
        records: recordSpecsToRecords(
          baseId,
          tableId,
          tableFields,
          tableSpec.recordsById
        ),
      },
    });
  }
  return tablesToAdd;
}

function parseTableDeletions(
  baseId: string,
  deletedTablesById?: Array<string>
) {
  const tablesToDelete: Array<Change<"delete", "table">> = [];
  if (!deletedTablesById) return tablesToDelete;
  for (const id in deletedTablesById) {
    tablesToDelete.push({
      type: "delete",
      resourceAddress: {
        is: "table",
        baseId,
        tableId: id,
        recordId: null,
        fieldId: null,
      },
      data: null,
    });
  }
  return tablesToDelete;
}

function parseFieldCreationInTable(
  baseId: string,
  tableId: string,
  createFieldSpec?: { [id: string]: CreateFieldSpec }
) {
  const fieldsToCreate: Array<Change<"create", "field">> = [];
  if (!createFieldSpec) return fieldsToCreate;
  //
  for (const [key, val] of Object.entries(createFieldSpec)) {
    fieldsToCreate.push({
      type: "create",
      resourceAddress: {
        is: "field",
        baseId,
        tableId,
        fieldId: key,
        recordId: null,
      },
      data: {
        id: key,
        name: val?.name ?? untitled,
        description: undescribed,
        type: val?.type,
      },
    });
  }
  //
  return fieldsToCreate;
}

function parseFieldUpdateInTable(
  baseId: string,
  tableId: string,
  changeFieldSpec?: { [id: string]: ChangeFieldSpec }
) {
  const fieldsToUpdate: Array<Change<"update", "field">> = [];
  if (!changeFieldSpec) return fieldsToUpdate;
  //
  for (const [fieldId, fieldSpec] of Object.entries(changeFieldSpec)) {
    fieldsToUpdate.push({
      type: "update",
      resourceAddress: {
        is: "field",
        baseId,
        tableId,
        fieldId,
        recordId: null,
      },
      data: {
        id: fieldId,
        name: fieldSpec.current.name ?? fieldSpec.previous?.name ?? untitled,
        type: fieldSpec.current.type ?? fieldSpec.previous?.type,
      },
    });
  }
  //
  return fieldsToUpdate;
}

function parseFieldDeletionInTable(
  baseId: string,
  tableId: string,
  deleteFieldSpec: Array<string>
) {
  const fieldsToDelete: Array<Change<"delete", "field">> = [];
  if (!deleteFieldSpec) return fieldsToDelete;
  //
  for (const fieldId in deleteFieldSpec) {
    fieldsToDelete.push({
      type: "delete",
      resourceAddress: {
        is: "field",
        baseId,
        tableId,
        fieldId,
        recordId: null,
      },
      data: null,
    });
  }
  //
  return fieldsToDelete;
}

function parseRecordCreationInTable(
  baseId: string,
  tableId: string,
  createRecordSpec?: { [id: string]: CreateRecordSpec }
) {
  const recordsToCreate: Array<Change<"create", "record">> = [];
  if (!createRecordSpec) return recordsToCreate;
  //
  for (const [recordId, recordSpec] of Object.entries(createRecordSpec)) {
    recordsToCreate.push({
      type: "create",
      resourceAddress: {
        is: "record",
        baseId,
        tableId,
        recordId,
        fieldId: null,
      },
      data: {
        id: recordId,
        createdTime: Date.parse(recordSpec.createdTime),
        cells: recordSpec.cellValuesByFieldId, //cellSpecsToCells(tableFields, recordSpec.cellValuesByFieldId)
      },
    });
  }
  //
  return recordsToCreate;
}

function parseRecordUpdateInTable(
  baseId: string,
  tableId: string,
  changeRecordSpec?: { [id: string]: ChangeRecordSpec }
) {
  const recordsToUpdate: Array<Change<"update", "record">> = [];
  if (!changeRecordSpec) return recordsToUpdate;
  //
  for (const [recordId, recordSpec] of Object.entries(changeRecordSpec)) {
    recordsToUpdate.push({
      type: "update",
      resourceAddress: {
        is: "record",
        baseId,
        tableId,
        recordId,
        fieldId: null,
      },
      data: {
        id: recordId,
        cells: recordSpec.current,
      },
    });
  }
  //
  return recordsToUpdate;
}

function parseRecordDeletionInTable(
  baseId: string,
  tableId: string,
  deleteRecordSpec: Array<string>
) {
  const recordsToDelete: Array<Change<"delete", "record">> = [];
  if (!deleteRecordSpec) return recordsToDelete;
  //
  for (const recordId in deleteRecordSpec) {
    recordsToDelete.push({
      type: "delete",
      resourceAddress: {
        is: "record",
        baseId,
        tableId,
        recordId,
        fieldId: null,
      },
      data: null,
    });
  }
  //
  return recordsToDelete;
}

function parseTableUpdates(
  changes: Array<Change<any, any>>,
  baseId: string,
  changeTablesSpec?: { [id: string]: ChangeTableSpec }
) {
  const tablesToUpdate: Array<Change<"update", "table">> = [];
  if (!changeTablesSpec) return;
  // process changes to table metadata
  for (const [tableId, tableSpec] of Object.entries(changeTablesSpec)) {
    if (tableSpec.changedMetadata?.current) {
      tablesToUpdate.push({
        type: "update",
        resourceAddress: {
          is: "table",
          baseId,
          tableId,
          recordId: null,
          fieldId: null,
        },
        data: {
          id: tableId,
          name:
            tableSpec.changedMetadata?.current.name ??
            tableSpec.changedMetadata?.previous.name ??
            untitled,
          description:
            tableSpec.changedMetadata?.current.description ??
            tableSpec.changedMetadata?.previous.description ??
            undescribed,
        },
      });
    }
    changes.push(...tablesToUpdate);
    // process field creations
    changes.push(
      ...parseFieldCreationInTable(
        baseId,
        tableId,
        tableSpec?.createdFieldsById
      )
    );
    // process field updates
    changes.push(
      ...parseFieldUpdateInTable(baseId, tableId, tableSpec?.changedFieldsById)
    );
    // process field deletions
    changes.push(
      ...parseFieldDeletionInTable(
        baseId,
        tableId,
        tableSpec?.destroyedFieldIds
      )
    );
    // process record creations
    changes.push(
      ...parseRecordCreationInTable(
        baseId,
        tableId,
        tableSpec?.createdRecordsById
      )
    );
    // process record updates
    changes.push(
      ...parseRecordUpdateInTable(
        baseId,
        tableId,
        tableSpec?.changedRecordsById
      )
    );
    // process record deletions
    changes.push(
      ...parseRecordDeletionInTable(
        baseId,
        tableId,
        tableSpec?.destroyedRecordIds
      )
    );
  }
}

function traverseAirtableWebhookPayload(
  baseId: string,
  payload: WebhookPayload
) {
  const changes: Array<Change<any, any>> = [];
  // deduce changes
  changes.push(...parseTableDeletions(baseId, payload.destroyedTableIds));
  changes.push(...parseTableAdditions(baseId, payload.createdTablesById));
  parseTableUpdates(changes, baseId, payload.changedTablesById);
  // return result
  const result: SyncNotification = {
    number: payload.baseTransactionNumber,
    timestamp: Date.parse(payload.timestamp),
    changes,
  };
  return result;
}

export const createBaseSyncHandler: SocketIoRouteHandler<
  DecodedIdToken,
  StartSyncBaseRequest,
  StartSyncBaseResponse
> = async (server, socket, tkn, data, callback) => {
  const userId = tkn.uid;
  const projectId = data?.projectId;

  if (!projectId)
    return callback(
      makeErrorResponse(
        400,
        "Could not access requested base.",
        "project id not provided."
      )
    );

  const project = await readProject(userId, projectId);
  if (!project)
    return callback(
      makeErrorResponse(
        404,
        "Could not access requested base.",
        "project with specified id does not exist."
      )
    );
  if (!project?.airtable?.personalAccessToken || !project?.airtable?.baseId)
    return callback(
      makeErrorResponse(
        500,
        "Could not access requested base.",
        "could not retrieve airtable credentials from project."
      )
    );

  // fetch initial data
  const base = await readBase(
    project.airtable.personalAccessToken,
    project.airtable.baseId
  );
  if (!base)
    return callback(
      makeErrorResponse(
        404,
        "Could not find requested base.",
        "base with specified id does not exist."
      )
    );

  // join room associated with base to listen on changes
  await subscribeToBaseChangedEvent({
    socket,
    personalAccessToken: project.airtable.personalAccessToken,
    baseId: project.airtable.baseId,
  });

  // return initial data with success status
  callback(
    makeSuccessResponse(base, 200, "You have successfully subscribed to base.")
  );
};

const emitBaseChangedEvent = registerEvent(
  "base-changed",
  async (socketIoServer, payload: BaseChangedEvent) => {
    const {baseId, webhookId} = payload;
    // find webhook entry
    const baseEntry = await readBaseEntry({baseId});
    if (!baseEntry)
      throw Error(`Could not find webhook entry for base: ${baseId}`);
    
    // try every personal access token to retrieve payloads
    let payloads : Array<WebhookPayload> | null = null;
    for (const token of baseEntry.personalAccessTokens) {
      try {
        payloads = await getListOfWebhookPayloads(
          token,
          baseId,
          webhookId
        );
        break;
      } catch {
        console.error(`Failed to retrieve webhook payloads for base (${baseId}) using personal access token: ${token}`);
      }
    }
    if (payloads === null) {
      throw Error(`No working personal access token for base: ${baseId}`)
    }
    

    // traverse webhook payload: for each change in payload
    for (const p of payloads) {
      // for each change in payload...
      const syncNotification = traverseAirtableWebhookPayload(baseId, p);
      // emit a SyncNotification to client(s)
      socketIoServer.to(baseId).emit(`${baseId}:changed`, syncNotification);
    }
  }
);

export const receiveAirtableWebhookNotification: RestApiRouteHandler = (
  req,
  res
) => {
  const reqBody = req.body as AirtableWebhookNotification;
  // emit event for socket-based handling
  emitBaseChangedEvent({
    topic: "base-changed",
    payload: {
      baseId: reqBody.base.id,
      webhookId: reqBody.webhook.id,
      timestamp: Date.parse(reqBody.timestamp),
    },
  });
  // acknowledge receipt
  res.status(200).send();
};
