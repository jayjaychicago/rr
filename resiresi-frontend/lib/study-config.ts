/**
 * Study fixture config. REPO_URL fills the clone command in the guide;
 * PROXY_NAME is the proxy the tester creates in APIblaze.
 */
export const REPO_URL =
  process.env.RESIRESI_REPO_URL ?? "https://github.com/jayjaychicago/rr";

export const PROXY_NAME = process.env.RESIRESI_PROXY_NAME ?? "resiresi";
