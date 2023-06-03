import { Express as Server, RequestHandler } from "express";

export type RestApiRouteHandler = RequestHandler;

type RestApiRouteHandlers = {
  all?: RestApiRouteHandler;
  get?: RestApiRouteHandler;
  post?: RestApiRouteHandler;
  put?: RestApiRouteHandler;
  delete?: RestApiRouteHandler;
  patch?: RestApiRouteHandler;
  options?: RestApiRouteHandler;
  head?: RestApiRouteHandler;
};

type HttpMethod = keyof RestApiRouteHandlers;

export type RestApiRouteSpecification = {
  [path: string]: RestApiRouteHandlers;
};

export function initializeRestApiServer(
  server: Server,
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
      server[<HttpMethod>methodName](path, methodHandler);
      console.debug(`Registered REST API route: ${methodName} ${path}`);
    });
  }
}
