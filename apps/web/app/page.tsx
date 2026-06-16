import Link from "next/link";

import { createContainer, createItem, signOut } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

type ContainerRecord = {
  id: string;
  name: string;
  location: string | null;
  container_type: string | null;
  status: string;
};

type ItemRecord = {
  id: string;
  name: string;
  quantity: number | null;
  unit_cost: number | null;
  status: string;
  containers: {
    name: string;
  } | null;
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top,#f5efe3_0%,#f3eee6_32%,#e6edf5_100%)] text-slate-950">
        <section className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-8 sm:px-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">Home Catalog PWA</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Sign in to start managing containers and items.</h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Supabase Auth is wired for email magic links, and the first database-backed inventory screens are ready once your project keys and schema are in
              place.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/sign-in"
                className="flex h-12 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                Open sign in
              </Link>
              <div className="rounded-[1.5rem] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                <p className="font-medium text-slate-800">Before this works against Supabase:</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Enable Email auth in Supabase.</li>
                  <li>Turn off open sign-ups and invite users from the Auth dashboard.</li>
                  <li>Run the initial SQL migration in the supabase folder.</li>
                  <li>Set your site URL env vars locally and in Vercel.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const [containersResult, itemsResult] = await Promise.all([
    supabase.from("containers").select("id, name, location, container_type, status").order("created_at", { ascending: false }).limit(8),
    supabase.from("items").select("id, name, quantity, unit_cost, status, containers(name)").order("created_at", { ascending: false }).limit(12)
  ]);

  const schemaMissing = containersResult.error?.code === "42P01" || itemsResult.error?.code === "42P01";
  const containers = (containersResult.data ?? []) as ContainerRecord[];
  const items = (itemsResult.data ?? []) as ItemRecord[];

  return (
    <main className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top,#f5efe3_0%,#f3eee6_32%,#e6edf5_100%)] text-slate-950">
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-8 sm:px-6">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">Inventory Dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Welcome back.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Signed in as {user.email}. Create containers, drop in items, and use this as the first live backend slice.
              </p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {schemaMissing ? (
          <div className="mt-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-[0_20px_50px_-40px_rgba(180,83,9,0.4)]">
            <p className="font-semibold">Supabase tables are not created yet.</p>
            <p className="mt-2">
              Run the migration in the supabase folder, then refresh this screen. The auth flow is ready, but the containers and items tables must exist before
              queries can succeed.
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4">
          <article className="rounded-[1.75rem] bg-slate-950 p-5 text-slate-50 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.8)]">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-300/80">Add container</p>
            <form action={createContainer} className="mt-4 space-y-3">
              <input
                name="name"
                placeholder="Kitchen pantry"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-slate-400"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="containerType"
                  placeholder="cabinet"
                  className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-slate-400"
                />
                <input
                  name="location"
                  placeholder="kitchen"
                  className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-100"
              >
                Save container
              </button>
            </form>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
            <p className="text-sm font-medium text-slate-500">Add item</p>
            <form action={createItem} className="mt-4 space-y-3">
              <input
                name="name"
                placeholder="Olive oil"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                required
              />
              <select
                name="containerId"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
                defaultValue=""
                required
                disabled={containers.length === 0}
              >
                <option value="" disabled>
                  {containers.length === 0 ? "Create a container first" : "Choose a container"}
                </option>
                {containers.map((container) => (
                  <option key={container.id} value={container.id}>
                    {container.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <input
                  name="unitCost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="12.99"
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300"
                disabled={containers.length === 0}
              >
                Save item
              </button>
            </form>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Recent containers</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{containers.length} loaded</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Backend</span>
            </div>
            <div className="mt-4 space-y-3">
              {containers.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No containers yet.</p>
              ) : (
                containers.map((container) => (
                  <div key={container.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{container.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{(container.container_type ?? "container").toUpperCase()}</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">{container.status}</span>
                    </div>
                    {container.location ? <p className="mt-3 text-sm text-slate-600">{container.location}</p> : null}
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Recent items</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{items.length} loaded</h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Live query</span>
            </div>
            <div className="mt-4 space-y-3">
              {items.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No items yet.</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.containers?.name ?? "Unassigned container"}</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">{item.status}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      Qty {item.quantity ?? 1}
                      {typeof item.unit_cost === "number" ? ` • $${item.unit_cost.toFixed(2)}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
