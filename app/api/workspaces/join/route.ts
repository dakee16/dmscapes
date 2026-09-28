import { createHash } from "node:crypto";
import { workspaceAction, workspaceBody, workspaceIdentity, workspaceJson } from "@/lib/workspace-server";
export async function POST(request: Request) {
  const auth = await workspaceIdentity(request, true);
  if (auth.response) return auth.response;
  const body = await workspaceBody(request);
  if (!body || typeof body.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) return workspaceJson({ error: "That invitation is invalid. Ask the owner for a new link." }, 400);
  return workspaceAction(auth.db, auth.userId, null, "join", { token_hash: createHash("sha256").update(body.token).digest("hex") });
}
