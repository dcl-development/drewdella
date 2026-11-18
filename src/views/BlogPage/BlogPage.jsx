"use client";

import React, { useState } from "react";
import Link from "next/link";
import { urlFor } from "../../lib/imageUrl";
import {
  SearchResults,
  SearchResult,
  blogPreviewSnippet,
  pathCite,
  formatListingDate,
  datedSnippet,
} from "../../components/SearchResults/SearchResults.jsx";
import SerpMessage from "../../components/SerpMessage/SerpMessage.jsx";
import { safeHref } from "../../lib/safeHref.js";
import "./BlogPage.css";

/** CSS max widths — must stay in sync with BlogPage.css */
const BLOG_IMAGE_DISPLAY_PX = {
    small: 300,
    medium: 500,
    large: 700,
    full: 1000, // .blog-page max-width
};

/** `sizes` hints for responsive srcset (layout width, not pixel density) */
const BLOG_IMAGE_SIZES = {
    small: "(max-width: 300px) 100vw, 300px",
    medium: "(max-width: 500px) 100vw, 500px",
    large: "(max-width: 700px) 100vw, 700px",
    full: "(max-width: 1000px) 100vw, 1000px",
};

const MAX_SRC_WIDTH = 2400;

/**
 * Blog images were requested at 1× display width, so they looked soft on retina.
 * srcSet + sizes lets 1× screens load lighter URLs while 2× gets enough pixels.
 */
function blogImageResponsiveSources(asset, sizeKey) {
    const displayMax = BLOG_IMAGE_DISPLAY_PX[sizeKey] || BLOG_IMAGE_DISPLAY_PX.medium;
    const w1 = displayMax;
    const w2 = Math.min(displayMax * 2, MAX_SRC_WIDTH);
    const base = () => urlFor(asset).auto("format");
    const url1 = base().width(w1).url();
    const url2 = base().width(w2).url();
    const srcSet =
        w2 > w1 ? `${url1} ${w1}w, ${url2} ${w2}w` : `${url1} ${w1}w`;
    return {
        src: url2,
        srcSet,
        sizes: BLOG_IMAGE_SIZES[sizeKey] || BLOG_IMAGE_SIZES.medium,
    };
}

function BlogPage({ slug, initialPost = null, initialPosts = null }) {
    const blogPosts = initialPosts || [];
    const post = initialPost;
    const elapsed = "0.12";
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState("newest");

    const renderContent = (content) => {
        if (!content) return null;

        return content.map((block, index) => {
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
                                    text = <code key={`${childIndex}-code`} className="blog-code">{text}</code>;
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
                                                    className="blog-link"
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
                        <ListTag key={index} className="blog-list">
                            <li className="blog-list-item">{textContent}</li>
                        </ListTag>
                    );
                }

                switch (style) {
                    case 'h1':
                        return <h1 key={index} className="blog-h1">{textContent}</h1>;
                    case 'h2':
                        return <h2 key={index} className="blog-h2">{textContent}</h2>;
                    case 'h3':
                        return <h3 key={index} className="blog-h3">{textContent}</h3>;
                    case 'blockquote':
                        return <blockquote key={index} className="blog-blockquote">{textContent}</blockquote>;
                    default:
                        return <p key={index} className="blog-paragraph">{textContent}</p>;
                }
            }

            if (block._type === 'image' && block.asset) {
                const size = block.size || 'medium';
                const { src, srcSet, sizes } = blogImageResponsiveSources(
                    block.asset,
                    size
                );

                const imageClass = `blog-image blog-image-${size}`;

                return (
                    <div key={index} className={`blog-image-container blog-image-container-${size}`}>
                        <img
                            src={src}
                            srcSet={srcSet}
                            sizes={sizes}
                            alt={block.alt || block.caption || post?.title || "Blog image"}
                            className={imageClass}
                            loading="lazy"
                            onError={(e) => {
                                console.error('Image failed to load:', block.asset._id);
                                e.target.style.display = 'none';
                            }}
                        />
                        {block.caption && (
                            <p className="blog-image-caption">{block.caption}</p>
                        )}
                    </div>
                );
            }

            return null;
        });
    };

    if (!slug && initialPosts == null) {
        return (
            <SerpMessage
                title="Blog is taking a break."
                detail="Couldn’t load the blog right now. Try again in a bit."
                links={[
                    { to: "/", label: "All results" },
                    { to: "/home", label: "Home" },
                ]}
            />
        );
    }

    if (slug && !post) {
        return (
            <SerpMessage
                title="That post isn’t here."
                detail="The link may be old, or the title changed. Try the blog again."
                links={[
                    { to: "/blog", label: "All posts" },
                    { to: "/", label: "All results" },
                    { to: "/home", label: "Home" },
                ]}
            />
        );
    }

    if (slug && post) {
        return (
            <div className="blog-page">
                <Link href="/blog" className="blog-back-link">
                    ← Back to search results
                </Link>
                <article className="blog-post blog-post--detail">
                    <h1 className="blog-detail-title">{post.title}</h1>
                    <time className="blog-post-date" dateTime={post.date}>
                        {formatListingDate(post.date)}
                    </time>
                    <div className="blog-post-body expanded">
                        {renderContent(post.content)}
                    </div>
                </article>
            </div>
        );
    }

    const q = query.trim().toLowerCase();
    const filtered = blogPosts
        .filter((item) => {
            if (!q) return true;
            return [item.title, item.preview, blogPreviewSnippet(item)].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(q)
            );
        })
        .slice()
        .sort((a, b) => {
            if (sort === "oldest") {
                return new Date(a.date || 0) - new Date(b.date || 0);
            }
            if (sort === "title") {
                return (a.title || "").localeCompare(b.title || "");
            }
            return new Date(b.date || 0) - new Date(a.date || 0);
        });

    return (
        <SearchResults
            count={filtered.length}
            elapsed={elapsed}
            query={query}
            onQueryChange={setQuery}
            queryPlaceholder="Search blog"
            sort={sort}
            onSortChange={setSort}
            sortOptions={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
                { value: "title", label: "Title A–Z" },
            ]}
        >
            {blogPosts.length === 0 ? (
                <p className="serp-empty">No blog posts yet. Check back soon!</p>
            ) : filtered.length === 0 ? (
                <p className="serp-empty">No posts match “{query}”.</p>
            ) : (
                filtered.map((item) => {
                    const slugValue = item.slug?.current || item.slug;
                    const preview = blogPreviewSnippet(item);
                    return (
                        <SearchResult
                            key={item._id}
                            internal
                            href={`/blog/${slugValue}`}
                            title={item.title}
                            cite={pathCite("blog", slugValue)}
                            snippet={datedSnippet(item.date, preview)}
                        />
                    );
                })
            )}
        </SearchResults>
    );
}

export default BlogPage;
