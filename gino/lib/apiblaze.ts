export interface CustomHeader { name: string; value: string; }
export type AuthMode = "apikey" | "oauth" | "passthru";
export type BackendMode = "original" | "proxy";

export interface ApiBlazeConfig {
  // Resiresi backend (reservations)
  backend: BackendMode;
  authMode: AuthMode;
  apiKey: string;
  customHeaders: CustomHeader[];
  // Restaurant's own backend (profile)
  ownBackend: BackendMode;
  ownAuthMode: AuthMode;
  ownApiKey: string;
  ownCustomHeaders: CustomHeader[];
}

export const COOKIE_NAME = "apiblaze";

export function parseConfig(
  cookieValue: string | undefined,
  defaultApiKey = "",
  defaultOwnApiKey = ""
): ApiBlazeConfig {
  const def: ApiBlazeConfig = {
    backend: "original",
    authMode: "apikey",
    apiKey: defaultApiKey,
    customHeaders: [],
    ownBackend: "original",
    ownAuthMode: "passthru",
    ownApiKey: defaultOwnApiKey,
    ownCustomHeaders: [],
  };
  if (!cookieValue) return def;
  try {
    return { ...def, ...JSON.parse(decodeURIComponent(cookieValue)) };
  } catch {
    return def;
  }
}
