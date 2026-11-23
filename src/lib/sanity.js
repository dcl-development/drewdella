import "server-only";
import { createClient } from "@sanity/client";
import { projectId, dataset, apiVersion } from "../../sanity/env";

export const client = createClient({
  projectId,
  dataset,
  useCdn: true,
  apiVersion,
});

export { urlFor, sanityImage } from "./imageUrl";