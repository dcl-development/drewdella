import Link from "next/link";
import SanityImage from "../../components/SanityImage.jsx";
import { featuredRelease } from "../../lib/content";
import { safeHref } from "../../lib/safeHref.js";
import "./MusicPage.css";

function Cover({ release, large = false }) {
  if (release.cover) {
    return (
      <SanityImage
        className={large ? "kp-cover kp-cover--large" : "kp-cover"}
        src={release.cover}
        alt={release.coverAlt || release.title}
        width={large ? 640 : 72}
        height={large ? 640 : 72}
        sizes={large ? "(max-width: 860px) 100vw, 280px" : "72px"}
        style={large ? { width: "100%", height: "auto" } : undefined}
      />
    );
  }
  const letter = (release.title || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className={large ? "kp-cover kp-cover--fallback kp-cover--large" : "kp-cover kp-cover--fallback"}
      aria-hidden="true"
    >
      <span>{letter}</span>
    </div>
  );
}

function ListenLinks({ release }) {
  if (!release.links?.length) return null;
  return (
    <div className="kp-links">
      {release.links.map((link) => {
        const href = safeHref(link.url);
        if (!href) return null;
        const external = !href.startsWith("/");
        return (
          <a
            key={href}
            className={link === release.links[0] ? "kp-listen" : "kp-link"}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {link.label || "Listen"}
          </a>
        );
      })}
    </div>
  );
}

function TrackList({ release, compact = false }) {
  const tracks = release.tracks || [];
  if (!tracks.length) return null;
  const shown = compact ? tracks.slice(0, 6) : tracks;
  return (
    <ol className="kp-tracks">
      {shown.map((track, index) => {
        const inner = (
          <>
            <span className="kp-track-title">{track.title}</span>
            {track.duration ? <span className="kp-track-time">{track.duration}</span> : null}
          </>
        );
        return (
          <li key={`${track.title}-${index}`}>
            {track.slug ? <Link href={`/lyrics/${track.slug}`}>{inner}</Link> : inner}
          </li>
        );
      })}
      {compact && tracks.length > shown.length ? (
        <li className="kp-tracks-more">
          <Link href={release.href}>
            {tracks.length - shown.length} more tracks
          </Link>
        </li>
      ) : null}
    </ol>
  );
}

function PanelCover({ release }) {
  if (!release.cover) return <Cover release={release} />;
  // One Sanity rendition at about 2× the 340px panel, loaded directly from
  // the Sanity CDN. next/image would request a small srcset candidate.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="kp-cover"
      src={release.cover}
      alt={release.coverAlt || release.title || ""}
      width={800}
      height={800}
      loading="eager"
      fetchPriority="high"
      decoding="sync"
    />
  );
}

function KnowledgePanel({ release }) {
  const sub = release.subtitle || release.description;
  return (
    <aside className="kp" aria-label={`${release.title} knowledge panel`}>
      <PanelCover release={release} />
      <div className="kp-body">
        <p className="kp-kicker">
          Music
          {release.year ? ` · ${release.year}` : ""}
        </p>
        <h2 className="kp-title">
          <Link href={release.href}>{release.title}</Link>
        </h2>
        {sub ? <p className="kp-sub">{sub}</p> : null}
        <dl className="kp-facts">
          <div>
            <dt>Artist</dt>
            <dd>Drew Della</dd>
          </div>
          {release.year ? (
            <div>
              <dt>Released</dt>
              <dd>{release.year}</dd>
            </div>
          ) : null}
          {release.tracks.length ? (
            <div>
              <dt>Tracks</dt>
              <dd>{release.tracks.length}</dd>
            </div>
          ) : null}
        </dl>
        <ListenLinks release={release} />
        <TrackList release={release} compact />
        <Link className="kp-more" href={release.href}>
          Full page
        </Link>
      </div>
    </aside>
  );
}

function ReleaseRow({ release }) {
  const snippet = [release.year, release.subtitle || release.description]
    .filter(Boolean)
    .join(" — ");
  return (
    <article className="music-row">
      <Link href={release.href} className="music-row-cover" tabIndex={-1} aria-hidden="true">
        <Cover release={release} />
      </Link>
      <div>
        <h2 className="music-row-title">
          <Link href={release.href}>{release.title}</Link>
        </h2>
        <cite className="music-row-cite">Music › {release.slug}</cite>
        {snippet ? <p className="music-row-snippet">{snippet}</p> : null}
      </div>
    </article>
  );
}

export default function MusicPage({ releases = [], elapsed = "0.12" }) {
  if (!releases.length) {
    return (
      <div className="music-page music-page--empty">
        <p className="music-empty">No releases to show yet. New music is on the way.</p>
      </div>
    );
  }

  const feature = featuredRelease(releases);

  return (
    <div className="music-page">
      <div className="music-list">
        <p className="music-stats">
          About {releases.length} result{releases.length === 1 ? "" : "s"} ({elapsed} seconds)
        </p>
        {releases.map((release) => (
          <ReleaseRow key={release.id} release={release} />
        ))}
      </div>
      {feature ? <KnowledgePanel release={feature} /> : null}
    </div>
  );
}

export function MusicReleasePage({ release, others = [] }) {
  const sub = release.subtitle || "";
  const storyText =
    release.story ||
    (release.description && release.description !== release.subtitle
      ? release.description
      : "");

  return (
    <article className="release">
      <p className="release-cite">
        <Link href="/music">Music</Link>
        <span aria-hidden="true"> › </span>
        {release.slug}
      </p>
      <div className="release-hero">
        <Cover release={release} large />
        <div className="release-hero-copy">
          <p className="kp-kicker">
            Album · Drew Della
            {release.year ? ` · ${release.year}` : ""}
          </p>
          <h1 className="release-title">{release.title}</h1>
          {sub ? <p className="release-sub">{sub}</p> : null}
          {storyText ? <p className="release-story">{storyText}</p> : null}
          <ListenLinks release={release} />
        </div>
      </div>

      {release.tracks.length ? (
        <section className="release-section">
          <h2>Tracklist</h2>
          <TrackList release={release} />
        </section>
      ) : null}

      {release.gallery.length ? (
        <section className="release-section">
          <h2>Imagery</h2>
          <div className="release-gallery">
            {release.gallery.map((image) => (
              <figure key={image.src}>
                <SanityImage
                  src={image.src}
                  alt={image.alt || image.caption || release.title || ""}
                  width={image.width}
                  height={image.height}
                  sizes="(max-width: 860px) 100vw, 420px"
                />
                {image.caption ? <figcaption>{image.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {others.length ? (
        <section className="release-section">
          <h2>More from Drew Della</h2>
          <ul className="release-more">
            {others.map((item) => (
              <li key={item.id}>
                <Link href={item.href}>{item.title}</Link>
                {item.year ? <span>{item.year}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
