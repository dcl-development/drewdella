"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { urlFor } from "../../lib/imageUrl";
import { SerpFooter } from "../../components/SearchResults/SearchResults.jsx";
import SerpMessage from "../../components/SerpMessage/SerpMessage.jsx";
import "./ImagesPage.css";

const SOURCE_NAME = "drewdella.com";

function IconClose({ className = "images-btn-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path
        fill="currentColor"
        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
      />
    </svg>
  );
}

function IconOpenInNew({ className = "images-btn-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={16} height={16} aria-hidden>
      <path
        fill="currentColor"
        d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"
      />
    </svg>
  );
}

function IconShare({ className = "images-btn-icon images-btn-icon--md" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        fill="currentColor"
        d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.27 3.27 0 0 0 0-1.54l7.02-4.11A2.99 2.99 0 1 0 15 5a2.99 2.99 0 0 0 .04.49L8.02 9.6a3 3 0 1 0 0 4.8l7.02 4.11c.28.74 1.01 1.27 1.86 1.27A3 3 0 1 0 18 16.08z"
      />
    </svg>
  );
}

function IconChevronLeft({ className = "images-btn-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );
}

function IconChevronRight({ className = "images-btn-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path fill="currentColor" d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  );
}

function IconBookmark({ className = "images-btn-icon images-btn-icon--md" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        fill="currentColor"
        d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2zm0 15-5-2.18L7 18V5h10v13z"
      />
    </svg>
  );
}

function imageKey(image) {
  return image?.id || image?.asset?._id || "";
}

function findImageByParam(images, want) {
  if (!want || !images?.length) return null;
  return (
    images.find(
      (img) => imageKey(img) === want || img.asset?._id === want
    ) ?? null
  );
}

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function hiResImageUrl(asset) {
  if (!asset) return "";
  const w = asset?.metadata?.dimensions?.width;
  const h = asset?.metadata?.dimensions?.height;
  const cap = 2560;
  const b = urlFor(asset).auto("format");
  if (w && h) {
    const longest = Math.min(Math.max(w, h), cap);
    return w >= h ? b.width(longest).url() : b.height(longest).url();
  }
  return b.width(1920).url();
}

function imageLabel(image) {
  return image?.caption || image?.alt || "Photo";
}

const THUMB_SIZES =
  "(max-width: 599px) 33vw, (max-width: 899px) 25vw, (max-width: 1199px) 20vw, 16vw";

function thumbProps(asset) {
  if (!asset) return null;
  const dims = asset.metadata?.dimensions;
  const make = (width) =>
    urlFor(asset).width(width).auto("format").quality(60).fit("max").url();
  return {
    src: make(640),
    srcSet: `${make(320)} 320w, ${make(640)} 640w`,
    sizes: THUMB_SIZES,
    width: dims?.width || 4,
    height: dims?.height || 3,
  };
}

function thumbAspectRatio(asset) {
  const dims = asset?.metadata?.dimensions;
  if (!dims?.width || !dims?.height) return undefined;
  return `${dims.width} / ${dims.height}`;
}

function ThumbImage({ asset, alt, priority = false }) {
  const thumb = thumbProps(asset);
  if (!thumb) return null;
  const aspectRatio = thumbAspectRatio(asset);
  return (
    <img
      src={thumb.src}
      srcSet={thumb.srcSet}
      sizes={thumb.sizes}
      width={thumb.width}
      height={thumb.height}
      alt={alt || "Gallery image"}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      draggable={false}
      style={aspectRatio ? { aspectRatio } : undefined}
    />
  );
}

function ImagesPage({ images = [], elapsed = "0.12" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeImage, setActiveImage] = useState(null);
  const [suggested, setSuggested] = useState([]);
  const [heroSrc, setHeroSrc] = useState("");
  const [heroReady, setHeroReady] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const closeBtnRef = useRef(null);
  const panelRef = useRef(null);
  const heroLoadId = useRef(0);

  const imgFromUrl = useMemo(() => {
    const fromHook = searchParams.get("img");
    if (fromHook) return fromHook;
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("img") || "";
    }
    return "";
  }, [searchParams]);

  const syncImgParam = useCallback(
    (image) => {
      const key = imageKey(image);
      if (!key) {
        router.replace(pathname);
        return;
      }
      router.replace(`${pathname}?img=${encodeURIComponent(key)}`);
    },
    [pathname, router]
  );

  const openImage = useCallback(
    (image) => {
      if (activeImage && imageKey(activeImage) === imageKey(image)) {
        return;
      }
      setHeroReady(false);
      setActiveImage(image);
      setSuggested(shuffle(images.filter((img) => imageKey(img) !== imageKey(image))));
      syncImgParam(image);
    },
    [activeImage, images, syncImgParam]
  );

  const activeIndex = useMemo(() => {
    if (!activeImage) return -1;
    return images.findIndex((img) => imageKey(img) === imageKey(activeImage));
  }, [images, activeImage]);

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex >= 0 && activeIndex < images.length - 1;

  const goToRelative = useCallback(
    (delta) => {
      if (activeIndex < 0) return;
      const next = images[activeIndex + delta];
      if (next) openImage(next);
    },
    [activeIndex, images, openImage]
  );

  const closePanel = useCallback(() => {
    heroLoadId.current += 1;
    setActiveImage(null);
    setSuggested([]);
    setHeroSrc("");
    setHeroReady(false);
    setActionNote("");
    router.replace(pathname);
  }, [pathname, router]);

  const activeUrl = useMemo(
    () => (activeImage ? hiResImageUrl(activeImage.asset) : ""),
    [activeImage]
  );

  const thumbUrl = useMemo(
    () => (activeImage ? thumbProps(activeImage.asset)?.src || "" : ""),
    [activeImage]
  );

  const panelTitle = useMemo(
    () => (activeImage ? imageLabel(activeImage) : ""),
    [activeImage]
  );

  /* Show cached thumb first, then upgrade to hi-res; hold suggested until hero paints */
  useEffect(() => {
    if (!activeImage || !thumbUrl || !activeUrl) return undefined;

    const loadId = ++heroLoadId.current;
    setHeroReady(false);
    setHeroSrc(thumbUrl);
    panelRef.current?.scrollTo({ top: 0 });

    const hiRes = new Image();
    hiRes.decoding = "async";
    hiRes.onload = () => {
      if (loadId !== heroLoadId.current) return;
      setHeroSrc(activeUrl);
    };
    hiRes.onerror = () => {
      /* keep thumb if hi-res fails */
    };
    hiRes.src = activeUrl;

    return () => {
      hiRes.onload = null;
      hiRes.onerror = null;
    };
  }, [activeImage, thumbUrl, activeUrl]);

  const handleVisit = useCallback(() => {
    if (!activeUrl) return;
    window.open(activeUrl, "_blank", "noopener,noreferrer");
  }, [activeUrl]);

  const handleShare = useCallback(async () => {
    if (!activeImage || !activeUrl) return;
    const key = imageKey(activeImage);
    const shareUrl = key
      ? `${window.location.origin}${pathname}?img=${encodeURIComponent(key)}`
      : `${window.location.origin}${pathname}`;
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setActionNote("Link copied");
        window.setTimeout(() => setActionNote(""), 2000);
      }
    } catch {
      /* user cancelled share */
    }
  }, [activeImage, activeUrl, pathname]);

  const handleSave = useCallback(() => {
    if (!activeUrl) return;
    window.open(activeUrl, "_blank", "noopener,noreferrer");
    setActionNote("Opened full image — save from your browser");
    window.setTimeout(() => setActionNote(""), 2800);
  }, [activeUrl]);

  useEffect(() => {
    if (!activeImage) return undefined;
    closeBtnRef.current?.focus();
  }, [activeImage]);

  /* Open panel when arriving from All, Share, or a direct ?img= load. */
  useLayoutEffect(() => {
    if (!images.length) return;
    if (!imgFromUrl) return;
    const match = findImageByParam(images, imgFromUrl);
    if (!match) return;
    if (imageKey(activeImage) === imageKey(match)) return;
    setHeroReady(false);
    setActiveImage(match);
    setSuggested(
      shuffle(images.filter((img) => imageKey(img) !== imageKey(match)))
    );
  }, [images, imgFromUrl, activeImage]);

  useEffect(() => {
    if (!activeImage) return undefined;

    const onKeyDown = (e) => {
      if (e.target?.closest?.("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      if (e.key === "Escape") closePanel();
      if (e.key === "ArrowLeft") goToRelative(-1);
      if (e.key === "ArrowRight") goToRelative(1);
    };

    window.addEventListener("keydown", onKeyDown);

    const mq = window.matchMedia("(max-width: 899px)");
    let prevOverflow = document.body.style.overflow;

    const syncBodyLock = () => {
      if (mq.matches) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = prevOverflow;
      }
    };

    syncBodyLock();
    mq.addEventListener("change", syncBodyLock);

    const onPanelWheel = (e) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (panel.scrollHeight <= panel.clientHeight) {
        e.preventDefault();
        return;
      }
      const { scrollTop, scrollHeight, clientHeight } = panel;
      const delta = e.deltaY;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
        e.preventDefault();
      }
    };

    const panel = panelRef.current;
    panel?.addEventListener("wheel", onPanelWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      mq.removeEventListener("change", syncBodyLock);
      document.body.style.overflow = prevOverflow;
      panel?.removeEventListener("wheel", onPanelWheel);
    };
  }, [activeImage, closePanel, goToRelative]);

  /* Desktop rail top: header + tabs height (varies with --ui-zoom), not a fixed px guess. */
  useEffect(() => {
    if (!activeImage) {
      document.documentElement.style.removeProperty("--images-panel-top");
      return undefined;
    }

    const syncTop = () => {
      const nav = document.querySelector(".nav-tabs");
      if (!nav) return;
      const top = Math.ceil(nav.getBoundingClientRect().bottom);
      document.documentElement.style.setProperty("--images-panel-top", `${top}px`);
    };

    syncTop();
    window.addEventListener("resize", syncTop);
    return () => {
      window.removeEventListener("resize", syncTop);
      document.documentElement.style.removeProperty("--images-panel-top");
    };
  }, [activeImage]);

  /* Hero max = panel height minus bar + meta so title/actions stay in view (zoom-safe). */
  useEffect(() => {
    if (!activeImage) {
      document.documentElement.style.removeProperty("--images-panel-hero-max");
      return undefined;
    }

    const syncHeroMax = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const bar = panel.querySelector(".images-panel-bar");
      const meta = panel.querySelector(".images-panel-meta");
      if (!bar || !meta) return;
      const max =
        panel.clientHeight - bar.offsetHeight - meta.offsetHeight;
      document.documentElement.style.setProperty(
        "--images-panel-hero-max",
        `${Math.max(96, max)}px`
      );
    };

    syncHeroMax();
    const raf = window.requestAnimationFrame(syncHeroMax);
    window.addEventListener("resize", syncHeroMax);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncHeroMax);
      document.documentElement.style.removeProperty("--images-panel-hero-max");
    };
  }, [activeImage, panelTitle, actionNote]);

  if (!images.length) {
    return (
      <div className="images-empty">
        <SerpMessage
          title="No images to show yet."
          detail="Photos will show up here when they’re ready."
          links={[
            { to: "/", label: "All results" },
            { to: "/videos", label: "Videos" },
          ]}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={`images-page${activeImage ? " images-page--panel-open" : ""}`}
      >
        <p className="images-stats">
          About {images.length.toLocaleString("en-US")} result
          {images.length === 1 ? "" : "s"} ({elapsed} seconds)
        </p>
        <div className="images-masonry-grid">
          {images.map((image, index) => (
            <div
              key={imageKey(image)}
              className="images-result"
              style={
                image.asset
                  ? { aspectRatio: thumbAspectRatio(image.asset) || "4 / 3" }
                  : undefined
              }
            >
              {image.asset && (
                <button
                  type="button"
                  className={`images-thumb${
                    imageKey(activeImage) === imageKey(image)
                      ? " images-thumb--active"
                      : ""
                  }`}
                  onClick={() => openImage(image)}
                  aria-label={
                    image.alt
                      ? `Open image: ${image.alt}`
                      : "Open image detail"
                  }
                >
                  <ThumbImage
                    asset={image.asset}
                    alt={image.alt}
                    priority={index === 0}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="images-serp-footer">
          <SerpFooter />
        </div>
      </div>

      {activeImage &&
        createPortal(
          <aside
            ref={panelRef}
            className="images-panel"
            role="dialog"
            aria-modal="true"
            aria-label={panelTitle}
          >
            <div className="images-panel-bar">
              <div className="images-panel-nav">
                <button
                  type="button"
                  className="images-panel-nav-btn"
                  onClick={() => goToRelative(-1)}
                  disabled={!canGoPrev}
                  aria-label="Previous image"
                >
                  <IconChevronLeft />
                </button>
                <button
                  type="button"
                  className="images-panel-nav-btn"
                  onClick={() => goToRelative(1)}
                  disabled={!canGoNext}
                  aria-label="Next image"
                >
                  <IconChevronRight />
                </button>
              </div>
              <button
                type="button"
                className="images-panel-close"
                ref={closeBtnRef}
                onClick={closePanel}
                aria-label="Close"
              >
                <IconClose />
              </button>
            </div>

            <div className="images-panel-hero">
              <img
                key={imageKey(activeImage)}
                src={heroSrc || thumbUrl}
                alt={activeImage.alt || "Gallery image"}
                draggable={false}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onLoad={() => setHeroReady(true)}
                onError={() => setHeroReady(true)}
              />
            </div>

            <div className="images-panel-meta">
              <div className="images-panel-meta-row">
                <div className="images-panel-copy">
                  <h2 className="images-panel-title">{panelTitle}</h2>
                  <p className="images-panel-subtitle">
                    {activeImage.alt && activeImage.caption
                      ? activeImage.alt
                      : SOURCE_NAME}
                  </p>
                </div>
                <button
                  type="button"
                  className="images-btn images-btn--visit images-btn--visit-inline"
                  onClick={handleVisit}
                >
                  Visit
                  <IconOpenInNew />
                </button>
              </div>

              <div className="images-panel-actions">
                <button
                  type="button"
                  className="images-btn images-btn--visit images-btn--visit-row"
                  onClick={handleVisit}
                >
                  Visit
                  <IconOpenInNew />
                </button>
                <button
                  type="button"
                  className="images-btn images-btn--secondary"
                  onClick={handleShare}
                >
                  <IconShare />
                  Share
                </button>
                <button
                  type="button"
                  className="images-btn images-btn--secondary"
                  onClick={handleSave}
                >
                  <IconBookmark />
                  Save
                </button>
              </div>
              {actionNote ? (
                <p className="images-panel-note" role="status">
                  {actionNote}
                </p>
              ) : null}
            </div>

            {suggested.length > 0 && heroReady && (
              <div className="images-panel-suggested">
                <div className="images-suggested-grid">
                  {suggested.map((image) => (
                    <div
                      key={imageKey(image)}
                      className="images-suggested-card"
                      style={
                        image.asset
                          ? {
                              aspectRatio:
                                thumbAspectRatio(image.asset) || "4 / 3",
                            }
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className="images-suggested-thumb"
                        onClick={() => openImage(image)}
                        aria-label={
                          image.alt
                            ? `Open image: ${image.alt}`
                            : "Open image detail"
                        }
                      >
                        <ThumbImage asset={image.asset} alt={image.alt} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>,
          document.body
        )}
    </>
  );
}

export default ImagesPage;
