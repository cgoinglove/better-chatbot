import { inprocQueue } from "lib/queue/inproc-queue";

export const GET = async () => {
  return Response.json({ tasks: inprocQueue.list() });
};

export const POST = async (req: Request) => {
  const body = await req.json();
  const id = inprocQueue.enqueue(String(body.type || "task"), body.payload);
  return Response.json({ id });
};
