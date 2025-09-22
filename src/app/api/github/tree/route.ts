import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const { repo, ref, token } = await req.json();
    if (!repo || !ref || !token) {
      return Response.json(
        { error: "repo, ref, token required" },
        { status: 400 },
      );
    }
    const url = `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
    const gh = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    const json = await gh.json();
    if (!gh.ok) {
      return Response.json(
        { error: json?.message || gh.statusText },
        { status: gh.status },
      );
    }
    const items = (json.tree || []).map((n: any) => ({
      path: n.path,
      type: n.type,
      size: n.size,
    })) as any[];
    return Response.json({ items });
  } catch (e: any) {
    return Response.json(
      { error: e.message || "Unknown error" },
      { status: 500 },
    );
  }
};
