"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      setStatus("error");
      setMessage("Enter an email address.");
      return;
    }

    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/confirm`,
        shouldCreateUser: false
      }
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your email for the sign-in link.");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      {status === "sent" ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
      {status === "error" ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p> : null}

      <input
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        disabled={status === "sent" || status === "loading"}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
        required
      />
      <button
        type="submit"
        disabled={status === "sent" || status === "loading"}
        className="flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
      >
        {status === "loading" ? "Sending…" : status === "sent" ? "Link sent" : "Send magic link"}
      </button>
    </form>
  );
}
