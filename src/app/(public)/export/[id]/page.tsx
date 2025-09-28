import { chatExportRepository } from "lib/db/repository";

export default async function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isExpired = await chatExportRepository.isExpired(id);
  if (isExpired) {
    return null;
  }
  const thread = await chatExportRepository.selectByIdWithUser(id);
  if (!thread) {
    return null;
  }
}
