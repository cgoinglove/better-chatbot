import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const { repo, workflow, ref, token, inputs } = await req.json();
    if (!repo || !workflow || !ref || !token) {
      return Response.json(
        { error: "repo, workflow, ref, token required" },
        { status: 400 },
      );
    }
    const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
    const ghRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ ref, inputs }),
    });
    if (!ghRes.ok) {
      const body = await ghRes.text();
      return Response.json(
        { error: body || ghRes.statusText },
        { status: ghRes.status },
      );
    }
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json(
      { error: e.message || "Unknown error" },
      { status: 500 },
    );
  }
};
