import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const { repo, prNumber, token, event = "COMMENT", body } = await req.json();
    if (!repo || !prNumber || !token) {
      return Response.json(
        { error: "repo, prNumber, token required" },
        { status: 400 },
      );
    }
    const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}/reviews`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ event, body }),
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
