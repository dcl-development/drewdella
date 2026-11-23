/**
 * Copy the old built-in music catalog and contact email into Sanity.
 *
 * Idempotent. Matches releases by slug, then by album title. Creates a
 * document only when none exists (createIfNotExists). Patches use
 * setIfMissing, and blank strings / empty arrays are filled the same way.
 * A value already stored in Studio is left alone, including the primary
 * streaming URL and display order.
 *
 * Requires SANITY_API_TOKEN. Refuses to run without it.
 *
 *   SANITY_API_TOKEN=... node scripts/seed-sanity.mjs
 */

import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";
import { albumKey } from "../src/lib/slug.js";
import { loadDotenvLocal } from "../sanity/loadDotenv.js";
import { getSanityPublicEnv } from "../sanity/readEnv.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

loadDotenvLocal(ROOT);

const { projectId: PROJECT_ID, dataset: DATASET, apiVersion } =
  getSanityPublicEnv();
const CONTACT_EMAIL = "drewdella22@gmail.com";

const THX4ITALL_STORY = [
  "“My album is out now too. That was also a way I attempted to heal. I don't have much to say except to enjoy it. Enjoy V-day too. Play this album with caution. And to the one who knows , really, thank you for it all, 4 everything.”",
  "— Drew Della, Blog 2, February 14, 2026",
].join("\n");

const RELEASES = [
  {
    title: "Thx4itall.",
    slug: "thx4itall",
    date: "2026-02-14",
    year: 2026,
    order: 1,
    featured: true,
    subtitle: "4 someone I miss daily",
    story: THX4ITALL_STORY,
    coverFile: "public/covers/thx4itall.jpg",
    coverAlt: "Thx4itall. cover",
    doodleFile: "public/thx4itall-navbar.png",
    doodleAlt: "Thx4itall doodle",
    doodleCaption: "Project doodle.",
    links: [
      { label: "Spotify", url: "https://open.spotify.com/album/1nqFw70MQdVAo2N7JwUQsQ" },
      { label: "Apple Music", url: "https://geo.music.apple.com/us/album/thx4itall/1873166500" },
      { label: "YouTube Music", url: "https://youtu.be/48-QiA1XLj4" },
      { label: "Bandcamp", url: "https://drewdella.bandcamp.com/album/thx4itall" },
      { label: "Deezer", url: "https://www.deezer.com/album/907232702" },
    ],
    tracks: [
      { title: "Sorry In Advance", duration: "4:19" },
      { title: "Backwards", duration: "3:08" },
      { title: "Slowdnce", duration: "1:16" },
      { title: "I Like It When You..", duration: "3:45" },
      { title: "Stranger Danger", duration: "2:32" },
      { title: "Shot Me Down", duration: "7:34" },
      { title: "Wimbledon", duration: "2:09" },
      { title: "Don't Be So Dramatic", duration: "2:41" },
      { title: "Changed On Me", duration: "4:29" },
      { title: "Recreate You (in my lab)", duration: "6:17" },
    ],
  },
  {
    title: "DELLACORE VOL. 2",
    slug: "dellacore-vol-2",
    date: "2025-02-28",
    year: 2025,
    order: 2,
    featured: false,
    coverFile: "public/covers/dellacore-vol-2.jpg",
    coverAlt: "DELLACORE VOL. 2 cover",
    links: [
      { label: "Spotify", url: "https://open.spotify.com/album/3JUujmkgIBx4C28vWschmL" },
      { label: "Apple Music", url: "https://geo.music.apple.com/us/album/dellacore-vol-2/1797768104" },
    ],
    tracks: [
      { title: "Day Off Work", duration: "3:50" },
      { title: "Cleopatra", duration: "2:29" },
      { title: "All too quiet...", duration: "2:10" },
      { title: "FLY!", duration: "1:21" },
      { title: "Run 2 U", duration: "2:05" },
      { title: "Piece me together :)", duration: "2:22" },
      { title: "Be Myself 4 once", duration: "5:04" },
      { title: "I need ya!", duration: "2:56" },
    ],
  },
  {
    title: "DELLACORE VOL. 1",
    slug: "dellacore-vol-1",
    date: "2024-09-06",
    year: 2024,
    order: 3,
    featured: false,
    coverFile: "public/covers/dellacore-vol-1.jpg",
    coverAlt: "DELLACORE VOL. 1 cover",
    links: [
      { label: "Spotify", url: "https://open.spotify.com/album/7uXhqWRkfCr95ya4wh3AmV" },
      { label: "Apple Music", url: "https://geo.music.apple.com/gb/album/dellacore-vol-1/1765358701" },
    ],
    tracks: [
      { title: "Pray for Bronny", duration: "3:34" },
      { title: "Johnny Burnette", duration: "2:11" },
      { title: "Cuckoo", duration: "2:28" },
      { title: "Crash Site!", duration: "1:40" },
      { title: "Bryan Mills", duration: "1:17" },
      { title: "Endless", duration: "2:56" },
      { title: "WAKE UP!", duration: "2:36" },
      { title: "15, 16", duration: "2:50" },
      { title: "Sad, Political", duration: "2:30" },
      { title: "Feelin my mind is...", duration: "2:07" },
    ],
  },
  {
    title: "SUCH IS LIFE!",
    slug: "such-is-life",
    date: "2023-08-11",
    year: 2023,
    order: 4,
    featured: false,
    coverFile: "public/covers/such-is-life.jpg",
    coverAlt: "SUCH IS LIFE! cover",
    links: [
      { label: "Spotify", url: "https://open.spotify.com/album/3iyWYgrGOuDPiUkZayiTqv" },
      { label: "Apple Music", url: "https://geo.music.apple.com/us/album/such-is-life/1701323137" },
      { label: "Bandcamp", url: "https://drewdella.bandcamp.com/album/such-is-life" },
    ],
    tracks: [
      { title: "No One Knows Me.", duration: "3:06" },
      { title: "Distracted.", duration: "3:14" },
      { title: "The Intro!", duration: "1:02" },
      { title: "6 Shots!", duration: "2:48" },
      { title: "Find God!", duration: "1:10" },
      { title: "Bassline!", duration: "2:51" },
      { title: "Goodbye Sadboy!", duration: "2:50" },
      { title: "Back 2 Life!", duration: "1:14" },
      { title: "Julia Fox!", duration: "4:03" },
      { title: "I Wish We Talked More!", duration: "4:30" },
    ],
  },
];

function blank(value) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object" && Object.keys(value).length === 0) return true;
  return false;
}

function rows(items, prefix) {
  return items.map((item, index) => ({
    _key: `${prefix}-${index + 1}`,
    _type: "object",
    ...item,
  }));
}

async function imageRef(client, relativePath) {
  const filename = path.basename(relativePath);
  const existing = await client.fetch(
    `*[_type == "sanity.imageAsset" && originalFilename == $filename][0]._id`,
    { filename }
  );
  if (existing) return existing;
  const asset = await client.assets.upload(
    "image",
    createReadStream(path.join(ROOT, relativePath)),
    { filename }
  );
  return asset._id;
}

function imageValue(assetId, { alt, caption } = {}) {
  const image = {
    _type: "image",
    asset: { _type: "reference", _ref: assetId },
  };
  if (alt) image.alt = alt;
  if (caption) image.caption = caption;
  return image;
}

async function fillMissing(client, id, current, desired) {
  const missing = {};
  const blanked = {};
  for (const [key, value] of Object.entries(desired)) {
    if (value == null || value === "") continue;
    const have = current[key];
    if (have == null) missing[key] = value;
    else if (blank(have)) blanked[key] = value;
  }
  const keys = [...Object.keys(missing), ...Object.keys(blanked)];
  if (!keys.length) {
    console.log(`unchanged ${id}`);
    return keys;
  }
  let patch = client.patch(id);
  if (Object.keys(missing).length) patch = patch.setIfMissing(missing);
  if (Object.keys(blanked).length) patch = patch.set(blanked);
  await patch.commit();
  console.log(`filled ${id}: ${keys.join(", ")}`);
  return keys;
}

function presence(count) {
  if (count == null) return null;
  if (count === 0) return [];
  return ["kept"];
}

function findRelease(docs, entry) {
  return (
    docs.find((doc) => doc.slug === entry.slug) ||
    docs.find((doc) => albumKey(doc.title) === albumKey(entry.title)) ||
    null
  );
}

async function seedRelease(client, docs, entry) {
  let doc = findRelease(docs, entry);
  if (!doc) {
    const _id = `musicRelease.${entry.slug}`;
    await client.createIfNotExists({
      _id,
      _type: "musicRelease",
      title: entry.title,
    });
    doc = { _id, title: entry.title, slug: null };
    docs.push(doc);
    console.log(`created ${_id}`);
  }

  const desired = {
    slug: { _type: "slug", current: entry.slug },
    date: entry.date,
    year: entry.year,
    order: entry.order,
    featured: entry.featured,
    subtitle: entry.subtitle || null,
    story: entry.story || null,
    url: entry.links[0]?.url || null,
    links: rows(entry.links, "link"),
    tracks: rows(entry.tracks, "track"),
  };

  if (!doc.coverRef && entry.coverFile) {
    const assetId = await imageRef(client, entry.coverFile);
    desired.cover = imageValue(assetId, { alt: entry.coverAlt });
  }
  if (!doc.galleryCount && entry.doodleFile) {
    const assetId = await imageRef(client, entry.doodleFile);
    desired.gallery = [
      {
        _key: "doodle",
        ...imageValue(assetId, { alt: entry.doodleAlt, caption: entry.doodleCaption }),
      },
    ];
  }

  const current = {
    slug: doc.slug ? { _type: "slug", current: doc.slug } : doc.hasSlug ? {} : null,
    date: doc.date,
    year: doc.year,
    order: doc.order,
    featured: doc.featured,
    subtitle: doc.subtitle,
    story: doc.story,
    url: doc.url,
    links: presence(doc.linkCount),
    tracks: presence(doc.trackCount),
    cover: doc.coverRef ? { asset: doc.coverRef } : doc.hasCoverField ? {} : null,
    gallery: presence(doc.galleryCount),
  };

  await fillMissing(client, doc._id, current, desired);
}

async function seedContact(client) {
  const existing = await client.fetch(
    `*[_type == "contact"] | order(_updatedAt desc)[0]{ _id, email }`
  );
  if (!existing) {
    await client.createIfNotExists({
      _id: "contact.site",
      _type: "contact",
      email: CONTACT_EMAIL,
    });
    console.log("created contact.site");
    return;
  }
  await fillMissing(client, existing._id, { email: existing.email }, { email: CONTACT_EMAIL });
}

async function seedShop(client) {
  const existing = await client.fetch(
    `*[_type == "shopLink"] | order(_updatedAt desc)[0]{ _id, title, url }`
  );
  if (existing) {
    await fillMissing(
      client,
      existing._id,
      { title: existing.title, url: existing.url },
      { title: "Shopping", url: "https://drewdella.com/shop" }
    );
    return;
  }
  await client.createIfNotExists({
    _id: "shopLink.store",
    _type: "shopLink",
    title: "Shopping",
    url: "https://drewdella.com/shop",
  });
  console.log("created shopLink.store");
}

async function verify(client) {
  const report = await client.fetch(`{
    "musicRelease": count(*[_type == "musicRelease"]),
    "song": count(*[_type == "song"]),
    "blogPost": count(*[_type == "blogPost"]),
    "socialLink": count(*[_type == "socialLink"]),
    "mapLocation": count(*[_type == "mapLocation"]),
    "imageGallery": count(*[_type == "imageGallery"]),
    "galleryImages": count(*[_type == "imageGallery"].galleryImages[]),
    "shopLink": count(*[_type == "shopLink"]),
    "contact": count(*[_type == "contact" && defined(email)]),
    "releasesMissing": {
      "slug": count(*[_type == "musicRelease" && !defined(slug.current)]),
      "date": count(*[_type == "musicRelease" && !defined(date)]),
      "year": count(*[_type == "musicRelease" && !defined(year)]),
      "cover": count(*[_type == "musicRelease" && !defined(cover.asset)]),
      "url": count(*[_type == "musicRelease" && !defined(url)]),
      "links": count(*[_type == "musicRelease" && count(links) == 0]),
      "tracks": count(*[_type == "musicRelease" && count(tracks) == 0]),
      "subtitle": count(*[_type == "musicRelease" && slug.current == "thx4itall" && !defined(subtitle)]),
      "story": count(*[_type == "musicRelease" && slug.current == "thx4itall" && !defined(story)]),
      "featured": count(*[_type == "musicRelease" && featured == true])
    }
  }`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const token = process.env.SANITY_API_TOKEN;
if (!token) {
  console.error("SANITY_API_TOKEN is not set. Refusing to run.");
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion,
  token,
  useCdn: false,
});

const docs = await client.fetch(`*[_type == "musicRelease"]{
  _id, title, url, date, year, subtitle, story, featured, order,
  "slug": slug.current,
  "hasSlug": defined(slug),
  "coverRef": cover.asset._ref,
  "hasCoverField": defined(cover),
  "linkCount": count(links),
  "trackCount": count(tracks),
  "galleryCount": count(gallery)
}`);

for (const entry of RELEASES) {
  await seedRelease(client, docs, entry);
}
await seedContact(client);
await seedShop(client);
await verify(client);
