import { RestApiRouteSpecification } from "./server-framework";
import { receiveAirtableWebhookNotification } from "./controllers/base-sync";

const routes: RestApiRouteSpecification = {
  "/airtable-webhook-notification": {
    post: {
      authRequired: false,
      handlerFn: receiveAirtableWebhookNotification
    }
  },
  "/auth-status": {
    get: {
      authRequired: false,
      handlerFn: (req, res) => {res.status(200).send({auth: req.auth})}
    }
  },
  "/health-check": {
    get: {
      authRequired: false,
      handlerFn: (req, res) => {res.status(200).send()}
    }
  }
};

export default routes;
