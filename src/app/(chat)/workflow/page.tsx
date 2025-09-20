import WorkflowListPage from "@/components/workflow/workflow-list-page";
import { getSession } from "auth/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return <WorkflowListPage userRole={session.user.role} />;
}
