export type VerifyAuthTokenFn<TDecodedAuthToken> = (
  authToken: string
) => TDecodedAuthToken | Promise<TDecodedAuthToken>;
