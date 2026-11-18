import { createHash } from "node:crypto";
import { createClient } from "@sanity/client";

const SANITY = {
  projectId: "qcu6o4bq",
  dataset: "production",
  apiVersion: "2024-01-01",
};

export const MAX_NAME = 24;
export const MAX_BODY = 280;
export const MESSAGE_LIMIT = 100;
export const POSTS_PER_IP_MINUTE = 8;
export const POSTS_GLOBAL_MINUTE = 30;

function readClient() {
  return createClient({ ...SANITY, useCdn: false });
}

function writeClient() {
  const token = process.env.SANITY_API_TOKEN;
  if (!token) return null;
  return createClient({ ...SANITY, useCdn: false, token });
}

function currentMinute() {
  return Math.floor(Date.now() / 60_000);
}

function chatRateSalt() {
  return (
    process.env.CRON_SECRET?.trim() ||
    process.env.SANITY_REVALIDATE_SECRET?.trim() ||
    ""
  );
}

function rateBucketId(ip) {
  const salt = chatRateSalt();
  const material = `${salt}|chat|${ip}|${currentMinute()}`;
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 32);
  return `chatRate.${hash}`;
}

async function bumpBucket(client, id, limit) {
  const existing = await client.fetch(`*[_id == $id][0]{ count }`, { id });
  const count = Number(existing?.count) || 0;
  if (count >= limit) {
    return { ok: false, retryAfter: 60 };
  }
  if (!existing) {
    await client.createOrReplace({
      _id: id,
      _type: "chatRateBucket",
      count: 1,
    });
  } else {
    await client.patch(id).inc({ count: 1 }).commit();
  }
  return { ok: true };
}

/** Per-IP and global per-minute caps stored in Sanity. */
export async function consumeChatPostQuota(ip) {
  const client = writeClient();
  if (!client) return { ok: true };

  const global = await bumpBucket(
    client,
    `chatRate.global.${currentMinute()}`,
    POSTS_GLOBAL_MINUTE
  );
  if (!global.ok) return global;

  return bumpBucket(client, rateBucketId(ip || "unknown"), POSTS_PER_IP_MINUTE);
}

export function publicMessage(doc) {
  if (!doc?._id) return null;
  return {
    id: doc._id,
    name: String(doc.name || "").trim(),
    body: String(doc.body || "").trim(),
    createdAt: doc._createdAt || null,
  };
}

export function cleanName(raw) {
  return String(raw || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME);
}

export function cleanBody(raw) {
  return String(raw || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, MAX_BODY);
}

export async function listMessages(limit = MESSAGE_LIMIT) {
  const docs = await readClient().fetch(
    `*[_type == "chatMessage"] | order(_createdAt desc)[0...100]{
      _id,
      name,
      body,
      _createdAt
    }`
  );
  const messages = (docs || []).map(publicMessage).filter(Boolean).reverse();
  const safe = Math.min(Math.max(Number(limit) || MESSAGE_LIMIT, 1), MESSAGE_LIMIT);
  return messages.slice(-safe);
}

export async function createMessage({ name, body }) {
  const client = writeClient();
  if (!client) {
    throw new Error("Missing SANITY_API_TOKEN");
  }

  const cleanedName = cleanName(name);
  const cleanedBody = cleanBody(body);
  if (!cleanedName) {
    const err = new Error("Name is required");
    err.status = 400;
    throw err;
  }
  if (!cleanedBody) {
    const err = new Error("Message is required");
    err.status = 400;
    throw err;
  }

  const doc = await client.create({
    _type: "chatMessage",
    name: cleanedName,
    body: cleanedBody,
  });

  return publicMessage(doc);
}
