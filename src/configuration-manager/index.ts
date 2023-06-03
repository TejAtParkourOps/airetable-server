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
    port: loadOptionalEnvironmentVariable("PORT", "number", true) ?? 3434,
    publicAddress:
      loadOptionalEnvironmentVariable("PUBLIC_ADDRESS", "string") ??
      "0.0.0.0:3434",
    useTLS: loadOptionalEnvironmentVariable("USE_TLS", "boolean") ?? false,
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
