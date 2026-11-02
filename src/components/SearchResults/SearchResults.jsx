"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { searchSuggestions } from "../../constants/searchSuggestions";
import { safeHref } from "../../lib/safeHref.js";
import "./SearchResults.css";

const OWN_HOST = "drewdella.com";

function sectionLabel(part) {
  if (!part || part.includes(".") || part.includes("/")) return part;
  return part.charAt(0).toUpperCase() + part.slice(1);
}

export function pathCite(...parts) {
  return parts
    .filter(Boolean)
    .map((part, index) => (index === 0 ? sectionLabel(part) : part))
    .join(" › ");
}

export function formatCite(url) {
  try {
    const parsed = new URL(url, `https://${OWN_HOST}`);
    const host = parsed.hostname.replace(/^www\./, "");
    const crumbs = parsed.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 4)
      .map((part) => decodeURIComponent(part));
    if (host === OWN_HOST) {
      return crumbs
        .map((part, index) => (index === 0 ? sectionLabel(part) : part))
        .join(" › ");
    }
    return [host, ...crumbs].join(" › ");
  } catch {
    return url;
  }
}

export function formatAdCite(href) {
  if (!href) return "";
  if (href.startsWith("/")) return `www.${OWN_HOST}${href}`;
  try {
    const parsed = new URL(href);
    const host = parsed.hostname.startsWith("www.")
      ? parsed.hostname
      : `www.${parsed.hostname}`;
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${host}${path}`;
  } catch {
    return href;
  }
}

export function formatListingDate(value) {
  if (!value) return "";
  const raw = String(value);
  const dayOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dayOnly
    ? new Date(
        Date.UTC(
          Number(dayOnly[1]),
          Number(dayOnly[2]) - 1,
          Number(dayOnly[3])
        )
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// "Lyrics from <album>." without doubling the album's own end punctuation
// (CMS titles like "Thx4itall. " or "SUCH IS LIFE!").
export function albumSentence(album) {
  const name = String(album).trim();
  return /[.!?]$/.test(name) ? `Lyrics from ${name}` : `Lyrics from ${name}.`;
}

export function datedSnippet(dateValue, ...parts) {
  return [formatListingDate(dateValue), ...parts]
    .filter(Boolean)
    .join(" — ");
}

export function formatElapsed(ms) {
  const seconds = Math.max(ms / 1000, 0.04);
  return seconds.toFixed(2);
}

export function snippetFromPortableText(blocks, max = 165) {
  if (!blocks) return "";
  const text = String(blocks)
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")} ...`;
}

export function blogPreviewSnippet(item, max = 165) {
  const text = snippetFromPortableText(item?.preview, max);
  if (text) return text;
  const n = Number(item?.imageCount) || 0;
  if (n === 1) return "Image attached.";
  if (n > 1) return `${n} images attached.`;
  return "";
}

export function socialSnippet(item) {
  const written = String(item?.description || "").trim();
  if (written) return written;
  const name = String(item?.title || "this page").trim();
  return `Follow Drew Della on ${name}.`;
}

export function SearchResults({
  count,
  elapsed,
  children,
  query,
  onQueryChange,
  queryPlaceholder = "Filter results",
  sort,
  onSortChange,
  sortOptions,
}) {
  const n = Number(count) || 0;
  const showTools = Boolean(onQueryChange) || Boolean(sortOptions?.length);

  return (
    <div className="serp">
      {showTools && (
        <div className="serp-tools">
          {onQueryChange && (
            <input
              type="search"
              className="serp-filter"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={queryPlaceholder}
              aria-label={queryPlaceholder}
            />
          )}
          {sortOptions?.length > 0 && (
            <label className="serp-sort">
              Sort
              <select
                value={sort}
                onChange={(e) => onSortChange(e.target.value)}
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      <p className="serp-stats">
        About {n.toLocaleString("en-US")} result{n === 1 ? "" : "s"} ({elapsed}{" "}
        seconds)
      </p>
      <div className="serp-list">{children}</div>
      <SerpFooter />
    </div>
  );
}

export function SerpFooter() {
  return <SerpRelated />;
}

function SerpRelated() {
  const pathname = usePathname();
  const items = searchSuggestions.filter((item) => {
    if (!item?.path || !item?.name) return false;
    if (item.path === "/") {
      return pathname !== "/" && pathname !== "/all";
    }
    return (
      pathname !== item.path &&
      !pathname.startsWith(`${item.path}/`)
    );
  }).filter((item, i, list) => list.findIndex((row) => row.path === item.path) === i);

  if (!items.length) return null;

  return (
    <div className="serp-related">
      <p className="serp-related-label">Searches related to drew della</p>
      <ul>
        {items.map((item) => (
          <li key={item.name}>
            <Link href={item.path} prefetch={false}>{item.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SearchResult({
  href,
  title,
  cite,
  snippet,
  internal = false,
  sponsored = false,
}) {
  const className = "serp-title";
  const safe = safeHref(href);
  const mail = safe?.startsWith("mailto:");
  const titleEl = !safe ? (
    <span className={className}>{title}</span>
  ) : internal || safe.startsWith("/") ? (
    <Link className={className} href={safe} prefetch={false}>
      {title}
    </Link>
  ) : mail ? (
    <a className={className} href={safe}>
      {title}
    </a>
  ) : (
    <a
      className={className}
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
    >
      {title}
    </a>
  );

  const citeText = sponsored ? formatAdCite(safe || href) : cite;
  const citeEl = citeText ? (
    <cite className="serp-cite">
      {sponsored && (
        <span className="serp-ad">Ad</span>
      )}
      {citeText}
      {!sponsored && (
        <span className="serp-cite-arrow" aria-hidden>
          ▼
        </span>
      )}
    </cite>
  ) : null;

  return (
    <div className={`serp-result${sponsored ? " serp-result--ad" : ""}`}>
      {titleEl}
      {citeEl}
      {snippet && <p className="serp-snippet">{snippet}</p>}
    </div>
  );
}

function videoDescriptionSnippet(description, title, max = 140) {
  if (!description) return "";
  const skip = (line) => {
    const text = line.trim();
    if (!text) return true;
    if (title && text.toLowerCase() === String(title).toLowerCase()) return true;
    if (/^provided to youtube/i.test(text)) return true;
    if (/^https?:\/\//i.test(text)) return true;
    return false;
  };
  const line = String(description)
    .split(/\n+/)
    .map((part) => part.trim())
    .find((part) => !skip(part));
  return snippetFromPortableText(line, max);
}

export function VideoResult({ video, priority = false }) {
  if (!video) return null;

  const href = `https://www.youtube.com/watch?v=${video.id}`;
  const dateLabel = formatListingDate(video.publishedAt);
  const channel = video.channelTitle || "Drew Della";
  const meta = [
    video.duration,
    dateLabel
      ? `Uploaded by ${channel} on ${dateLabel}`
      : `Uploaded by ${channel}`,
  ]
    .filter(Boolean)
    .join(" - ");
  const description = videoDescriptionSnippet(video.description, video.title);

  return (
    <div className="video-result">
      <a
        className="video-result-thumb"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Play ${video.title}${video.duration ? `, ${video.duration}` : ""}`}
      >
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt=""
            width={120}
            height={90}
            sizes="(max-width: 768px) 96px, 120px"
            unoptimized
            priority={priority}
            fetchPriority={priority ? "high" : undefined}
          />
        ) : null}
        <span className="video-result-play" aria-hidden />
        {video.duration ? (
          <span className="video-result-time">{video.duration}</span>
        ) : null}
      </a>
      <div className="video-result-copy">
        <a
          className="serp-title"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {video.title}
        </a>
        <cite className="serp-cite">
          youtube.com › watch
          <span className="serp-cite-arrow" aria-hidden>
            ▼
          </span>
        </cite>
        {meta ? <p className="serp-snippet video-result-meta">{meta}</p> : null}
        {description ? (
          <p className="serp-snippet video-result-desc">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
