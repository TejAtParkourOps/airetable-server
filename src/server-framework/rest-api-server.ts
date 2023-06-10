import { Express as Server, RequestHandler, Request, Response} from "express";
import { VerifyAuthTokenFn } from "./request-auth";
import { makeErrorResponse } from "@parkour-ops/airetable-contract";
import { errors } from "./error-handler";

type AuthStatus<TIsAuth extends boolean, TDecodedAuthToken> = {
  isAuthenticated: TIsAuth,
  authToken: TIsAuth extends true ? TDecodedAuthToken : undefined;
}

type ConjunctRequest<TDecodedAuthToken> = Request & { auth?: AuthStatus<any, TDecodedAuthToken> };

export type RestApiRouteHandler = (req: ConjunctRequest<any>, res: Response) => void;

export type RestApiMethodSpec = {
  authRequired: boolean,
  handlerFn: RestApiRouteHandler
}

type RestApiPathSpec = {
  all?: RestApiMethodSpec;
  get?: RestApiMethodSpec;
  post?: RestApiMethodSpec;
  put?: RestApiMethodSpec;
  delete?: RestApiMethodSpec;
  patch?: RestApiMethodSpec;
  options?: RestApiMethodSpec;
  head?: RestApiMethodSpec;
};

type HttpMethod = keyof RestApiPathSpec;

export type RestApiRouteSpecification = {
  [path: string]: RestApiPathSpec;
};

const authMiddleware = <TDecodedAuthToken>(verifyAuthTokenFn: VerifyAuthTokenFn<TDecodedAuthToken>, authRequired: boolean) : RequestHandler => async (req, res, next) => {
  const _req : ConjunctRequest<TDecodedAuthToken> = req;
  _req.auth = {
    isAuthenticated: false,
    authToken: undefined
  };

  // extract auth token and try decode
  let authToken = req.headers?.authorization;
  if (authToken && typeof authToken === "string") {
    authToken = authToken.replace("Bearer ", "");
    try {
      const decodedAuthToken = await verifyAuthTokenFn(authToken);
      _req.auth.authToken = decodedAuthToken;
      _req.auth.isAuthenticated = true;
    } catch(err) {
      res.status(401).send(errors["auth-failed"](err));
    }
  };
  // throw if auth was mandatory to proceed
  if (authRequired && !_req.auth.isAuthenticated) {
    res.status(401).send(errors["auth-failed"]("auth token not provided."));
  } else {
    next();
  }
}

export function initializeRestApiServer<TDecodedAuthToken>(
  server: Server,
  verifyAuthTokenFn: VerifyAuthTokenFn<TDecodedAuthToken>,
  routes: RestApiRouteSpecification
) {
  // TODO: handle server errors
  // server.on("error", (err) => {
  //   console.error(JSON.stringify(err));
  // });

  // register routes
  const _routes = Object.entries(routes);
  for (const r of _routes) {
    const path = r[0];
    const spec = r[1];
    Object.entries(spec).forEach(([methodName, methodHandler]) => {
      server[<HttpMethod>methodName](path, 
        [
          authMiddleware(verifyAuthTokenFn, methodHandler.authRequired),
          methodHandler.handlerFn
        ] 
      );
      console.debug(`Registered REST API route: ${methodName} ${path}`);
    });
  }
}
