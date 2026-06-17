"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!username || !password) {
      setStatus("error");
      setMessage("Enter username and password.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: username,
      password
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      {status === "error" ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p> : null}

      <input
        name="username"
        type="text"
        autoComplete="username"
        placeholder="username (email)"
        disabled={status === "loading"}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
        required
      />
      <input
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="password"
        disabled={status === "loading"}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
        required
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
      >
        {status === "loading" ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
