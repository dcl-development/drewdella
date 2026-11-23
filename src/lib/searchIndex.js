import "server-only";
import { client } from "./sanity";
import { searchIndexQuery } from "./queries";
import { toSearchDoc } from "./siteSearch";
import { slugify } from "./slug";
import { readStoredVideos } from "../../lib/youtubeVideos.js";

const PAGES = [
  {
    id: "page-all",
    title: "Drew Della",
    href: "/",
    source: "All",
    internal: true,
    haystack: "official site home all music lyrics videos blog live shows chat hangouts",
  },
  {
    id: "page-home",
    title: "Drew Della homepage",
    href: "/home",
    source: "All",
    internal: true,
    haystack: "search homepage logo",
  },
  {
    id: "page-music",
    title: "Music",
    href: "/music",
    source: "Music",
    internal: true,
    haystack: "discography albums singles listen",
  },
  {
    id: "page-images",
    title: "Images",
    href: "/images",
    source: "Images",
    internal: true,
    haystack: "photos pics pictures gallery photo",
  },
  {
    id: "page-videos",
    title: "Videos",
    href: "/videos",
    source: "Videos",
    internal: true,
    haystack: "youtube clips",
  },
  {
    id: "page-blog",
    title: "Blog",
    href: "/blog",
    source: "Blog",
    internal: true,
    haystack: "posts writing journal",
  },
  {
    id: "page-connect",
    title: "Socials",
    href: "/connect",
    source: "Socials",
    internal: true,
    haystack: "instagram twitter follow connect",
  },
  {
    id: "page-lyrics",
    title: "Lyrics",
    href: "/lyrics",
    source: "Lyrics",
    internal: true,
    haystack: "songs words",
  },
  {
    id: "page-shop",
    title: "Shop",
    href: "/shop",
    source: "Store",
    internal: true,
    haystack: "merch store coming soon",
  },
  {
    id: "page-maps",
    title: "Live shows",
    href: "/maps",
    source: "Maps",
    internal: true,
    haystack: "venues map tour dates places hosted",
  },
];

function slugOf(item) {
  return item?.slug?.current || item?.slug || "";
}

export async function buildSearchIndex() {
  const [data, stored] = await Promise.all([
    client.fetch(searchIndexQuery).catch(() => ({})),
    readStoredVideos().catch(() => ({ videos: [] })),
  ]);

  const docs = PAGES.map((page) => ({ ...page }));

  for (const item of data?.releases || []) {
    const slug = item.slug || slugify(item.title);
    docs.push(
      toSearchDoc({
        id: item._id,
        title: item.title,
        href: slug ? `/music/${slug}` : item.url,
        source: "Music",
        internal: Boolean(slug),
        haystack: `${item.description || ""} ${item.url || ""}`,
        snippet: item.description || "",
      })
    );
  }

  for (const item of data?.posts || []) {
    const slug = slugOf(item);
    if (!slug) continue;
    docs.push(
      toSearchDoc({
        id: item._id,
        title: item.title,
        href: `/blog/${slug}`,
        source: "Blog",
        internal: true,
        haystack: item.body || "",
        snippet: item.body || "",
      })
    );
  }

  for (const item of data?.songs || []) {
    const slug = slugOf(item);
    if (!slug) continue;
    docs.push(
      toSearchDoc({
        id: item._id,
        title: item.title,
        href: `/lyrics/${slug}`,
        source: "Lyrics",
        internal: true,
        haystack: `${item.album || ""} ${item.lyrics || ""}`,
        snippet: item.album ? `Lyrics from ${item.album}` : "Single",
      })
    );
  }

  for (const item of data?.socials || []) {
    docs.push(
      toSearchDoc({
        id: item._id,
        title: item.title,
        href: item.url,
        source: "Socials",
        internal: false,
        haystack: item.description || "",
        snippet: item.description || "",
      })
    );
  }

  for (const item of data?.venues || []) {
    docs.push(
      toSearchDoc({
        id: item._id,
        title: item.venueName,
        href: "/maps",
        source: "Maps",
        internal: true,
        haystack: item.address || "",
        snippet: item.address || "Live show venue",
      })
    );
  }

  for (const item of data?.images || []) {
    const label = item.caption || item.alt;
    if (!label) continue;
    const imgId = item.id || "";
    docs.push(
      toSearchDoc({
        id: imgId || label,
        title: label,
        href: imgId ? `/images?img=${encodeURIComponent(imgId)}` : "/images",
        source: "Images",
        internal: true,
        haystack: `${item.caption || ""} ${item.alt || ""} photos pics photo picture`,
        snippet: "Photo",
      })
    );
  }

  for (const video of stored?.videos || []) {
    docs.push(
      toSearchDoc({
        id: video.id,
        title: video.title,
        href: `https://www.youtube.com/watch?v=${video.id}`,
        source: "Videos",
        internal: false,
        haystack: "",
        snippet: "YouTube",
      })
    );
  }

  return docs;
}
