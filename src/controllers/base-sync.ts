import {
  makeErrorResponse,
  makeSuccessResponse,
  StartSyncBaseRequest,
  StartSyncBaseResponse,
} from "@parkour-ops/airetable-contract";
import { readProject } from "../models/project";
import {
  readBase,
  ensureWebhook,
  DecodedIdToken,
  AirtableWebhookNotification,
} from "../models/airtable";
import { SocketIoRouteHandler, RestApiRouteHandler } from "../server-framework";
import { registerEvent } from "../server-framework";
import { Socket } from "socket.io";

export type BaseNotification = {
  baseId: string;
  webhookId: string;
  timestamp: number;
};

async function subscribeToBaseChangedEvent(
  socket: Socket,
  personalAccessToken: string,
  baseId: string
) {
  // ensure webhook is set up so we can receive change notifications at REST endpoint
  await ensureWebhook(personalAccessToken, baseId);
  // add user socket (representing session webhook) to room associated with base (since each base has only one webhook, shared across all projects affiliated with the base)
  socket.join(baseId);
}

const emitBaseChangedEvent = registerEvent(
  "base-changed",
  async (socketIoServer, payload: BaseNotification) => {
    const baseId = payload.baseId;
    socketIoServer.to(baseId).emit(`${baseId}:changed`);
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
    project.airtable.baseId
  );

  // return initial data with success status
  callback(
    makeSuccessResponse(base, 200, "You have successfully subscribed to base.")
  );
};

export const receiveAirtableWebhookNotification: RestApiRouteHandler = (
  req,
  res,
  next
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
