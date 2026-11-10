import { Suspense } from "react";
import ImagesPage from "@/views/ImagesPage/ImagesPage.jsx";
import SerpMessage from "@/components/SerpMessage/SerpMessage.jsx";
import { getGallery } from "@/lib/content";
import { pageMetadataAsync, shareImageUrl } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata() {
  const { images } = await getGallery().catch(() => ({ images: [] }));
  const lead = images?.[0];
  const asset = lead?.asset;
  return pageMetadataAsync({
    title: "Images",
    description: "Photos of Drew Della.",
    path: "/images",
    imageUrl: asset ? shareImageUrl(asset) : undefined,
    imageAlt: lead?.alt || asset?.alt || "Photos of Drew Della",
  });
}

export default async function Page() {
  try {
    const { images, elapsed } = await getGallery();
    return (
      <Suspense fallback={null}>
        <ImagesPage images={images || []} elapsed={elapsed} />
      </Suspense>
    );
  } catch (error) {
    console.error("Images page error:", error);
    return (
      <SerpMessage
        title="Images are taking a break."
        detail="Couldn’t load photos right now. Try again in a bit."
        links={[
          { to: "/", label: "All results" },
          { to: "/home", label: "Home" },
        ]}
      />
    );
  }
}
