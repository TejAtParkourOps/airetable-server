import {
  createWebhook as airtableCreateWebhook,
  getListOfWebhooks as airtableGetListOfWebhooks,
  refreshWebhook as airtableRefreshWebhook,
  deleteWebhook as airtableDeleteWebhook,
  getListOfWebhookPayloads as airtableGetListOfWebhookPayloads,
} from "../../integrations/airtable";
import configManager from "../../configuration-manager";
import fb from "../../integrations/firebase";
export { AirtableWebhookNotification } from "../../integrations/airtable";

const notificationUrl =
  configManager.configs.server.publicAddress + `/airtable-webhook-notification`;

type WebhookEntry = {
  id: string;
  macSecretBase64: string;
  userId: string;
  projectId: string;
};

async function createWebhook(
  personalAccessToken: string,
  baseId: string,
  userId: string,
  projectId: string
) {
  const newWebhook = await airtableCreateWebhook(
    personalAccessToken,
    baseId,
    notificationUrl
  );
  const webhookEntry: WebhookEntry = {
    id: newWebhook.id,
    macSecretBase64: newWebhook.macSecretBase64,
    userId,
    projectId,
    // note: we don't store expiry timestamp since it's better to consult source of truth directly
    // purpose is only to store secret for the webhook
  };
  await fb.db(`webhooks/${webhookEntry.id}`).set(webhookEntry);
  return webhookEntry;
}

export async function readWebhook(webhookId: string) {
  const _webhookEntry = await fb.db(`webhooks/${webhookId}`).get();
  if (!_webhookEntry) return undefined;
  return _webhookEntry.val() as WebhookEntry;
}

async function isWebhookValid(
  personalAccessToken: string,
  baseId: string,
  webhookId: string
) {
  const _registeredWebhooks = (
    await airtableGetListOfWebhooks(personalAccessToken, baseId)
  ).webhooks;
  const _webhook = _registeredWebhooks.find((w) => w.id === webhookId);
  if (!_webhook) return false;
  const expirationTime = _webhook?.expirationTime
    ? Date.parse(_webhook.expirationTime)
    : undefined;
  const isNotExpired = expirationTime ? expirationTime > Date.now() : true;
  const isCorrectNotificationUrl = _webhook?.notificationUrl
    ? _webhook.notificationUrl === notificationUrl
    : false;
  return isNotExpired && isCorrectNotificationUrl;
}

export async function ensureWebhook(
  personalAccessToken: string,
  baseId: string,
  userId: string,
  projectId: string
) {
  const baseWebhook = await readWebhook(baseId);

  // if no webhook registered for base, create a fresh one
  if (!baseWebhook) {
    const result = await createWebhook(
      personalAccessToken,
      baseId,
      userId,
      projectId
    );
    return result;
  }

  // otherwise, check if webhook in project is active
  else {
    const isValid = await isWebhookValid(
      personalAccessToken,
      baseId,
      baseWebhook.id
    );

    // if valid, refresh and use existing/pre-registered webhook
    if (isValid) {
      await airtableRefreshWebhook(personalAccessToken, baseId, baseWebhook.id);
      return baseWebhook;
    }
    // otherwise delete and create new one
    else {
      // delete existing
      await airtableDeleteWebhook(personalAccessToken, baseId, baseWebhook.id);
      // create new
      const result = await createWebhook(
        personalAccessToken,
        baseId,
        userId,
        projectId
      );
      return result;
    }
  }
}
