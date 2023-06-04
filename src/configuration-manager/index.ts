/**
 * This is a global configuration provider for all parts of the system.
 */
import {
  loadOptionalEnvironmentVariable,
  loadRequiredEnvironmentVariable,
} from "./environment-variables";
import { DeepReadonly } from "ts-essentials";
import admin from "firebase-admin";

type ConfigurationDictionary = {
  readonly [key: string]:
    | DeepReadonly<ConfigurationDictionary>
    | Readonly<String>
    | Readonly<Number>
    | Readonly<Boolean>;
};

type ConfigurationSchema = {
  readonly [key: string]: DeepReadonly<ConfigurationDictionary>;
};

class ConfigurationManager<T extends ConfigurationSchema> {
  #configs: T;
  constructor(configs: T) {
    this.#configs = configs;
  }
  get configs() {
    return this.#configs;
  }
}

export default new ConfigurationManager({
  server: {
    host: loadOptionalEnvironmentVariable("HOST", "string") ?? "0.0.0.0",
    // 0.0.0.0 accepts traffic from all available interfaces (rather than just loopback in the case of 127.0.0.1).
    port: loadOptionalEnvironmentVariable("PORT", "number", true) ?? 3434,
    // note: 'AIRETABLE_' prefix is omitted because Heroku container have their PORT specified automatically/allocated by their system.
    publicAddress: loadRequiredEnvironmentVariable("PUBLIC_ADDRESS", "string"),
    // this will be used to generate the notificationUrl used by Airtable Webhook; the Airtable system will not accept non-https urls.
    useTLS: loadOptionalEnvironmentVariable("USE_TLS", "boolean") ?? false,
    // assume this will be deployed in a container behind a load-balancer/reverse-proxy that implements https at user-facing endpoint.
    cors: {
      origin: loadOptionalEnvironmentVariable("CORS_ORIGIN", "string") ?? "*",
    },
  },
  firebase: {
    serviceAccountCertBase64: loadRequiredEnvironmentVariable(
      "FIREBASE_SERVICE_ACCOUNT_CERT_BASE64",
      "string"
    ),
    projectId: loadRequiredEnvironmentVariable("FIREBASE_PROJECT_ID", "string"),
    databaseURL: loadRequiredEnvironmentVariable(
      "FIREBASE_RT_DATABASE_URL",
      "string"
    ),
  },
  service: {},
});
