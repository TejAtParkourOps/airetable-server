import {
  makeAirtableGetRequest,
  makeAirtablePostRequest,
  makeAirtableDeleteRequest,
  QueryParams,
} from "./requests-factory";
import {
  AirtableCreateWebhookResponse,
  AirtableListWebhooksResponse,
  AirtableRefreshWebhookResponse,
  WebhookPayload,
  AirtableListWebhookPayloadsResponse,
} from "./webhook-responses";
import assert from "node:assert";

export function getListOfWebhooks(personalAccessToken: string, baseId: string) {
  assert(personalAccessToken.length > 0);
  assert(baseId.length > 0);
  return makeAirtableGetRequest<AirtableListWebhooksResponse>(
    personalAccessToken,
    `https://api.airtable.com/v0/bases/${baseId}/webhooks`,
    {}
  );
}

/**
 * See: {@link https://airtable.com/developers/web/api/create-a-webhook | Airtable: Create a Webhook }
 */
export function createWebhook(
  personalAccessToken: string,
  baseId: string,
  notificationUrl?: string
) {
  assert(personalAccessToken.length > 0);
  assert(baseId.length > 0);
  return makeAirtablePostRequest<AirtableCreateWebhookResponse>(
    personalAccessToken,
    `https://api.airtable.com/v0/bases/${baseId}/webhooks`,
    {
      notificationUrl: notificationUrl,
      specification: {
        options: {
          filters: {
            dataTypes: [
              "tableData", // i.e. record and cell value changes,
              "tableFields", // i.e. changes to fields
              "tableMetadata", // i.e. table name and description changes
            ],
          },
        },
      },
    }
  );
}

export function deleteWebhook(
  personalAccessToken: string,
  baseId: string,
  webhookId: string
) {
  assert(personalAccessToken.length > 0);
  assert(baseId.length > 0);
  assert(webhookId.length > 0);
  return makeAirtableDeleteRequest<void>(
    personalAccessToken,
    `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}`
  );
}

export function refreshWebhook(
  personalAccessToken: string,
  baseId: string,
  webhookId: string
) {
  assert(personalAccessToken.length > 0);
  assert(baseId.length > 0);
  assert(webhookId.length > 0);
  return makeAirtablePostRequest<AirtableRefreshWebhookResponse>(
    personalAccessToken,
    `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/refresh`
  );
}

export async function getListOfWebhookPayloads(
  personalAccessToken: string,
  baseId: string,
  webhookId: string
) {
  assert(personalAccessToken.length > 0);
  assert(baseId.length > 0);
  assert(webhookId.length > 0);
  let noMore = false;
  let queryParams: QueryParams = {};
  let accumulation: Array<WebhookPayload> | null = null;
  let nIterations = 0;
  while (noMore !== true) {
    nIterations++;

    const response =
      await makeAirtableGetRequest<AirtableListWebhookPayloadsResponse>(
        personalAccessToken,
        `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/payloads`,
        queryParams
      );

    if (nIterations === 1) {
      accumulation = response.payloads;
    } else {
      assert(accumulation);
      accumulation.push(...response.payloads);
    }

    if (response.mightHaveMore) {
      queryParams.cursor = response.cursor;
    } else {
      noMore = true;
    }
  }
  assert(accumulation);
  return accumulation;
}
