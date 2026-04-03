import { NextResponse } from "next/server";

import {
  clearEditorSessionCookie,
  getEditorSession,
  isValidEditorCredentials,
  setEditorSessionCookie
} from "@/lib/editor-auth";

export async function GET() {
  const session = getEditorSession();
  return NextResponse.json(session);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };

  if (!isValidEditorCredentials(body.username?.trim() ?? "", body.password ?? "")) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ authenticated: true });
  const expiresAt = setEditorSessionCookie(response);
  response.headers.set("x-session-expires-at", expiresAt);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearEditorSessionCookie(response);
  return response;
}

