import { LibraryDetail } from "@/components/library/library-detail";

export default async function LibraryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Await the params to fix the "params should be awaited" error
  const { id } = params;
  return <LibraryDetail libraryId={id} />;
}
