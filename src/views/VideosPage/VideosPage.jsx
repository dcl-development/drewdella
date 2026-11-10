"use client";

import React, { useState, useEffect } from "react";
import {
  SearchResults,
  VideoResult,
  formatElapsed,
} from "../../components/SearchResults/SearchResults.jsx";
import SerpMessage from "../../components/SerpMessage/SerpMessage.jsx";

function VideosPage({ initialVideos = null, initialElapsed = "0.12" }) {
  const [videos, setVideos] = useState(initialVideos || []);
  const [loading, setLoading] = useState(initialVideos == null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(initialElapsed);

  useEffect(() => {
    if (initialVideos) return undefined;
    const fetchVideos = async () => {
      const started = performance.now();
      try {
        setLoading(true);
        const response = await fetch("/api/videos");
        const body = await response.json().catch(() => ({}));

        const list = body?.videos;
        if (!response.ok || body?.error || !Array.isArray(list)) {
          throw new Error("Failed to load videos");
        }

        setVideos(list);
        setElapsed(formatElapsed(performance.now() - started));
      } catch (err) {
        console.error("Error fetching videos:", err);
        setError("Couldn’t load videos right now. Try again in a bit.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
    return undefined;
  }, [initialVideos]);

  if (loading) {
    return <p className="serp-stats">Loading videos…</p>;
  }

  if (error) {
    return (
      <SerpMessage
        title="Videos are taking a break."
        detail={error}
        links={[
          { to: "/", label: "All results" },
          { to: "/music", label: "Music" },
        ]}
      />
    );
  }

  if (!videos.length) {
    return (
      <SearchResults count={0} elapsed={elapsed}>
        <SerpMessage
          title="No videos to show yet."
          detail="New clips will land here when they’re up."
          links={[
            { to: "/music", label: "Music" },
            { to: "/images", label: "Images" },
          ]}
        />
      </SearchResults>
    );
  }

  return (
    <SearchResults count={videos.length} elapsed={elapsed}>
      {videos.map((video, index) => (
        <VideoResult
          key={video.id}
          video={video}
          priority={index === 0}
          snippetLines={1}
        />
      ))}
    </SearchResults>
  );
}

export default VideosPage;
