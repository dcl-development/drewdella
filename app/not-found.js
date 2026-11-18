import NotFoundPage from "@/views/NotFoundPage/NotFoundPage.jsx";
import { notFoundMetadata } from "@/lib/seo";

export const metadata = notFoundMetadata();

export default function NotFound() {
  return <NotFoundPage />;
}
