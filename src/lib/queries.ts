import { defineQuery } from "groq";

export const songsListQuery = defineQuery(`*[_type == "song"] | order(order asc) {
  _id, title, album, order, "slug": slug.current
}`);

export const musicReleasesQuery = defineQuery(`*[_type == "musicRelease"] | order(order asc) {
  _id,
  title,
  description,
  url,
  date,
  order,
  year,
  subtitle,
  story,
  featured,
  "slug": slug.current,
  cover { alt, asset->{_id, metadata{dimensions}} },
  links[]{ label, url },
  tracks[]{ title, duration },
  gallery[]{ alt, caption, asset->{_id, metadata{dimensions}} }
}`);

export const luckyPathsQuery = defineQuery(`{
  "posts": *[_type == "blogPost" && defined(slug.current)].slug.current,
  "songs": *[_type == "song" && defined(slug.current)].slug.current,
  "images": *[_type == "imageGallery"][0].galleryImages[]._key,
  "releases": *[_type == "musicRelease"]{ title, "slug": slug.current }
}`);

export const blogListQuery = defineQuery(`*[_type == "blogPost"] | order(date desc) {
  _id, title, date, slug,
  "preview": pt::text(content),
  "imageCount": count(content[_type == "image"])
}`);

export const blogPostBySlugQuery = defineQuery(`*[_type == "blogPost" && slug.current == $slug][0] {
  _id, title, date, slug,
  "preview": pt::text(content),
  content[]{
    ...,
    _type == "image" => { ..., asset-> },
    _type == "block" => {
      ...,
      markDefs[]{ ..., _type == "link" => { ... } }
    }
  }
}`);

export const lyricsListQuery = defineQuery(`*[_type == "song"] | order(albumOrder asc, album asc, order asc) {
  _id, title, album, albumOrder, order, slug,
  "preview": pt::text(lyrics),
  "date": *[_type == "musicRelease" && lower(title) == lower(^.album)][0].date
}`);

export const lyricBySlugQuery = defineQuery(`*[_type == "song" && slug.current == $slug][0] {
  _id, title, album, slug,
  "preview": pt::text(lyrics),
  lyrics[]{
    ...,
    _type == "block" => {
      ...,
      markDefs[]{ ..., _type == "link" => { ... } }
    }
  }
}`);

export const shopLinkQuery = defineQuery(`*[_type == "shopLink"][0]{ url }`);

export const socialLinksQuery = defineQuery(`*[_type == "socialLink"] | order(order asc) {
  _id, title, url, description
}`);

export const contactEmailQuery = defineQuery(
  `*[_type == "contact" && defined(email)][0].email`
);

export const siteShareImageQuery = defineQuery(`{
  "custom": *[_type == "contact"][0].ogImage.asset->{ _id, metadata { dimensions }, alt },
  "cover": *[_type == "musicRelease" && featured == true][0].cover.asset->{ _id, metadata { dimensions }, alt },
  "coverAny": *[_type == "musicRelease"] | order(order asc)[0].cover.asset->{ _id, metadata { dimensions }, alt },
  "header": *[_type == "imageGallery"][0].galleryImages[0].asset->{ _id, metadata { dimensions }, alt }
}`);

export const blogPostShareImageQuery = defineQuery(`*[_type == "blogPost" && slug.current == $slug][0].content[_type == "image"][0].asset->{
  _id, metadata { dimensions }, alt
}`);

export const releaseShareImageQuery = defineQuery(`*[_type == "musicRelease" && slug.current == $slug][0].cover.asset->{
  _id, metadata { dimensions }, alt
}`);

export const mapLocationsQuery = defineQuery(`*[_type == "mapLocation"] {
  _id, venueName, address, coordinates
}`);

export const imageGalleryQuery = defineQuery(`*[_type == "imageGallery"][0] {
  title,
  galleryImages[] {
    asset->{
      _id,
      metadata { dimensions }
    },
    alt,
    caption,
    "id": _key
  }
}`);

export const allFeedQuery = defineQuery(`{
  "releases": *[_type == "musicRelease"] | order(order asc)[0...1] {
    _id, title, description, url, date, year, subtitle, "slug": slug.current
  },
  "posts": *[_type == "blogPost"] | order(date desc)[0...3] {
    _id, title, date, slug, "preview": pt::text(content), "imageCount": count(content[_type == "image"])
  },
  "songs": *[_type == "song"] | order(albumOrder asc, order asc)[0...3] {
    _id, title, album, slug, "preview": pt::text(lyrics),
    "date": *[_type == "musicRelease" && lower(title) == lower(^.album)][0].date
  },
  "socials": *[_type == "socialLink"] | order(order asc)[0...3] {
    _id, title, url, description
  },
  "images": *[_type == "imageGallery"][0].galleryImages[0...6] {
    asset->{_id, metadata{dimensions}},
    alt,
    "id": _key
  }
}`);

export const sitemapBlogSlugsQuery = defineQuery(
  `*[_type == "blogPost" && defined(slug.current)]{ "slug": slug.current, date }`
);

export const sitemapSongSlugsQuery = defineQuery(
  `*[_type == "song" && defined(slug.current)]{ "slug": slug.current }`
);

export const searchIndexQuery = defineQuery(`{
  "releases": *[_type == "musicRelease"] {
    _id, title, description, url, "slug": slug.current
  },
  "posts": *[_type == "blogPost"] {
    _id, title, slug, "body": pt::text(content)
  },
  "songs": *[_type == "song"] {
    _id, title, album, slug, "lyrics": pt::text(lyrics)
  },
  "socials": *[_type == "socialLink"] {
    _id, title, url, description
  },
  "venues": *[_type == "mapLocation"] {
    _id, venueName, address
  },
  "images": *[_type == "imageGallery"][0].galleryImages[] {
    alt, caption, "id": _key
  }
}`);

export const chatRateBucketQuery = defineQuery(`*[_id == $id][0]{ count }`);

export const chatMessagesQuery = defineQuery(`*[_type == "chatMessage"] | order(_createdAt desc)[0...100]{
  _id,
  name,
  body,
  _createdAt
}`);

export const youtubeCacheQuery = defineQuery(`*[_id == $id][0]{ videos, syncedAt }`);