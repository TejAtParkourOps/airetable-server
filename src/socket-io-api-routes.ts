import { SocketIoApiRouteCollection } from "./server-framework";
import { DecodedIdToken } from "./models/airtable";

import { createBaseSyncHandler } from "./controllers/base-sync";
import { createProjectHandler, deleteProjectHandler, updateProjectHandler } from "./controllers/project";

export default [
  ["base-sync:create", createBaseSyncHandler],
  ["project:create", createProjectHandler],
  ["project:update", updateProjectHandler],
  ["project:delete", deleteProjectHandler],
] as SocketIoApiRouteCollection<DecodedIdToken>;
