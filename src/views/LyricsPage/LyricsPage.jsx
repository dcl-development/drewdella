"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  SearchResults,
  SearchResult,
  snippetFromPortableText,
  pathCite,
  datedSnippet,
  albumSentence,
} from "../../components/SearchResults/SearchResults.jsx";
import SerpMessage from "../../components/SerpMessage/SerpMessage.jsx";
import { safeHref } from "../../lib/safeHref.js";
import "./LyricsPage.css";

function LyricsPage({ slug, initialSong = null, initialSongs = null }) {
  const songs = initialSongs || [];
  const song = initialSong;
  const elapsed = "0.12";
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("album");

  const renderLyrics = (lyrics) => {
    if (!lyrics) return null;

    return lyrics.map((block, index) => {
      if (block._type === 'block') {
        const style = block.style || 'normal';

        // Handle text with marks (bold, italic, links, etc.)
        const renderText = (children, markDefs = []) => {
          if (!children) return '';
          return children.map((child, childIndex) => {
            let text = child.text || '';

            // Handle marks (decorators and annotations)
            if (child.marks && child.marks.length > 0) {
              // Process marks in reverse order to properly nest elements
              child.marks.slice().reverse().forEach(mark => {
                if (mark === 'strong') {
                  text = <strong key={`${childIndex}-strong`}>{text}</strong>;
                } else if (mark === 'em') {
                  text = <em key={`${childIndex}-em`}>{text}</em>;
                } else if (mark === 'code') {
                  text = <code key={`${childIndex}-code`} className="lyrics-code">{text}</code>;
                } else {
                  // Handle annotations (like links) - mark is a key
                  const markDef = markDefs.find(def => def._key === mark);
                  if (markDef && markDef._type === 'link') {
                    const href = safeHref(markDef.href);
                    if (href) {
                      const external = !href.startsWith("/");
                      text = (
                        <a
                          key={`${childIndex}-link`}
                          href={href}
                          {...(external
                            ? {
                                target: "_blank",
                                rel: "noopener noreferrer",
                              }
                            : {})}
                          className="lyrics-link"
                        >
                          {text}
                        </a>
                      );
                    }
                  }
                }
              });
            }

            return <React.Fragment key={childIndex}>{text}</React.Fragment>;
          });
        };

        const textContent = block.children ? renderText(block.children, block.markDefs || []) : '';

        // Handle lists
        if (block.listItem) {
          const ListTag = block.listItem === 'bullet' ? 'ul' : 'ol';
          return (
            <ListTag key={index} className="lyrics-list">
              <li className="lyrics-list-item">{textContent}</li>
            </ListTag>
          );
        }

        switch (style) {
          case 'h1':
            return <h1 key={index} className="lyrics-h1">{textContent}</h1>;
          case 'h2':
            return <h2 key={index} className="lyrics-h2">{textContent}</h2>;
          case 'h3':
            return <h3 key={index} className="lyrics-h3">{textContent}</h3>;
          case 'blockquote':
            return <blockquote key={index} className="lyrics-blockquote">{textContent}</blockquote>;
          default:
            return <p key={index} className="lyrics-paragraph">{textContent}</p>;
        }
      }

      return null;
    });
  };

  if (!slug && initialSongs == null) {
    return (
      <SerpMessage
        title="Lyrics are taking a break."
        detail="Couldn’t load lyrics right now. Try again in a bit."
        links={[
          { to: "/music", label: "Music" },
          { to: "/", label: "All results" },
        ]}
      />
    );
  }

  if (slug && !song) {
    return (
      <SerpMessage
        title="That song isn’t here."
        detail="The link may be old, or the title changed. Try searching lyrics again."
        links={[
          { to: "/lyrics", label: "All lyrics" },
          { to: "/music", label: "Music" },
          { to: "/", label: "All results" },
        ]}
      />
    );
  }

  if (slug && song) {
    return (
      <div className="lyrics-page">
        <div className="lyrics-detail">
          <Link href="/lyrics" className="lyrics-back-link">← Back to search results</Link>
          <div className="lyrics-header">
            <h1 className="lyrics-title">{song.title}</h1>
            {song.album && (
              <p className="lyrics-album">{song.album}</p>
            )}
          </div>
          <div className="lyrics-content">
            {renderLyrics(song.lyrics)}
          </div>
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <SearchResults count={0} elapsed={elapsed}>
        <SerpMessage
          title="No lyrics to show yet."
          detail="Song words will show up here when they’re ready."
          links={[
            { to: "/music", label: "Music" },
            { to: "/", label: "All results" },
          ]}
        />
      </SearchResults>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = songs
    .filter((item) => item.slug && (item.slug.current || item.slug))
    .filter((item) => {
      if (!q) return true;
      return [item.title, item.album, item.preview].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(q)
      );
    })
    .slice()
    .sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "title-desc") return b.title.localeCompare(a.title);
      const albumA = a.album || "Singles";
      const albumB = b.album || "Singles";
      if (albumA !== albumB) return albumA.localeCompare(albumB);
      return (a.order ?? 0) - (b.order ?? 0);
    });

  return (
    <SearchResults
      count={filtered.length}
      elapsed={elapsed}
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder="Search lyrics"
      sort={sort}
      onSortChange={setSort}
      sortOptions={[
        { value: "album", label: "Album" },
        { value: "title", label: "Title A–Z" },
        { value: "title-desc", label: "Title Z–A" },
      ]}
    >
      {filtered.length === 0 ? (
        <p className="serp-empty">No lyrics match “{query}”.</p>
      ) : (
        filtered.map((item) => {
          const slugValue = item.slug?.current || item.slug;
          const albumLine = item.album
            ? albumSentence(item.album)
            : "Single.";
          const preview = snippetFromPortableText(item.preview, 140);
          return (
            <SearchResult
              key={item._id}
              internal
              href={`/lyrics/${slugValue}`}
              title={`${item.title} lyrics`}
              cite={pathCite("lyrics", slugValue)}
              snippet={datedSnippet(item.date, albumLine, preview)}
            />
          );
        })
      )}
    </SearchResults>
  );
}

export default LyricsPage;
