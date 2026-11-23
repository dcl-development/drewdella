import { cache } from "react";
import { client, sanityImage } from "./sanity";
import { resolveShopDestination } from "./shopLink";
import { albumKey, slugify } from "./slug";
import {
  allFeedQuery,
  blogListQuery,
  blogPostBySlugQuery,
  blogPostShareImageQuery,
  contactEmailQuery,
  imageGalleryQuery,
  luckyPathsQuery,
  lyricBySlugQuery,
  lyricsListQuery,
  mapLocationsQuery,
  musicReleasesQuery,
  releaseShareImageQuery,
  shopLinkQuery,
  siteShareImageQuery,
  sitemapBlogSlugsQuery,
  sitemapSongSlugsQuery,
  socialLinksQuery,
  songsListQuery,
} from "./queries";

export { albumKey, slugify };

export const REVALIDATE_SECONDS = 3600;

export function releaseSlug(release) {
  return release?.slug || slugify(release?.title) || "";
}

export function releaseYear(release) {
  if (release?.year) return String(release.year);
  const raw = release?.date ? String(release.date) : "";
  const match = raw.match(/^(\d{4})/);
  return match ? match[1] : "";
}

function coverOf(release) {
  if (!release?.cover?.asset) return "";
  return sanityImage(release.cover, { width: 800, quality: 75 });
}

function lyricSlug(title, songs, albumTitles) {
  const keys = new Set((albumTitles || []).map((name) => albumKey(name)).filter(Boolean));
  const want = albumKey(title);
  if (!want || !keys.size) return "";
  const song = (songs || []).find(
    (item) =>
      item?.slug &&
      keys.has(albumKey(item.album)) &&
      albumKey(item.title) === want
  );
  return song?.slug || "";
}

function withLyricLinks(tracks, songs, albumTitles) {
  return (tracks || []).map((track) => ({
    title: track.title,
    duration: track.duration || "",
    slug: track.slug || lyricSlug(track.title, songs, albumTitles),
  }));
}

export function shapeRelease(release, songs = []) {
  const slug = releaseSlug(release);
  const key = albumKey(release?.title);
  const matched = (songs || [])
    .filter((song) => albumKey(song.album) === key)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((song) => ({
      title: song.title,
      slug: song.slug || "",
      duration: "",
    }));
  const authored = (release?.tracks || [])
    .filter((track) => track?.title)
    .map((track) => ({
      title: track.title,
      duration: track.duration || "",
      slug: "",
    }));
  const links = [];
  if (release?.url) links.push({ label: "Listen", url: release.url });
  for (const link of release?.links || []) {
    if (!link?.url) continue;
    if (links.some((item) => item.url === link.url)) continue;
    links.push({ label: link.label || "Listen", url: link.url });
  }
  const gallery = (release?.gallery || [])
    .filter((image) => image?.asset)
    .map((image) => ({
      alt: image.alt || release.title || "",
      caption: image.caption || "",
      src: sanityImage(image, { width: 1400, quality: 75 }),
      width: image.asset?.metadata?.dimensions?.width || 1200,
      height: image.asset?.metadata?.dimensions?.height || 1200,
    }))
    .filter((image) => image.src);

  return {
    id: release._id,
    title: release.title || "Untitled",
    description: String(release.description || "").trim(),
    subtitle: String(release.subtitle || "").trim(),
    story: String(release.story || "").trim(),
    url: release.url || "",
    date: release.date || "",
    year: releaseYear(release),
    order: release.order ?? 0,
    featured: Boolean(release.featured),
    slug,
    href: slug ? `/music/${slug}` : "/music",
    cover: coverOf(release),
    coverAlt: release?.cover?.alt || `${release.title || "Release"} cover`,
    tracks: withLyricLinks(
      authored.length ? authored : matched,
      songs,
      [release.title]
    ),
    trackSource: authored.length ? "release" : matched.length ? "lyrics" : "none",
    links,
    gallery,
  };
}

export const getSongs = cache(async () => {
  return client.fetch(songsListQuery);
});

export const getReleases = cache(async () => {
  const [releases, songs] = await Promise.all([
    client.fetch(musicReleasesQuery).catch(() => []),
    getSongs().catch(() => []),
  ]);
  return (releases || [])
    .map((release) => shapeRelease(release, songs || []))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
});

export const getRelease = cache(async (slug) => {
  const releases = await getReleases();
  return releases.find((release) => release.slug === slug) || null;
});

export function featuredRelease(releases) {
  if (!releases?.length) return null;
  return releases.find((release) => release.featured) || releases[0];
}

export const getLuckyPaths = cache(async () => {
  const data = await client.fetch(luckyPathsQuery);
  const paths = [
    ...(data?.posts || []).map((slug) => `/blog/${slug}`),
    ...(data?.songs || []).map((slug) => `/lyrics/${slug}`),
    ...(data?.images || [])
      .filter(Boolean)
      .map((id) => `/images?img=${encodeURIComponent(id)}`),
    ...(data?.releases || []).map((release) => {
      const slug = release.slug || slugify(release.title);
      return slug ? `/music/${slug}` : "";
    }),
    "/maps",
  ];
  return [...new Set(paths.filter(Boolean))];
});

export const getBlogList = cache(async () => {
  return client.fetch(blogListQuery);
});

export const getBlogPost = cache(async (slug) => {
  if (!slug) return null;
  return client.fetch(blogPostBySlugQuery, { slug });
});

export const getLyricsList = cache(async () => {
  return client.fetch(lyricsListQuery);
});

export const getLyric = cache(async (slug) => {
  if (!slug) return null;
  return client.fetch(lyricBySlugQuery, { slug });
});

export const getShopDestination = cache(async () => {
  const data = await client.fetch(shopLinkQuery);
  return resolveShopDestination(data?.url);
});

export const getSocials = cache(async () => {
  return client.fetch(socialLinksQuery);
});

export const getContactEmail = cache(async () => {
  const email = await client.fetch(contactEmailQuery);
  return String(email || "").trim();
});

/** Sanity asset reference for sitewide og:image (1200×630 crop applied in seo.js). */
export const getSiteShareImageAsset = cache(async () => {
  const data = await client.fetch(siteShareImageQuery);
  return data?.custom || data?.cover || data?.coverAny || data?.header || null;
});

export const getBlogPostShareImageAsset = cache(async (slug) => {
  if (!slug) return null;
  return client.fetch(blogPostShareImageQuery, { slug });
});

export const getReleaseShareImageAsset = cache(async (slug) => {
  if (!slug) return null;
  return client.fetch(releaseShareImageQuery, { slug });
});

export const getMapLocations = cache(async () => {
  return client.fetch(mapLocationsQuery);
});

export const getGallery = cache(async () => {
  const started = Date.now();
  const data = await client.fetch(imageGalleryQuery);
  const images = (data?.galleryImages || []).filter((img) => img && img.asset);
  const elapsed = Math.max((Date.now() - started) / 1000, 0.04).toFixed(2);
  return { images, elapsed };
});

export const getAllFeed = cache(async () => {
  const started = Date.now();
  const { readStoredVideos } = await import("../../lib/youtubeVideos.js");
  const [data, stored] = await Promise.all([
    client.fetch(allFeedQuery),
    readStoredVideos().catch(() => ({ videos: [] })),
  ]);
  const elapsed = Math.max((Date.now() - started) / 1000, 0.04).toFixed(2);
  const images = (data?.images || [])
    .filter((img) => img?.asset)
    .map((img) => ({
      id: img.id,
      alt: img.alt || "",
      src: sanityImage(img.asset, { width: 240, height: 180, quality: 70 }),
    }))
    .filter((img) => img.src);
  return {
    data: { ...(data || {}), images },
    latestVideo: stored.videos?.[0] || null,
    elapsed,
  };
});

export const getSitemapEntries = cache(async () => {
  const [posts, songs, releases] = await Promise.all([
    client.fetch(sitemapBlogSlugsQuery),
    client.fetch(sitemapSongSlugsQuery),
    getReleases().catch(() => []),
  ]);
  return { posts: posts || [], songs: songs || [], releases: releases || [] };
});
