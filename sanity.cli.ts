import { defineCliConfig } from "sanity/cli";

import { loadDotenvLocal } from "./sanity/loadDotenv.js";
import { getSanityPublicEnv } from "./sanity/readEnv.js";

loadDotenvLocal();

const { projectId, dataset } = getSanityPublicEnv();

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
  typegen: {
    path: [
      "./src/**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "./lib/**/*.{ts,tsx,js,jsx,mjs,cjs}",
    ],
    schema: "./schema.json",
    generates: "./sanity.types.ts",
    overloadClientMethods: true,
  },
});