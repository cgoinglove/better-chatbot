import { selectRepositoryAction } from "@/app/api/github/actions";
import { GitHubRepositoryDetail } from "./client-page";
import { notFound } from "next/navigation";

export default async function GitHubRepositoryPage({
  params,
}: {
  params: { id: string };
}) {
  const repository = await selectRepositoryAction(params.id);
  
  if (!repository) {
    notFound();
  }
  
  return <GitHubRepositoryDetail repository={repository} />;
}
