export type EnvironmentVariableType = "string" | "number" | "boolean";

export function loadOptionalEnvironmentVariable(
  key: string,
  asType: Extract<EnvironmentVariableType, "string">,
  noPrefix?: boolean
): string;
export function loadOptionalEnvironmentVariable(
  key: string,
  asType: Extract<EnvironmentVariableType, "number">,
  noPrefix?: boolean
): number;
export function loadOptionalEnvironmentVariable(
  key: string,
  asType: Extract<EnvironmentVariableType, "boolean">,
  noPrefix?: boolean
): boolean;
export function loadOptionalEnvironmentVariable(
  key: string,
  asType: EnvironmentVariableType,
  noPrefix?: boolean
) {
  const _key = noPrefix ? key : `AIRETABLE_${key}`;
  const val = process.env?.[_key];
  if (!val) return undefined;
  switch (asType) {
    case "number":
      return parseInt(val);
    case "boolean":
      const _val = val.toLowerCase();
      return ["true", "yes", "y", "1"].includes(_val) ? true : false;
    default:
      return val as string;
  }
}

export function loadRequiredEnvironmentVariable(
  key: string,
  asType: Extract<EnvironmentVariableType, "string">,
  noPrefix?: boolean
): string;
export function loadRequiredEnvironmentVariable(
  key: string,
  asType: Extract<EnvironmentVariableType, "number">,
  noPrefix?: boolean
): number;
export function loadRequiredEnvironmentVariable(
  key: string,
  asType: Extract<EnvironmentVariableType, "boolean">,
  noPrefix?: boolean
): boolean;
export function loadRequiredEnvironmentVariable(
  key: string,
  asType: EnvironmentVariableType,
  noPrefix?: boolean
) {
  const _key = noPrefix ? key : `AIRETABLE_${key}`;
  const val = process.env?.[_key];
  if (!val)
    throw Error(`Required environment variable has not been set: ${_key}`);
  switch (asType) {
    case "number":
      return parseInt(val);
    case "boolean":
      const _val = val.toLowerCase();
      return ["true", "yes", "y", "1"].includes(_val) ? true : false;
    default:
      return val as string;
  }
}
