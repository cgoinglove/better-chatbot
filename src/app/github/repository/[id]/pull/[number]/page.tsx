import { selectRepositoryAction } from "@/app/api/github/actions";
import { PullRequestDetail } from "./client-page";
import { notFound } from "next/navigation";

export default async function PullRequestPage({
  params,
}: {
  params: { id: string; number: string };
}) {
  const repository = await selectRepositoryAction(params.id);
  
  if (!repository) {
    notFound();
  }
  
  return (
    <PullRequestDetail
      repository={repository}
      pullNumber={parseInt(params.number, 10)}
    />
  );
}
