import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const EDITOR_SESSION_COOKIE = "cellar_editor_session";
const EDITOR_SESSION_MAX_AGE_SECONDS = 60 * 60;
const EDITOR_USERNAME = process.env.EDITOR_USERNAME?.trim() || "Talmika";
const EDITOR_PASSWORD = process.env.EDITOR_PASSWORD ?? "Tal2802)";
const EDITOR_SESSION_SECRET =
  process.env.EDITOR_SESSION_SECRET?.trim() || "cellar-atlas-editor-auth-v1";

function signSessionPayload(expiresAt: number) {
  return createHmac("sha256", EDITOR_SESSION_SECRET)
    .update(`${EDITOR_USERNAME}:${expiresAt}`)
    .digest("hex");
}

function buildSessionToken(expiresAt: number) {
  return `${expiresAt}.${signSessionPayload(expiresAt)}`;
}

function parseSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (!expiresAtRaw || !signature || !Number.isFinite(expiresAt)) {
    return null;
  }

  const expectedSignature = signSessionPayload(expiresAt);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  return { expiresAt };
}

export function getEditorSession() {
  const token = cookies().get(EDITOR_SESSION_COOKIE)?.value;
  const parsed = parseSessionToken(token);

  if (!parsed) {
    return { authenticated: false as const, expiresAt: null };
  }

  if (parsed.expiresAt <= Date.now()) {
    return { authenticated: false as const, expiresAt: null };
  }

  return { authenticated: true as const, expiresAt: new Date(parsed.expiresAt).toISOString() };
}

export function isValidEditorCredentials(username: string, password: string) {
  return username === EDITOR_USERNAME && password === EDITOR_PASSWORD;
}

export function setEditorSessionCookie(response: NextResponse) {
  const expiresAt = Date.now() + EDITOR_SESSION_MAX_AGE_SECONDS * 1000;
  response.cookies.set({
    name: EDITOR_SESSION_COOKIE,
    value: buildSessionToken(expiresAt),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: EDITOR_SESSION_MAX_AGE_SECONDS
  });

  return new Date(expiresAt).toISOString();
}

export function clearEditorSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: EDITOR_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function requireEditorSession() {
  const session = getEditorSession();

  if (session.authenticated) {
    return null;
  }

  return NextResponse.json(
    { error: "Authentication required", code: "AUTH_REQUIRED" },
    { status: 401 }
  );
}
