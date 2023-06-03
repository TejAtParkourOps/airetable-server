import { Express as Server, RequestHandler } from "express";

export type HttpMethod =
  | "all"
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head";

export type RestApiRouteHandler = RequestHandler;

export type RestApiRoute = [
  method: HttpMethod,
  path: string,
  handler: RestApiRouteHandler
];

export type RestApiRouteCollection = Array<RestApiRoute>;

export function initializeRestApiServer(
  server: Server,
  routes: RestApiRouteCollection
) {
  // server.on("error", (err) => {
  //   console.error(JSON.stringify(err));
  // });
  // register routes
  for (const r of routes) {
    server[r[0]](r[1], r[2]);
    console.debug(`Registered REST API route: '${r[1]}'`);
  }
}
