import { getSanityPublicEnv } from "./readEnv.js";

const { projectId, dataset, apiVersion } = getSanityPublicEnv();

export { projectId, dataset, apiVersion };