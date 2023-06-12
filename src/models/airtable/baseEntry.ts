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
import { assert } from "ts-essentials";
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
  const address = dbAddress({ baseId });
  // get webhooks registered for this base
  let webhooks = (
    await airtableGetListOfWebhooks(personalAccessToken, baseId)
  ).webhooks.filter((wh) => wh.notificationUrl === notificationUrl);
  // check if entry exists for base
  const baseEntry = await readBaseEntry({ baseId });
  const baseEntryIsValid = baseEntry
    ? (() => {
        const registeredWebhook = webhooks.find(
          (wh) => wh.id === baseEntry.webhook.id
        );
        const isValid = registeredWebhook
          ? isWebhookValid(registeredWebhook)
          : false;
        return !!registeredWebhook && isValid;
      })()
    : false;
  if (baseEntryIsValid) {
    assert(baseEntry);
    // add personal access token is not present in entry
    if (!baseEntry.personalAccessTokens.includes(personalAccessToken)) {
      await fb
        .db(address)
        .update(
          {
            personalAccessToken: [
              ...baseEntry.personalAccessTokens,
              personalAccessToken,
            ],
          },
          (err) => {
            if (err) throw err;
          }
        );
    }
  } else {
    // delete all registered webhooks
    for (const wh of webhooks) {
      await airtableDeleteWebhook(personalAccessToken, baseId, wh.id);
    }
    // create new webhook + entry
    const newWebhook = await airtableCreateWebhook(
      personalAccessToken,
      baseId,
      notificationUrl
    );
    const newBaseEntry: BaseEntry = {
      id: baseId,
      personalAccessTokens: [
        personalAccessToken,
        ...(baseEntry ? baseEntry.personalAccessTokens : []),
      ],
      webhook: {
        id: newWebhook.id,
        macSecretBase64: newWebhook.macSecretBase64,
      },
    };
    await fb.db(address).set(newBaseEntry, (err) => {
      if (err) throw err;
    });
  }
}
