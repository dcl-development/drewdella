import { createImageUrlBuilder } from "@sanity/image-url";
import { projectId, dataset } from "../../sanity/env";

/**
 * Builds cdn.sanity.io URLs only. This module must not fetch the Sanity API,
 * so client components can import it without a CORS request.
 */
const builder = createImageUrlBuilder({
  projectId,
  dataset,
});

export function urlFor(source) {
  return builder.image(source);
}

export function sanityImage(source, { width, height, quality = 75 } = {}) {
  if (!source) return "";
  try {
    let image = urlFor(source).auto("format").quality(quality).fit("max");
    if (width) image = image.width(Math.round(width));
    if (height) image = image.height(Math.round(height));
    return image.url();
  } catch {
    return "";
  }
}