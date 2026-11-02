"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  applyGoogleBasemap,
  OPENFREEMAP_STYLE,
  ROBOTO_GLYPHS,
} from "./googleBasemap";
import "./Map.css";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function useNarrow(maxWidth = 768) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const apply = () => setNarrow(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [maxWidth]);
  return narrow;
}

const pinSVG = `<svg width="27" height="41" viewBox="0 0 27 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M13.5 1.15C7.35 1.15 2.35 6.15 2.35 12.3 2.35 20.85 13.5 38.6 13.5 38.6S24.65 20.85 24.65 12.3C24.65 6.15 19.65 1.15 13.5 1.15z" fill="#EA4335" stroke="#C5221F" stroke-width="0.75"/>
  <circle cx="13.5" cy="12.15" r="4.35" fill="#fff"/>
</svg>`;

function resolvePlaces(raw) {
  const places = [];
  for (const location of raw || []) {
    const lat = location.coordinates?.lat;
    const lng = location.coordinates?.lng;
    if (lat == null || lng == null) {
      console.warn(
        `[Map] Skipping "${location.venueName || location._id}" — no coordinates in Sanity`
      );
      continue;
    }
    places.push({
      id: location._id,
      venueName: location.venueName || "Venue",
      address: location.address || "",
      lngLat: [lng, lat],
    });
  }
  return places;
}

function placeCard(place) {
  const root = document.createElement("div");
  root.className = "gmaps-pop";
  const title = document.createElement("strong");
  title.textContent = place.venueName;
  const address = document.createElement("p");
  address.textContent = place.address || "Live show venue";
  root.append(title, address);
  return root;
}

export default function Map({ locations = [], loadError = "" }) {
  const mapNode = useRef(null);
  const mapRef = useRef(null);
  const maplibreRef = useRef(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);
  const searchWrapRef = useRef(null);
  const inputRef = useRef(null);

  const [error, setError] = useState(loadError);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState("");
  const [webgl, setWebgl] = useState(true);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const narrow = useNarrow();

  const places = useMemo(() => {
    if (loadError) return [];
    return resolvePlaces(locations);
  }, [locations, loadError]);

  const loading = !loadError && locations.length > 0 && !places.length;

  useEffect(() => {
    setWebgl(hasWebGL());
  }, []);

  useEffect(() => {
    setError(loadError);
  }, [loadError]);

  const canDraw = webgl && !mapFailed;

  useEffect(() => {
    if (!canDraw || !places.length || !mapNode.current || mapRef.current) {
      return undefined;
    }

    let map;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !mapNode.current) return;

      maplibreRef.current = maplibregl;
      map = new maplibregl.Map({
        container: mapNode.current,
        style: OPENFREEMAP_STYLE,
        center: places[0].lngLat,
        zoom: 11,
        attributionControl: false,
        pitch: 0,
        bearing: 0,
        transformStyle: (_previous, next) => {
          next.glyphs = ROBOTO_GLYPHS;
          return next;
        },
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      mapRef.current = map;

      map.on("error", (event) => {
        console.error("Map error:", event?.error || event);
        if (!mapFailed) setMapFailed("The map couldn’t load tiles.");
      });

      map.on("load", () => {
        if (cancelled) return;
        applyGoogleBasemap(map);
        map.resize();
        const attrib = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
        if (attrib?.classList.contains("maplibregl-compact")) {
          attrib.classList.remove("maplibregl-compact-show");
          attrib.removeAttribute("open");
        }
        markersRef.current = places.map((place) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "gpin";
          el.innerHTML = pinSVG;
          el.setAttribute("aria-label", place.venueName);
          el.addEventListener("click", (event) => {
            event.stopPropagation();
            setActiveId(place.id);
          });
          return {
            id: place.id,
            marker: new maplibregl.Marker({ element: el, anchor: "bottom" })
              .setLngLat(place.lngLat)
              .addTo(map),
          };
        });
        const bounds = new maplibregl.LngLatBounds(
          places[0].lngLat,
          places[0].lngLat
        );
        places.forEach((place) => bounds.extend(place.lngLat));
        map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 0 });
        setMapReady(true);
      });
    })().catch((err) => {
      console.error("Map init error:", err);
      setMapFailed("The map couldn’t start in this browser.");
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((item) => item.marker.remove());
      markersRef.current = [];
      popupRef.current?.remove();
      popupRef.current = null;
      map?.remove();
      mapRef.current = null;
      maplibreRef.current = null;
      setMapReady(false);
    };
  }, [canDraw, places]);

  useEffect(() => {
    markersRef.current.forEach((item) => {
      const el = item.marker.getElement();
      const on = item.id === activeId;
      el?.classList.toggle("is-active", on);
      if (el) el.style.zIndex = on ? "2" : "";
    });

    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    const existing = popupRef.current;
    if (!activeId || !map || !maplibregl || !mapReady) {
      if (existing) {
        popupRef.current = null;
        existing.remove();
      }
      return undefined;
    }

    const place = places.find((item) => item.id === activeId);
    if (!place) return undefined;

    if (existing) {
      popupRef.current = null;
      existing.remove();
    }

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: "280px",
      offset: 42,
      className: "gmaps-popup",
      anchor: "bottom",
      focusAfterOpen: false,
    })
      .setLngLat(place.lngLat)
      .setDOMContent(placeCard(place))
      .addTo(map);

    popupRef.current = popup;
    popup.on("close", () => {
      if (popupRef.current !== popup) return;
      popupRef.current = null;
      setActiveId((id) => (id === place.id ? null : id));
    });

    map.flyTo({
      center: place.lngLat,
      zoom: Math.max(map.getZoom(), 15),
      padding: { top: 168, bottom: 56, left: 48, right: 72 },
      duration: prefersReducedMotion() ? 0 : 1300,
      essential: true,
    });

    document.getElementById(`venue-row-${place.id}`)?.scrollIntoView({ block: "nearest" });
    return undefined;
  }, [activeId, mapReady, places]);

  const queryText = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!queryText) return places;
    return places.filter((place) =>
      `${place.venueName} ${place.address}`.toLowerCase().includes(queryText)
    );
  }, [places, queryText]);

  const suggestList = narrow && !queryText ? places : filtered;
  const showSuggest = searchOpen && (narrow || queryText.length > 0);
  const activeOptionId =
    highlight >= 0 && suggestList[highlight]
      ? `venue-opt-${suggestList[highlight].id}`
      : undefined;

  useEffect(() => {
    if (!showSuggest || highlight < 0) return;
    document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [showSuggest, highlight, activeOptionId]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const onPointer = (event) => {
      if (searchWrapRef.current?.contains(event.target)) return;
      setSearchOpen(false);
      setHighlight(-1);
      if (mapNode.current?.contains(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("pointerdown", onPointer, true);
    return () => document.removeEventListener("pointerdown", onPointer, true);
  }, [searchOpen]);

  const chooseSuggestion = (place) => {
    setActiveId(place.id);
    setQuery(place.venueName);
    setSearchOpen(false);
    setHighlight(-1);
    inputRef.current?.blur();
  };

  const onSearchKeyDown = (event) => {
    const items = suggestList;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchOpen(true);
      if (!items.length) return;
      setHighlight((index) => (index + 1) % items.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchOpen(true);
      if (!items.length) return;
      setHighlight((index) => (index <= 0 ? items.length - 1 : index - 1));
      return;
    }
    if (event.key === "Enter") {
      const pick = highlight >= 0 ? items[highlight] : items[0];
      if (pick && (showSuggest || queryText)) {
        event.preventDefault();
        chooseSuggestion(pick);
      }
      return;
    }
    if (event.key === "Escape") {
      if (!searchOpen && !query) return;
      event.preventDefault();
      if (searchOpen) {
        setSearchOpen(false);
        setHighlight(-1);
        return;
      }
      setQuery("");
    }
  };

  const zoom = (delta) => {
    const map = mapRef.current;
    if (!map) return;
    map.zoomTo(map.getZoom() + delta, {
      duration: prefersReducedMotion() ? 0 : 200,
    });
  };

  const resetNorth = () => {
    mapRef.current?.easeTo({
      bearing: 0,
      pitch: 0,
      duration: prefersReducedMotion() ? 0 : 300,
    });
  };

  const fallback = !webgl
    ? "This browser can’t draw the map. The venues are listed here."
    : mapFailed || (!places.length && !loading)
      ? places.length
        ? mapFailed
        : "No venues pinned yet. The list will fill in when coordinates are set in Studio."
      : mapFailed;

  const suggestStatus = loading
    ? "Loading venues…"
    : error
      ? error
      : !suggestList.length
        ? places.length
          ? "No venues match that search."
          : "No venues pinned yet."
        : "";

  return (
    <div className="gmaps">
      <aside className="gmaps-panel">
        <div
          className={`gmaps-search-wrap${showSuggest ? " is-open" : ""}`}
          ref={searchWrapRef}
        >
          <form
            className="gmaps-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const pick = highlight >= 0 ? suggestList[highlight] : suggestList[0];
              if (pick) chooseSuggestion(pick);
            }}
          >
            <label className="sr-only" htmlFor="venue-search">
              Search venues
            </label>
            <input
              ref={inputRef}
              id="venue-search"
              type="search"
              role="combobox"
              aria-expanded={showSuggest}
              aria-controls="venue-suggestions"
              aria-autocomplete="list"
              aria-activedescendant={showSuggest ? activeOptionId : undefined}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlight(-1);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search venues"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
            />
            {query ? (
              <button
                type="button"
                className="gmaps-search-clear"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setHighlight(-1);
                  setSearchOpen(true);
                  inputRef.current?.focus();
                }}
              >
                ×
              </button>
            ) : null}
          </form>
          {showSuggest ? (
            <div className="gmaps-suggest">
              <p className="gmaps-suggest-note">Shoutout to the venues that have hosted me</p>
              {suggestStatus ? (
                <p className="gmaps-suggest-empty" role="status">
                  {suggestStatus}
                </p>
              ) : null}
              <ul id="venue-suggestions" role="listbox" aria-label="Venues">
                {suggestList.map((place, index) => (
                  <li key={place.id} role="presentation">
                    <button
                      type="button"
                      id={`venue-opt-${place.id}`}
                      role="option"
                      aria-selected={index === highlight}
                      className={index === highlight ? "is-active" : ""}
                      onMouseEnter={() => setHighlight(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        chooseSuggestion(place);
                      }}
                    >
                      <span className="gmaps-pin-dot" aria-hidden="true" />
                      <span>
                        <strong>{place.venueName}</strong>
                        <em>{place.address || "Live show venue"}</em>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {loading ? <p className="gmaps-alert">Loading venues…</p> : null}
        {error ? <p className="gmaps-alert">{error}</p> : null}

        <div className="gmaps-browse">
          <p className="gmaps-note">Shoutout to the venues that have hosted me</p>
          {loading ? <p className="gmaps-status">Loading venues…</p> : null}
          {error ? <p className="gmaps-status">{error}</p> : null}
          {!loading && !error && !places.length ? (
            <p className="gmaps-status">No venues pinned yet.</p>
          ) : null}
          <ul className="gmaps-results">
            {places.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  id={`venue-row-${place.id}`}
                  className={place.id === activeId ? "is-active" : ""}
                  onClick={() => {
                    setActiveId(place.id);
                    setSearchOpen(false);
                    setHighlight(-1);
                  }}
                >
                  <span className="gmaps-pin-dot" aria-hidden="true" />
                  <span>
                    <strong>{place.venueName}</strong>
                    <em>{place.address || "Live show venue"}</em>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="gmaps-stage">
        {canDraw && places.length ? (
          <>
            <div ref={mapNode} className="gmaps-canvas" />
            {!mapReady ? <div className="gmaps-veil">Loading map…</div> : null}
            <div className="gmaps-controls">
              <div className="gmaps-zoom">
                <button type="button" onClick={() => zoom(1)} aria-label="Zoom in">
                  +
                </button>
                <button type="button" onClick={() => zoom(-1)} aria-label="Zoom out">
                  −
                </button>
              </div>
              <button type="button" className="gmaps-compass" onClick={resetNorth} aria-label="Reset north">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 4.6 14.35 12 12 10.45 9.65 12Z" fill="#EA4335" />
                  <path d="M12 19.4 9.65 12 12 13.55 14.35 12Z" fill="#9aa0a6" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="gmaps-fallback" role="status">
            {fallback}
          </div>
        )}
      </div>
    </div>
  );
}
