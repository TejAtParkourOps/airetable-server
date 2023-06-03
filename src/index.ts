import configManager from "./configuration-manager";
import Service from "./server-framework";
import socketIoApiRoutes from "./socket-io-api-routes";
import fb from "./integrations/firebase";

console.log("Attempting to run server with configs:", configManager.configs);
new Service(
  {
    host: configManager.configs.server.host,
    port: configManager.configs.server.port,
    useTLS: configManager.configs.server.useTLS,
    cors: configManager.configs.server.cors,
  },
  fb.verifyAuthToken,
  socketIoApiRoutes,
  []
);
