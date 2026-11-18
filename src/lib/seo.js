import { urlFor } from "./imageUrl";

export const SITE_URL = "https://drewdella.com";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

export function shareImageUrl(source) {
  if (!source?._id) return "";
  try {
    return urlFor(source)
      .width(OG_IMAGE_SIZE.width)
      .height(OG_IMAGE_SIZE.height)
      .fit("crop")
      .auto("format")
      .quality(80)
      .url();
  } catch {
    return "";
  }
}

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  imageUrl,
  imageAlt,
}) {
  const url = `${SITE_URL}${path || "/"}`;
  const ogImages = imageUrl
    ? [
        {
          url: imageUrl,
          width: OG_IMAGE_SIZE.width,
          height: OG_IMAGE_SIZE.height,
          alt: imageAlt || title,
        },
      ]
    : undefined;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path || "/" },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Drew Della",
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

/** Metadata for routes that will call notFound() — avoids wrong canonicals. */
export function notFoundMetadata() {
  return {
    title: { absolute: "Page not found — Drew Della" },
    description: "This page could not be found.",
    robots: { index: false, follow: false },
  };
}

export async function pageMetadataAsync(options) {
  let imageUrl = options.imageUrl;
  let imageAlt = options.imageAlt;

  if (!imageUrl) {
    const { getSiteShareImageAsset } = await import("./content");
    const asset = await getSiteShareImageAsset().catch(() => null);
    if (asset?._id) {
      imageUrl = shareImageUrl(asset);
      imageAlt = imageAlt || asset.alt || options.title;
    }
  }

  return pageMetadata({ ...options, imageUrl, imageAlt });
}

export function siteJsonLd(sameAs = []) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Person", "MusicGroup"],
        "@id": `${SITE_URL}/#artist`,
        name: "Drew Della",
        url: SITE_URL,
        description:
          "Drew Della — artist, musician, creator. Music, lyrics, videos, and live shows.",
        sameAs,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Drew Della",
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#artist` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/home?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function articleJsonLd(post) {
  const slug = post?.slug?.current || post?.slug || "";
  const url = `${SITE_URL}/blog/${slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.date || undefined,
    description: String(post.preview || "").replace(/\s+/g, " ").trim().slice(0, 200),
    mainEntityOfPage: url,
    url,
    author: { "@type": "Person", name: "Drew Della", url: SITE_URL },
    publisher: { "@type": "Person", name: "Drew Della", url: SITE_URL },
  };
}

export function lyricsJsonLd(song, slug) {
  const url = `${SITE_URL}/lyrics/${slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "MusicComposition",
    name: song.title,
    url,
    inLanguage: "en",
    ...(song.album
      ? {
          isPartOf: {
            "@type": "MusicAlbum",
            name: song.album,
          },
        }
      : {}),
    composer: {
      "@type": "Person",
      name: "Drew Della",
      url: SITE_URL,
    },
  };
}

export function albumJsonLd(release) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: release.title,
    description: release.subtitle || release.description || undefined,
    datePublished: release.date || release.year || undefined,
    url: `${SITE_URL}${release.href}`,
    byArtist: {
      "@type": "MusicGroup",
      name: "Drew Della",
      url: SITE_URL,
    },
    track: (release.tracks || []).map((track, index) => ({
      "@type": "MusicRecording",
      name: track.title,
      position: index + 1,
      url: track.slug ? `${SITE_URL}/lyrics/${track.slug}` : undefined,
      byArtist: { "@type": "MusicGroup", name: "Drew Della" },
    })),
  };
}
