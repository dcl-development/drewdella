"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import SanityImage from "../../components/SanityImage.jsx";
import { slugify } from "../../lib/slug";
import {
  SearchResults,
  SearchResult,
  VideoResult,
  formatCite,
  pathCite,
  datedSnippet,
  albumSentence,
  snippetFromPortableText,
  blogPreviewSnippet,
  socialSnippet,
} from "../../components/SearchResults/SearchResults.jsx";
import { useVisualViewportBottom } from "../../lib/useVisualViewportBottom";
import { safeHref } from "../../lib/safeHref.js";
import "./AllPage.css";

function VintagePopup({ title, lines, cta, href }) {
  const [phase, setPhase] = useState("off");
  const dockBottom = useVisualViewportBottom(12);
  const safe = safeHref(href) || "/music";
  const isInternal = safe.startsWith("/");
  const ctaProps = isInternal
    ? { href: safe }
    : { href: safe, target: "_blank", rel: "noopener noreferrer" };
  const CtaTag = isInternal ? Link : "a";
  const tucked = phase === "peek";

  useEffect(() => {
    let hide;
    const enter = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setPhase("open"));
    });
    hide = window.setTimeout(() => setPhase("peek"), 3800);
    return () => {
      window.cancelAnimationFrame(enter);
      window.clearTimeout(hide);
    };
  }, []);

  return (
    <div
      className={`win-popup-dock is-${phase}`}
      style={{ bottom: dockBottom }}
    >
      <div className="win-popup">
        <div className="win-popup-bar">
          {tucked ? (
            <button
              type="button"
              className="win-popup-peek-expand"
              onClick={() => setPhase("open")}
              aria-label="Show congratulations"
            >
              <span className="win-popup-title">{title}</span>
            </button>
          ) : (
            <span className="win-popup-title">{title}</span>
          )}
          <button
            type="button"
            className="win-popup-x"
            onClick={(e) => {
              e.stopPropagation();
              setPhase("peek");
            }}
            aria-label="Hide"
            tabIndex={tucked ? -1 : 0}
            aria-hidden={tucked}
          >
            ×
          </button>
        </div>
        <div
          className="win-popup-body"
          aria-hidden={tucked}
          inert={tucked}
        >
          <div className="win-popup-msg">
            <Image
              className="win-popup-doodle"
              src="/thx4itall-navbar.png"
              alt=""
              width={693}
              height={360}
              sizes="168px"
              style={{ width: 168, height: "auto" }}
            />
            <div>
              {lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          <CtaTag
            className="win-popup-cta"
            onClick={(e) => e.stopPropagation()}
            {...ctaProps}
          >
            {cta}
          </CtaTag>
        </div>
      </div>
    </div>
  );
}

function ImagesOneBox({ images }) {
  const thumbs = (images || []).filter((img) => img?.src).slice(0, 6);

  return (
    <div className="images-onebox">
      <Link className="serp-title" href="/images" prefetch={false}>
        Images for Drew Della
      </Link>
      <cite className="serp-cite">
        {pathCite("images")}
        <span className="serp-cite-arrow" aria-hidden>
          ▼
        </span>
      </cite>
      {thumbs.length > 0 && (
        <div className="images-onebox-strip">
          {thumbs.map((img, index) => {
            const imgId = img.id || img.asset?._id;
            const src = img.src;
            if (!src) return null;
            return (
              <Link
                key={imgId || src}
                className="images-onebox-frame"
                href={imgId ? `/images?img=${encodeURIComponent(imgId)}` : "/images"}
                aria-label={img.alt || "View image"}
                prefetch={false}
              >
                <SanityImage
                  src={src}
                  alt={img.alt || ""}
                  width={90}
                  height={68}
                  sizes="(max-width: 768px) 72px, 90px"
                  priority={index === 0}
                  fetchPriority={index === 0 ? "high" : undefined}
                />
              </Link>
            );
          })}
        </div>
      )}
      <Link className="images-onebox-more" href="/images" prefetch={false}>
        More images »
      </Link>
    </div>
  );
}

function mixResults({ releases, posts, songs, socials }) {
  const mixed = [];
  const take = [
    ...(releases || []).map((item) => ({ kind: "music", item })),
    ...(posts || []).map((item) => ({ kind: "blog", item })),
    ...(songs || []).map((item) => ({ kind: "lyrics", item })),
    ...(socials || []).map((item) => ({ kind: "social", item })),
  ];

  const buckets = {
    music: take.filter((x) => x.kind === "music"),
    blog: take.filter((x) => x.kind === "blog"),
    lyrics: take.filter((x) => x.kind === "lyrics"),
    social: take.filter((x) => x.kind === "social"),
  };

  const order = ["music", "blog", "lyrics", "social"];
  let added = true;
  while (added) {
    added = false;
    for (const key of order) {
      const next = buckets[key].shift();
      if (next) {
        mixed.push(next);
        added = true;
      }
    }
  }
  return mixed;
}

export default function AllPage({ feed = null }) {
  const data = feed?.data || {
    releases: [],
    posts: [],
    songs: [],
    socials: [],
    images: [],
  };
  const elapsed = feed?.elapsed || "0.12";
  const latestVideo = feed?.latestVideo || null;

  const releases = data.releases || [];
  const latest = releases[0];
  const mixed = mixResults({
    ...data,
    releases: [],
  });
  const popupHref = latest
    ? `/music/${latest.slug || slugify(latest.title)}`
    : "/music";
  const popupLines = latest
    ? ["You may already be a winner.", `Listen to ${latest.title}`]
    : ["You may already be a winner."];

  const renderMixed = (entry, key) => {
    const { kind, item } = entry;
    if (kind === "music") {
      return (
        <SearchResult
          key={key}
          href={item.url}
          title={item.title}
          cite={formatCite(item.url)}
          snippet={datedSnippet(item.date, item.description)}
        />
      );
    }
    if (kind === "blog") {
      const slugValue = item.slug?.current || item.slug;
      const preview = blogPreviewSnippet(item);
      return (
        <SearchResult
          key={key}
          internal
          href={`/blog/${slugValue}`}
          title={item.title}
          cite={pathCite("blog", slugValue)}
          snippet={datedSnippet(item.date, preview)}
        />
      );
    }
    if (kind === "lyrics") {
      const slugValue = item.slug?.current || item.slug;
      const albumLine = item.album
        ? albumSentence(item.album)
        : "Single.";
      return (
        <SearchResult
          key={key}
          internal
          href={`/lyrics/${slugValue}`}
          title={`${item.title} lyrics`}
          cite={pathCite("lyrics", slugValue)}
          snippet={datedSnippet(
            item.date,
            albumLine,
            snippetFromPortableText(item.preview, 120)
          )}
        />
      );
    }
    return (
      <SearchResult
        key={key}
        href={item.url}
        title={item.title}
        cite={formatCite(item.url)}
        snippet={socialSnippet(item)}
      />
    );
  };

  const mapsListing = (
    <SearchResult
      key="maps"
      internal
      href="/maps"
      title="Live shows — venues on the map"
      cite={pathCite("maps")}
      snippet="Places Della’s played. Zoom in and shout out the rooms that hosted."
    />
  );

  const mixedWithVideo = [...mixed];
  if (latestVideo) {
    const firstBlogAt = mixedWithVideo.findIndex((entry) => entry.kind === "blog");
    const videoEntry = { kind: "video", item: latestVideo };
    if (firstBlogAt === -1) mixedWithVideo.push(videoEntry);
    else mixedWithVideo.splice(firstBlogAt + 1, 0, videoEntry);
  }

  const mixedListings = mixedWithVideo.map((entry) =>
    entry.kind === "video" ? (
      <VideoResult key={entry.item.id} video={entry.item} />
    ) : (
      renderMixed(entry, entry.item._id)
    )
  );
  const bandcampAt = mixedWithVideo.findIndex((entry) => {
    const hay = `${entry.item?.url || ""} ${entry.item?.title || ""}`.toLowerCase();
    return hay.includes("bandcamp");
  });
  if (bandcampAt === -1) mixedListings.unshift(mapsListing);
  else mixedListings.splice(bandcampAt, 0, mapsListing);

  const listings = [
    <SearchResult
      key="official"
      internal
      href="/home"
      title="Drew Della"
      snippet="Official site. Music, lyrics, photos, videos, blog, and live shows."
    />,
    <ImagesOneBox key="images" images={data.images} />,
    <SearchResult
      key="shop"
      sponsored
      internal
      href="/shop"
      title="Drew Della store — merch coming soon"
      snippet="Nothing for sale yet. New merch is on the way — check back."
    />,
    ...(latest?.url
      ? [
          <SearchResult
            key="album-ad"
            sponsored
            href={latest.url}
            title={latest.title}
            snippet={
              datedSnippet(
                latest.date,
                latest.description || "Latest album from Drew Della. Listen now."
              )
            }
          />,
        ]
      : []),
    ...mixedListings,
  ];
  const resultCount = listings.length;

  return (
    <div className="all-page">
      <SearchResults count={resultCount} elapsed={elapsed}>
        {listings}
      </SearchResults>
      <VintagePopup
        title="CONGRATULATIONS!!!!"
        lines={popupLines}
        cta="OK"
        href={popupHref}
      />
    </div>
  );
}
