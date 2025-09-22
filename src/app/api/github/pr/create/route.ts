import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const { repo, base, head, title, body, token } = await req.json();
    if (!repo || !base || !head || !title || !token) {
      return Response.json(
        { error: "repo, base, head, title, token required" },
        { status: 400 },
      );
    }
    const url = `https://api.github.com/repos/${repo}/pulls`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ title, head, base, body }),
    });
    const json = await res.json();
    if (!res.ok)
      return Response.json(
        { error: json?.message || res.statusText },
        { status: res.status },
      );
    return Response.json(json);
  } catch (e: any) {
    return Response.json({ error: e?.message || "unknown" }, { status: 500 });
  }
};
