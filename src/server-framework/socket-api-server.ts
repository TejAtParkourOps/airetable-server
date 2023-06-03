import { Server as SocketIoServer, Socket as SocketIoSocket } from "socket.io";
import {
  Response,
  ClientSideResponseReceiptCallback,
} from "@parkour-ops/airetable-contract";
import { errors } from "./error-handler";
import { VerifyAuthTokenFn } from "./request-auth";

export type ResponseHandlerCallback<TResponseData> = (
  response: Response<TResponseData>
) => void;

export type SocketIoRouteHandler<TDecodedAuthToken, TRequest, TResponseData> = (
  server: SocketIoServer,
  socket: SocketIoSocket,
  token: TDecodedAuthToken,
  data: TRequest,
  callback: ResponseHandlerCallback<TResponseData>
) => void;

export type SocketIoApiRoute<TDecodedAuthToken, TRequest, TResponseData> = [
  name: string,
  installer: SocketIoRouteHandler<TDecodedAuthToken, TRequest, TResponseData>
];

export type SocketIoApiRouteCollection<TDecodedAuthToken> = Array<
  SocketIoApiRoute<TDecodedAuthToken, unknown, unknown>
>;

async function handleIncomingMessage<TDecodedAuthToken>(
  server: SocketIoServer,
  socket: SocketIoSocket,
  verifyAuthTokenFn: VerifyAuthTokenFn<TDecodedAuthToken>,
  registedRoutes: Map<
    string,
    SocketIoRouteHandler<TDecodedAuthToken, unknown, unknown>
  >,
  rcvdCallback: ClientSideResponseReceiptCallback<unknown>,
  rcvdRoute: unknown,
  rcvdAuthToken: unknown,
  rcvdData: unknown
) {
  let decodedAuthToken: TDecodedAuthToken;
  // 1. ensure valid auth token
  if (!rcvdAuthToken) {
    return rcvdCallback(errors["auth-failed"]("Auth token not provided."));
  } else if (typeof rcvdAuthToken !== "string") {
    return rcvdCallback(
      errors["auth-failed"]("Auth token is not a valid string.")
    );
  } else {
    try {
      decodedAuthToken = await verifyAuthTokenFn(rcvdAuthToken);
    } catch (err) {
      return rcvdCallback(errors["auth-failed"](err));
    }
  }
  // 2. ensure route is valid
  if (!rcvdRoute) {
    return rcvdCallback(errors["invalid-request"]("Route is not provided."));
  } else if (typeof rcvdRoute !== "string") {
    return rcvdCallback(
      errors["invalid-request"](
        `Route is of incorrect type. Expected 'string', received '${typeof rcvdRoute}'.`
      )
    );
  }
  const handler = registedRoutes.get(rcvdRoute);
  if (!handler) {
    return rcvdCallback(
      errors["invalid-request"]("Route is invalid, no handler!")
    );
  }
  // 3. call the handler
  console.debug(`Calling handler for route: '${rcvdRoute}'`);
  handler(server, socket, decodedAuthToken, rcvdData, rcvdCallback);
}

export function initializeSocketIoApiServer<TDecodedAuthToken>(
  verifyAuthTokenFn: VerifyAuthTokenFn<TDecodedAuthToken>,
  server: SocketIoServer,
  routes: SocketIoApiRouteCollection<TDecodedAuthToken>
) {
  // register routes
  const registeredRoutes = new Map<
    string,
    SocketIoRouteHandler<TDecodedAuthToken, unknown, unknown>
  >();
  routes.forEach((r) => {
    registeredRoutes.set(r[0], r[1]);
    console.debug(`Registered Socket.io API route: '${r[0]}'`);
  });

  server.on("connection", (socket) => {
    // handle generic low-level errors...
    socket.on("error", (err?: Error) => {
      console.error("Socket.io API server connection error!", err?.message);
    });

    // otherwise, handle all messages...
    socket.onAny(async (...args: Array<any>) => {
      // dump message:
      console.debug("Socket.io API server received message:", args);
      // parse msg:
      const _route = args?.[0];
      const _authToken = args?.[1];
      const _data = args?.[2];
      const _clientSideReceiptCallback = args?.[3];
      // ensure valid client-side receipt callback before further parsing:
      if (
        _clientSideReceiptCallback &&
        typeof _clientSideReceiptCallback === "function"
      ) {
        return handleIncomingMessage(
          server,
          socket,
          verifyAuthTokenFn,
          registeredRoutes,
          _clientSideReceiptCallback,
          _route,
          _authToken,
          _data
        );
      } else {
        return console.error(
          "Socket.io API server, invalid message: No or invalid callback present in request! Ignoring..."
        );
      }
    });
  });
}
