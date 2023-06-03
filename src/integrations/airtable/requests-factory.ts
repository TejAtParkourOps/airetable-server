import axios, { AxiosError } from "axios";
import assert from "node:assert"; // TODO: replace this with throw errors

export type QueryParams = Record<string, string | number>;

type UnpaginatingCallback<TResult> = (
  newResult: TResult,
  accumulatingResult: TResult
) => void;

export async function makeAirtablePostRequest<TResult>(
  personalAccessToken: string,
  path: string,
  data: any = undefined
): Promise<TResult> {
  assert(personalAccessToken.length > 0);
  assert(path.length > 0);
  const response = await axios.post(path, data, {
    headers: {
      Authorization: `Bearer ${personalAccessToken}`,
    },
  });
  return response.data as TResult;
}

export async function makeAirtableGetRequest<TResult>(
  personalAccessToken: string,
  path: string,
  params?: QueryParams
): Promise<TResult> {
  assert(personalAccessToken.length > 0);
  assert(path.length > 0);
  const response = await axios.get(path, {
    headers: {
      Authorization: `Bearer ${personalAccessToken}`,
    },
    params,
  });
  return response.data as TResult;
}

export async function makeAirtableDeleteRequest<TResult>(
  personalAccessToken: string,
  path: string
) {
  assert(personalAccessToken.length > 0);
  assert(path.length > 0);
  const response = await axios.delete(path, {
    headers: {
      Authorization: `Bearer ${personalAccessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.data as TResult;
}

export async function makeUnpaginatingAirtableGetRequest<
  TResult extends { offset?: string }
>(
  personalAccessToken: string,
  path: string,
  unpaginationCallback: UnpaginatingCallback<TResult>,
  params?: QueryParams
): Promise<TResult> {
  assert(personalAccessToken.length > 0);
  assert(path.length > 0);
  let noMore = false;
  let queryParams: QueryParams = params ?? {};
  let accumulation: TResult | null = null;
  let nIterations = 0;
  while (noMore !== true) {
    nIterations++;

    const response: TResult = await makeAirtableGetRequest(
      personalAccessToken,
      path,
      queryParams
    );
    if (nIterations === 1) {
      accumulation = response;
    } else {
      assert(accumulation);
      unpaginationCallback(response, accumulation);
    }

    if (response?.offset) {
      queryParams.offset = response.offset;
    } else {
      noMore = true;
    }
  }
  assert(accumulation);
  delete accumulation.offset;
  return accumulation;
}
