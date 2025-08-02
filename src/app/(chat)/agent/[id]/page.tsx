import EditAgent from "@/components/edit-agent";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <EditAgent key={id} id={id == "new" ? undefined : id} />;
}
