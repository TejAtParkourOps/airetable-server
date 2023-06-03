import { makeErrorResponse } from "@parkour-ops/airetable-contract";

const noErrorDescription = "<No description available.>";

function extractErrorDescription(error: any) {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error;
  } else {
    return noErrorDescription;
  }
}

export const errors = {
  "auth-failed": (error: any) =>
    makeErrorResponse(
      401,
      `Authentication failed.`,
      `Failed to authenticate user: ${extractErrorDescription(error)}`
    ),
  "invalid-request": (error: any) =>
    makeErrorResponse(
      400,
      `Invalid request.`,
      `Invalid request: ${extractErrorDescription(error)}`
    ),
} as const;
