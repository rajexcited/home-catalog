import Link from "next/link";

import { signInWithEmail } from "@/app/actions";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const message = getParamValue(params.message);
  const error = getParamValue(params.error);

  return (
    <main className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top,#f5efe3_0%,#f3eee6_32%,#e6edf5_100%)] px-5 py-8 text-slate-950 sm:px-6">
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">Invite-only access</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Sign in with your email link.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">Use an invited email address. Supabase will send a magic link to complete sign-in.</p>

          {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <form action={signInWithEmail} className="mt-6 space-y-3">
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              required
            />
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Send magic link
            </button>
          </form>

          <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <p className="font-medium text-slate-800">Supabase setup checklist</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Set Site URL to your local or deployed app URL.</li>
              <li>Add /auth/confirm as an allowed redirect URL.</li>
              <li>Disable open sign-ups if you want invite-only access.</li>
              <li>Invite users from Authentication, then they can sign in here.</li>
            </ol>
          </div>

          <Link href="/" className="mt-6 inline-flex text-sm font-medium text-slate-600 transition-colors hover:text-slate-950">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
