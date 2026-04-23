export interface CustomHeader {
  name: string;
  value: string;
}

export type AuthMode = "apikey" | "oauth" | "passthru";
export type BackendMode = "original" | "proxy";

export interface ApiBlazeConfig {
  backend: BackendMode;
  authMode: AuthMode;
  apiKey: string;
  customHeaders: CustomHeader[];
}

export const COOKIE_NAME = "apiblaze";

export function parseConfig(
  cookieValue: string | undefined,
  defaultApiKey: string
): ApiBlazeConfig {
  const def: ApiBlazeConfig = {
    backend: "original",
    authMode: "apikey",
    apiKey: defaultApiKey,
    customHeaders: [],
  };
  if (!cookieValue) return def;
  try {
    return { ...def, ...JSON.parse(decodeURIComponent(cookieValue)) };
  } catch {
    return def;
  }
}
