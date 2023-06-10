import process from "node:process";
import { default as createRestApiServer, json as parseAsJson } from "express";
import { Server as SocketIoApiServer } from "socket.io";
import {
  createServer as createHttpServer,
  Server as HttpServer,
} from "node:http";
import {
  createServer as createHttpsServer,
  Server as HttpsServer,
} from "node:https";
import {
  initializeRestApiServer,
  RestApiRouteSpecification,
} from "./rest-api-server";
import {
  initializeSocketIoApiServer,
  SocketIoApiRouteCollection,
} from "./socket-api-server";
import { VerifyAuthTokenFn } from "./request-auth";
import { CorsOptions } from "cors";
import { installEventHandlers } from "./event-handler";

export { registerEvent, EventMessageHandler } from "./event-handler";
export {
  SocketIoApiRouteCollection,
  SocketIoRouteHandler,
} from "./socket-api-server";
export {
  RestApiRouteSpecification,
  RestApiRouteHandler,
} from "./rest-api-server";

export interface ServerConfiguration {
  host: string;
  port: number;
  useTLS: boolean;
  cors: CorsOptions;
}

class Service<TDecodedAuthToken extends object> {
  constructor(
    config: ServerConfiguration,
    verifyAuthTokenFn: VerifyAuthTokenFn<TDecodedAuthToken>,
    socketIoRoutes: SocketIoApiRouteCollection<TDecodedAuthToken>,
    restRoutes: RestApiRouteSpecification
  ) {
    console.info("Server is running.");

    // called when `process.exit(...)` called or no additional work to perform.
    process.on("exit", (code) => {
      console.info(`Server exited with code: ${code}`);
    });

    // listen to exit signals from environment
    ["SIGTERM", "SIGINT", "SIGQUIT"].forEach((signal) => {
      process.on(signal, () => {
        console.info(`Received signal: ${signal}`);
        console.info(`Exiting gracefully...`);
        process.exit(0);
      });
    });

    // add comment here
    process.on("warning", (warning) => {
      console.warn(warning.name); // Print the warning name
      console.warn(warning.message); // Print the warning message
      console.warn(warning.stack); // Print the stack trace
    });

    // create server structure
    const restApiServer = createRestApiServer();
    restApiServer.use(parseAsJson());
    let server: HttpServer | HttpsServer | null = null;
    // if (config.useTLS) {
    //   server = createHttpsServer({
    //     key: fs.readFileSync(path.resolve(__dirname, '../../tlscerts/server.pem'), 'utf8'),
    //     cert: fs.readFileSync(path.resolve(__dirname, '../../tlscerts/server.crt'), 'utf8')
    //   }, restApiServer);
    // } else {
    server = createHttpServer(restApiServer);
    // }
    const socketIoApiServer = new SocketIoApiServer(server, {
      cors: config.cors,
      cookie: true,
    });

    // initialize API servers and install routes
    initializeRestApiServer(restApiServer, verifyAuthTokenFn, restRoutes);
    initializeSocketIoApiServer(
      verifyAuthTokenFn,
      socketIoApiServer,
      socketIoRoutes
    );

    // install event handlers
    installEventHandlers(socketIoApiServer);

    // start serving
    server.listen(config.port, config.host, () => {
      if (!server) {
        throw Error("Failed to start server!");
      }
      console.info(`Server listening on: ${JSON.stringify(server.address())}`);
    });
  }
}

export default Service;
