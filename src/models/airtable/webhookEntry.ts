// import {
//   createWebhook as airtableCreateWebhook,
//   getListOfWebhooks as airtableGetListOfWebhooks,
//   refreshWebhook as airtableRefreshWebhook,
//   deleteWebhook as airtableDeleteWebhook,
//   getListOfWebhookPayloads as airtableGetListOfWebhookPayloads,
//   WebhookInfo,
// } from "../../integrations/airtable";
// import configManager from "../../configuration-manager";
// import fb from "../../integrations/firebase";
// export { AirtableWebhookNotification } from "../../integrations/airtable";

// const notificationUrl =
//   configManager.configs.server.publicAddress + `/airtable-webhook-notification`;

// type WebhookEntry = {
//   id: string;
//   baseId: string;
//   macSecretBase64: string;
//   personalAccessTokens: Array<string>
// };

// const dbAddress = (args: {baseId: string}) => `bases/${args.baseId}/webhook`

// export async function readWebhookEntry(webhookId: string) {
//   console.debug(`Attempting to read webhook entry: ${webhookId}`);
//   const _webhookEntry = await fb.db(`webhooks/${webhookId}`).get();
//   if (!_webhookEntry.exists) {
//     console.debug(`=> Could not find webhook entry: ${webhookId}`);
//     return undefined;
//   } else {
//     console.debug(`=> Found webhook entry: ${webhookId}`);
//     return _webhookEntry.val() as WebhookEntry;
//   }
// }

// export async function deleteWebhookEntry(webhookId: string) {
//   console.debug(`Attempting to delete webhook entry: ${webhookId}`);
//   const address = `webhooks/${webhookId}`;
//   const _webhookEntry = await fb.db(address ).get();
//   if (!_webhookEntry.exists) {
//     console.debug(`=> Could not find webhook entry: ${webhookId}`);
//     return;
//   }
//   const webhookEntry = _webhookEntry.val() as WebhookEntry;
//   // delete underlying from SSoT
//   for (const token of webhookEntry.personalAccessTokens) {
//     try {
//       await airtableDeleteWebhook(token, webhookEntry.baseId, webhookEntry.id);
//       console.debug(`=> Deleted webhook (${webhookId}) with personal access token: ${token}`);
//       break;
//     } catch {
//       console.debug(`=> Could not delete webhook (${webhookId}) with personal access token: ${token}`);
//     }
//   }
//   // delete entry
//   await fb.db(address).remove();
//   console.debug(`=> Deleted webhook entry: ${webhookId}`);
// }

// async function createWebhookEntry(
//   args: {
//     personalAccessToken: string,
//     baseId: string,
//   }
// ) {
//   // create webhook in SSoT:
//   const newWebhook = await airtableCreateWebhook(
//     args.personalAccessToken,
//     args.baseId,
//     notificationUrl
//   );
//   // create entry as representation:
//   // note: we don't store expiry timestamp since it's better to consult source of truth directly...
//   // purpose of this is to store secret for the webhook (for verification),
//   // and to link it to users' projects
//   const webhookEntry: WebhookEntry = {
//     id: newWebhook.id,
//     macSecretBase64: newWebhook.macSecretBase64,
//     baseId: args.baseId,
//     personalAccessTokens: [
//       args.personalAccessToken
//     ]
//   };
//   await fb.db(`webhooks/${webhookEntry.id}`).set(webhookEntry);
//   console.debug(`Created webhook entry: ${webhookEntry.id}`);
//   return webhookEntry;
// }

// function isWebhookValid(wh: WebhookInfo) {
//   // check expiry
//   const expirationTime = wh?.expirationTime
//     ? Date.parse(wh.expirationTime)
//     : undefined;
//   const isNotExpired = expirationTime ? expirationTime > Date.now() : true;
//   // check notification url
//   const isNotificationUrlCorrect = wh.notificationUrl === notificationUrl;
//   // return result
//   const isValid = isNotExpired && isNotificationUrlCorrect;
//   console.debug(`Is webhook (${wh.id}) valid? ${isValid ? 'YES' : 'NO'}`);
//   return isValid;
// }

// export async function ensureWebhookEntry(
//   args: {
//     personalAccessToken: string,
//     baseId: string
//   }
// ) {
//   // get list of webhooks from SSoT
//   let webhooks = (await airtableGetListOfWebhooks(args.personalAccessToken, args.baseId)).webhooks;
//   // filter for the ones relevant to us (server's notification URL)
//   webhooks = webhooks.filter( wh => wh?.notificationUrl === notificationUrl );
//   for (const wh of webhooks) {
//     // delete all the ones that we have no entry for
//     const whEntry = readWebhookEntry(wh.id);
//     if (!whEntry) {
//       airtableDeleteWebhook(args.personalAccessToken, args.baseId, wh.id);
//     }
//     // delete the invalid ones
//     if (!isWebhookValid(wh)) {
//       deleteWebhookEntry(wh.id);
//     }
//   }

// }
// // export async function ensureWebhook(

// // ) {

// //   // if no webhook registered for base, create a fresh one
// //   if (!baseWebhook) {
// //     const result = await createWebhook(
// //       personalAccessToken,
// //       baseId,
// //       userId,
// //       projectId
// //     );
// //     return result;
// //   }

// //   // otherwise, check if webhook in project is active
// //   else {
// //     const isValid = await isWebhookValid(
// //       personalAccessToken,
// //       baseId,
// //       baseWebhook.id
// //     );

// //     // if valid, refresh and use existing/pre-registered webhook
// //     if (isValid) {
// //       await airtableRefreshWebhook(personalAccessToken, baseId, baseWebhook.id);
// //       return baseWebhook;
// //     }
// //     // otherwise delete and create new one
// //     else {
// //       // delete existing
// //       await airtableDeleteWebhook(personalAccessToken, baseId, baseWebhook.id);
// //       // create new
// //       const result = await createWebhook(
// //         personalAccessToken,
// //         baseId,
// //         userId,
// //         projectId
// //       );
// //       return result;
// //     }
// //   }
// // }
