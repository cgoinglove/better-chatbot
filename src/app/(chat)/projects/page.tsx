import { projectRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { redirect } from "next/navigation";
import { ProjectsGrid } from "@/components/project/projects-grid";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const projects = await projectRepository.selectProjectsByUserId(
    session.user.id,
  );

  return <ProjectsGrid initialProjects={projects} />;
}
