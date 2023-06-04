import {
  Change,
  makeErrorResponse,
  makeSuccessResponse,
  StartSyncBaseRequest,
  StartSyncBaseResponse,
  SyncNotification,
  Field,
  Record as Rec,
  Cell,
} from "@parkour-ops/airetable-contract";
import { readProject } from "../models/project";
import {
  readBase,
  ensureWebhook,
  DecodedIdToken,
  AirtableWebhookNotification,
  readWebhook,
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
  CreateFieldSpec,
  CreateRecordSpec,
} from "../integrations/airtable";

export type BaseChangedEvent = {
  baseId: string;
  webhookId: string;
  timestamp: number;
};

async function subscribeToBaseChangedEvent(
  socket: SocketIoSocket,
  personalAccessToken: string,
  baseId: string,
  userId: string,
  projectId: string
) {
  // ensure webhook is set up so we can receive change notifications at REST endpoint
  await ensureWebhook(personalAccessToken, baseId, userId, projectId);
  // add user socket (representing session webhook) to room associated with base (since each base has only one webhook, shared across all projects affiliated with the base)
  socket.join(baseId);
}

const untitled = "<Untitled>";
const undescribed = "<Undescribed>";

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
      description: "No description provided.",
      type: fieldSpec.type,
    };
  }
  return fields;
}

function cellSpecsToCells(
  tableFields: { [id: string]: Field },
  cellSpecs?: { [id: string]: any }
) {
  const cells: { [id: string]: Cell } = {};
  if (!cellSpecs) return cells;
  for (const [fieldId, cellValue] of Object.entries(cellSpecs)) {
    cells[fieldId] = {
      field: tableFields[fieldId],
      value: cellValue,
    };
  }
  return cells;
}

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
      cells: cellSpecsToCells(tableFields, recordSpec.cellValuesByFieldId),
    };
  }
  return records;
}

function parseTableAdditionChanges(
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

function parseTableDeletionChanges(
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

function traverseAirtableWebhookPayload(
  baseId: string,
  payload: WebhookPayload
) {
  const changes: Array<Change<any, any>> = [];
  // deduce changes
  changes.push(...parseTableDeletionChanges(baseId, payload.destroyedTableIds));
  changes.push(...parseTableAdditionChanges(baseId, payload.createdTablesById));
  // return result
  const result: SyncNotification = {
    number: payload.baseTransactionNumber,
    timestamp: Date.parse(payload.timestamp),
    changes,
  };
  return result;
}

const emitBaseChangedEvent = registerEvent(
  "base-changed",
  async (socketIoServer, payload: BaseChangedEvent) => {
    const baseId = payload.baseId;
    const webhookId = payload.webhookId;
    const webhookEntry = await readWebhook(baseId);
    if (!webhookEntry)
      throw Error("Could not retrieve project from Airtable webhook!");
    const projectEntry = await readProject(
      webhookEntry.userId,
      webhookEntry.projectId
    );
    if (!projectEntry)
      throw Error(
        "Could not retrieve Airtable access credentials from project!"
      );
    const personalAccessToken = projectEntry.airtable.personalAccessToken;
    // get webhook payloads
    const payloads = await getListOfWebhookPayloads(
      personalAccessToken,
      baseId,
      webhookId
    );
    for (const p of payloads) {
      // traverse webhook payload: for each change in payload
      const syncNotification = traverseAirtableWebhookPayload(baseId, p);
      // emit a SyncNotification to client(s)
      socketIoServer.to(baseId).emit(`${baseId}:changed`, syncNotification);
    }
  }
);

export const createBaseSync: SocketIoRouteHandler<
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
  await subscribeToBaseChangedEvent(
    socket,
    project.airtable.personalAccessToken,
    project.airtable.baseId,
    userId,
    projectId
  );

  // return initial data with success status
  callback(
    makeSuccessResponse(base, 200, "You have successfully subscribed to base.")
  );
};

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
