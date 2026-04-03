"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SessionPayload = {
  authenticated: boolean;
  expiresAt: string | null;
};

const DEFAULT_SESSION: SessionPayload = {
  authenticated: false,
  expiresAt: null
};

function formatExpiresAt(value: string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function EditorAuthGate() {
  const [session, setSession] = useState<SessionPayload>(DEFAULT_SESSION);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocked = !loading && !session.authenticated;

  const loadSession = async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const payload = (await response.json()) as SessionPayload;
      setSession(payload);
    } catch {
      setSession(DEFAULT_SESSION);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSession();

    const intervalId = window.setInterval(() => {
      void loadSession();
    }, 60_000);

    const handleAuthRequired = () => {
      void loadSession();
    };

    window.addEventListener("editor-auth-required", handleAuthRequired);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("editor-auth-required", handleAuthRequired);
    };
  }, []);

  const expiresLabel = useMemo(() => formatExpiresAt(session.expiresAt), [session.expiresAt]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Login failed.");
        return;
      }

      setPassword("");
      await loadSession();
    } catch {
      setError("Unable to reach the login service.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-6 shadow-panel">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Editing locked</h2>
            <p className="text-sm text-muted-foreground">Sign in to edit inventory, locations, and score data.</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !submitting) {
                void submit();
              }
            }}
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button onClick={() => void submit()} disabled={submitting || !username.trim() || !password} className="w-full">
            {submitting ? "Signing in..." : "Unlock editing"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Sessions expire after 1 hour. {expiresLabel ? `Current session valid until about ${expiresLabel}.` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
