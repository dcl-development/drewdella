import { createClient } from "@sanity/client";
import { getSanityPublicEnv } from "../sanity/readEnv.js";
import { youtubeCacheQuery } from "../src/lib/queries.ts";

export const VIDEO_CACHE_ID = "youtubeCache";

const SANITY = getSanityPublicEnv();

function snippetContainsHashtag(snippet) {
  const title = snippet?.title ?? "";
  const description = snippet?.description ?? "";
  return title.includes("#") || description.includes("#");
}

function pickThumbnailUrl(thumbnails) {
  const t = thumbnails?.high || thumbnails?.medium || thumbnails?.default;
  return t?.url ?? "";
}

/** YouTube snippet fields are HTML-entity encoded (&amp; etc). Decode for display. */
export function decodeHtmlEntities(value) {
  if (value == null) return "";
  let text = String(value);
  // One or two passes covers normal + double-encoded YouTube titles.
  for (let i = 0; i < 2; i += 1) {
    const next = text
      .replace(/&amp;/gi, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&#x0*27;/gi, "'")
      .replace(/&#(\d+);/g, (match, n) => {
        const code = Number(n);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      })
      .replace(/&#x([0-9a-f]+);/gi, (match, h) => {
        const code = Number.parseInt(h, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      });
    if (next === text) break;
    text = next;
  }
  return text;
}

export function publicVideoList(videos = []) {
  return videos.map((video) => ({
    id: video.id,
    title: decodeHtmlEntities(video.title),
    thumbnail: video.thumbnail,
    publishedAt: video.publishedAt,
    duration: video.duration || "",
    channelTitle: decodeHtmlEntities(video.channelTitle || ""),
    description: decodeHtmlEntities(video.description || ""),
  }));
}

export function videoIdsKey(videos = []) {
  return publicVideoList(videos)
    .map((video) => video.id)
    .join(",");
}

function formatIsoDuration(iso) {
  if (!iso || typeof iso !== "string") return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const pad = (n) => String(n).padStart(2, "0");
  if (hours) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

async function fetchVideoDetails(ids, apiKey) {
  if (!ids.length) return {};
  const url = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${ids.join(",")}&part=contentDetails,snippet`;
  const response = await fetch(url);
  if (!response.ok) return {};
  const data = await response.json();
  const byId = {};
  for (const item of data.items || []) {
    byId[item.id] = {
      duration: formatIsoDuration(item.contentDetails?.duration),
      channelTitle: item.snippet?.channelTitle || "",
      description: item.snippet?.description || "",
    };
  }
  return byId;
}

export async function fetchChannelVideos() {
  const { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } = process.env;

  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
    throw new Error("Missing YouTube configuration");
  }

  const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${YOUTUBE_CHANNEL_ID}&part=snippet,id&order=date&maxResults=50&type=video`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("YouTube API error response:", errorText);
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.items) {
    throw new Error("Invalid YouTube API response format");
  }

  const picked = data.items
    .filter(
      (item) => item.id?.videoId && !snippetContainsHashtag(item.snippet)
    )
    .slice(0, 12);

  const details = await fetchVideoDetails(
    picked.map((item) => item.id.videoId),
    YOUTUBE_API_KEY
  );

  return picked.map((item) => {
    const extra = details[item.id.videoId] || {};
    return {
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: pickThumbnailUrl(item.snippet.thumbnails),
      publishedAt: item.snippet.publishedAt,
      duration: extra.duration || "",
      channelTitle: extra.channelTitle || item.snippet.channelTitle || "",
      description: item.snippet.description || extra.description || "",
    };
  });
}

export function readClient() {
  return createClient({ ...SANITY, useCdn: true });
}

export function writeClient() {
  const token = process.env.SANITY_API_TOKEN;
  if (!token) return null;
  return createClient({ ...SANITY, useCdn: false, token });
}

export async function readStoredVideos() {
  const doc = await readClient().fetch(youtubeCacheQuery, {
    id: VIDEO_CACHE_ID,
  });
  const videos = publicVideoList(doc?.videos);
  return {
    videos,
    syncedAt: doc?.syncedAt || null,
  };
}

export async function storeVideos(videos) {
  const client = writeClient();
  if (!client) {
    throw new Error("Missing SANITY_API_TOKEN");
  }

  const syncedAt = new Date().toISOString();
  await client.createOrReplace({
    _id: VIDEO_CACHE_ID,
    _type: "youtubeCache",
    syncedAt,
    videos: publicVideoList(videos).map((video) => ({
      _key: video.id,
      ...video,
    })),
  });

  return syncedAt;
}
