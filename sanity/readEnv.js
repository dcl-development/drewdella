/** @typedef {{ projectId: string, dataset: string, apiVersion: string }} SanityPublicEnv */

export const SANITY_API_VERSION_DEFAULT = "2025-08-06";

/**
 * @param {string} name
 * @returns {string}
 */
function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** @returns {SanityPublicEnv} */
export function getSanityPublicEnv() {
  return {
    projectId: requiredEnv("NEXT_PUBLIC_SANITY_PROJECT_ID"),
    dataset: requiredEnv("NEXT_PUBLIC_SANITY_DATASET"),
    apiVersion:
      process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() ||
      SANITY_API_VERSION_DEFAULT,
  };
}