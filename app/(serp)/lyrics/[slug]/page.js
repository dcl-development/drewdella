import { notFound } from "next/navigation";
import LyricsPage from "@/views/LyricsPage/LyricsPage.jsx";
import JsonLd from "@/components/JsonLd.jsx";
import { getLyric, getLyricsList } from "@/lib/content";
import { lyricsJsonLd, notFoundMetadata, pageMetadataAsync } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const songs = await getLyricsList().catch(() => []);
  return (songs || [])
    .map((song) => song.slug?.current || song.slug)
    .filter(Boolean)
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const song = await getLyric(slug).catch(() => null);
  if (!song) {
    return notFoundMetadata();
  }
  const description = song.album
    ? `${song.title} lyrics from ${song.album} by Drew Della.`
    : `${song.title} lyrics by Drew Della.`;
  return pageMetadataAsync({
    title: `${song.title} lyrics`,
    description,
    path: `/lyrics/${slug}`,
  });
}

export default async function Page({ params }) {
  const { slug } = await params;
  const song = await getLyric(slug).catch(() => null);
  if (!song) notFound();
  return (
    <>
      <JsonLd data={lyricsJsonLd(song, slug)} />
      <LyricsPage slug={slug} initialSong={song} />
    </>
  );
}
