import { RestApiRouteSpecification } from "./server-framework";
import { receiveAirtableWebhookNotification } from "./controllers/base-sync";

const routes: RestApiRouteSpecification = {
  "/airtable-webhook-notification": {
    post: receiveAirtableWebhookNotification,
  },
};

export default routes;
