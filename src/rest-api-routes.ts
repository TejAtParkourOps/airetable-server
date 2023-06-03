import { RestApiRouteCollection } from "./server-framework/rest-api-server";
import { receiveAirtableWebhookNotification } from "./controllers/base-sync";

export default [
  [
    "post",
    "/airtable-webhook-notification",
    receiveAirtableWebhookNotification,
  ],
] as RestApiRouteCollection;
