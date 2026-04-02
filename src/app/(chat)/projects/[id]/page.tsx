import { projectRepository, chatRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { redirect, notFound } from "next/navigation";
import { ProjectDetail } from "@/components/project/project-detail";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user.id) redirect("/sign-in");

  const project = await projectRepository.selectProjectById(
    id,
    session.user.id,
  );
  if (!project) notFound();

  // Fetch all threads for the user and filter to this project
  const allThreads = await chatRepository.selectThreadsByUserId(
    session.user.id,
  );
  const projectThreads = allThreads.filter((t) => t.projectId === id);

  return (
    <ProjectDetail
      project={project}
      threads={projectThreads}
      filesPanel={null} // placeholder — files panel wired in Task 12
    />
  );
}
