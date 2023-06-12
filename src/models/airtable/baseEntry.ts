import {
  createWebhook as airtableCreateWebhook,
  getListOfWebhooks as airtableGetListOfWebhooks,
  refreshWebhook as airtableRefreshWebhook,
  deleteWebhook as airtableDeleteWebhook,
  getListOfWebhookPayloads as airtableGetListOfWebhookPayloads,
  WebhookInfo,
} from "../../integrations/airtable";
import configManager from "../../configuration-manager";
import fb from "../../integrations/firebase";
export { AirtableWebhookNotification } from "../../integrations/airtable";

const notificationUrl =
  configManager.configs.server.publicAddress + `/airtable-webhook-notification`;

type WebhookEntry = {
  id: string;
  macSecretBase64: string;
};

type BaseEntry = {
  id: string;
  personalAccessTokens: Array<string>;
  webhook: WebhookEntry;
};

const dbAddress = (args: { baseId: string }) => `bases/${args.baseId}`;

export async function readBaseEntry(args: { baseId: string }) {
  const { baseId } = args;
  const address = dbAddress(args);
  console.log(address);
  const _entry = await fb.db(address).get();
  if (!_entry?.exists()) {
    console.debug(`Could not find entry for base: ${baseId}`);
    return undefined;
  } else {
    const entry = _entry.val() as BaseEntry;
    console.debug(`Found entry for base: ${baseId}`, entry);
    return entry;
  }
}

function isWebhookValid(wh: WebhookInfo) {
  // check expiry
  const expirationTime = wh?.expirationTime
    ? Date.parse(wh.expirationTime)
    : undefined;
  const isNotExpired = expirationTime ? expirationTime > Date.now() : true;
  // check notification url
  const isNotificationUrlCorrect = wh.notificationUrl === notificationUrl;
  // return result
  const isValid = isNotExpired && isNotificationUrlCorrect;
  console.debug(`Is webhook (${wh.id}) valid? ${isValid ? "YES" : "NO"}`);
  return isValid;
}

export async function ensureBaseEntry(args: {
  baseId: string;
  personalAccessToken: string;
}) {
  const { baseId, personalAccessToken } = args;
  const baseEntry = await readBaseEntry({ baseId });
  const address = dbAddress({ baseId });
  const webhooks = (
    await airtableGetListOfWebhooks(personalAccessToken, baseId)
  ).webhooks;
  if (baseEntry) {
    // check if personal access token included, if not: include it
    if (!baseEntry.personalAccessTokens.includes(personalAccessToken)) {
      await fb
        .db(address)
        .update({
          personalAccessTokens: [
            ...baseEntry.personalAccessTokens,
            personalAccessToken,
          ],
        });
    }
    // ensure webhook is valid
    const registeredWebhook = webhooks.find(
      (wh) => wh.id === baseEntry.webhook.id
    );
    if (!registeredWebhook || !isWebhookValid(registeredWebhook)) {
      // delete existing
      if (registeredWebhook)
        airtableDeleteWebhook(
          personalAccessToken,
          baseId,
          registeredWebhook.id
        );
      // create new webhook and update entry
      const newWebhook = await airtableCreateWebhook(
        personalAccessToken,
        baseId,
        notificationUrl
      );
      const newWebhookEntry: WebhookEntry = {
        id: newWebhook.id,
        macSecretBase64: newWebhook.macSecretBase64,
      };
      await fb.db(address).update({
        webhook: newWebhookEntry,
      });
    }
  } else {
    // create new entry from scratch for this base, with brand new webhook
    const newWebhook = await airtableCreateWebhook(
      personalAccessToken,
      baseId,
      notificationUrl
    );
    const baseEntry: BaseEntry = {
      id: baseId,
      personalAccessTokens: [personalAccessToken],
      webhook: {
        id: newWebhook.id,
        macSecretBase64: newWebhook.macSecretBase64,
      },
    };
    await fb.db(address).set(baseEntry);
  }
}
