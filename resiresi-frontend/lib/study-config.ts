/**
 * The one thing the implementation guide can't know until you've provisioned it:
 * the EC2 the tester connects to. Set these as env vars on the Vercel project and
 * every command in the guide renders concrete — nothing for the tester to guess.
 */
export const EC2 = {
  host: process.env.RESIRESI_EC2_HOST ?? "<your EC2 Public IPv4 DNS>",
  user: process.env.RESIRESI_EC2_USER ?? "ubuntu",
  keyFile: process.env.RESIRESI_EC2_KEY ?? "resiresi.pem",
  dir: process.env.RESIRESI_REPO_DIR ?? "/home/ubuntu/code/rr/resiresi-frontend",
};

/** The proxy name the tester creates in APIblaze. */
export const PROXY_NAME = process.env.RESIRESI_PROXY_NAME ?? "resiresi";
