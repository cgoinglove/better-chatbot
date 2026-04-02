import { projectRepository, chatRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { notFound, redirect } from "next/navigation";
import { ProjectDetail } from "@/components/project/project-detail";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user.id) redirect("/sign-in");

  const [project, files] = await Promise.all([
    projectRepository.selectProjectById(id, session.user.id),
    projectRepository.selectProjectFiles(id),
  ]);

  if (!project) notFound();

  const allThreads = await chatRepository.selectThreadsByUserId(
    session.user.id,
  );
  const threads = allThreads.filter((t) => t.projectId === id);

  return <ProjectDetail project={project} files={files} threads={threads} />;
}
