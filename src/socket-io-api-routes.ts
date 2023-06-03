import { SocketIoApiRouteCollection } from "./server-framework";
import { DecodedIdToken } from "./models/airtable";

import { createBaseSync } from "./controllers/base-sync";

export default [
  ["create-base-sync", createBaseSync],
] as SocketIoApiRouteCollection<DecodedIdToken>;
