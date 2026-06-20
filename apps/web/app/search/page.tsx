import Link from "next/link";
import { redirect } from "next/navigation";

import { MobileShell } from "@/components/mobile-shell";
import { SearchIcon, FilterIcon, FolderIcon, BoxIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/search/search.module.css";

type Props = { searchParams: Promise<{ q?: string; tab?: string; within?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", tab = "items", within } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const query = q.trim();
  const isItems = tab !== "containers";

  const [itemsRes, containersRes, withinRes] = await Promise.all([
    isItems
      ? supabase.from("items").select("id, name, category, unit_cost, containers(id,name)").eq("owner_user_id", user.id).ilike("name", `%${query}%`).order("name").limit(30)
      : { data: [] as never[] },
    !isItems
      ? supabase.from("containers").select("id, name, container_type, location").eq("owner_user_id", user.id).ilike("name", `%${query}%`).order("name").limit(30)
      : { data: [] as never[] },
    within
      ? supabase.from("containers").select("id, name").eq("id", within).eq("owner_user_id", user.id).single()
      : { data: null },
  ]);

  const items = (itemsRes.data ?? []).filter((i: { containers: unknown }) =>
    !within || (i.containers && !Array.isArray(i.containers) && (i.containers as { id: string }).id === within)
  );
  const containers = containersRes.data ?? [];

  return (
    <MobileShell title="Search" activeNav="search" headerActions={<span className={styles.iconBtn}><FilterIcon size={16} /></span>}>
      <form method="get" className={styles.searchWrap}>
        <SearchIcon size={16} style={{ flexShrink: 0, color: "#94a3b8" }} />
        <input name="q" defaultValue={q} placeholder="Search items, containers, tags…" className={styles.searchInput} autoComplete="off" />
        {within && <input type="hidden" name="within" value={within} />}
        {q && <Link href={`/search?tab=${tab}${within ? "&within=" + within : ""}`} className={styles.searchClear}>×</Link>}
      </form>

      <div className={styles.toggleRow}>
        <Link href={`?q=${encodeURIComponent(q)}${within ? "&within=" + within : ""}&tab=items`} className={`${styles.toggleBtn}${isItems ? " " + styles.toggleActive : ""}`}>Items</Link>
        <Link href={`?q=${encodeURIComponent(q)}${within ? "&within=" + within : ""}&tab=containers`} className={`${styles.toggleBtn}${!isItems ? " " + styles.toggleActive : ""}`}>Containers</Link>
      </div>

      {within && withinRes.data && (
        <div className={styles.scopeRow}>
          <span>Within:</span>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>{withinRes.data.name}</span>
          <Link href={`/search?q=${encodeURIComponent(q)}&tab=${tab}`} className={styles.scopeLink}>Change</Link>
        </div>
      )}

      {isItems ? (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Items ({items.length})</h2>
          <ul className={styles.resultList}>
            {items.length === 0 && <p className={styles.empty}>{query ? `No items matching "${query}"` : "Type to search items."}</p>}
            {items.map((item: { id: string; name: string; category: string | null; unit_cost: number | null; containers: unknown }) => {
              const cont = item.containers && !Array.isArray(item.containers) ? (item.containers as { id: string; name: string }) : null;
              return (
                <li key={item.id}>
                  <Link href={`/items/${item.id}`} className={styles.resultItem}>
                    <span className={styles.resultThumbPlaceholder}><BoxIcon size={18} /></span>
                    <div>
                      <p className={styles.resultName}>{item.name}</p>
                      <p className={styles.resultMeta}>{item.category ?? "Uncategorized"}{cont ? ` · ${cont.name}` : ""}</p>
                    </div>
                    <span className={styles.resultRight} style={{ fontSize: "0.78rem", fontWeight: 700 }}>${Number(item.unit_cost ?? 0).toFixed(2)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Containers ({containers.length})</h2>
          <ul className={styles.resultList}>
            {containers.length === 0 && <p className={styles.empty}>{query ? `No containers matching "${query}"` : "Type to search containers."}</p>}
            {containers.map((c: { id: string; name: string; container_type: string | null; location: string | null }) => (
              <li key={c.id}>
                <Link href={`/containers/${c.id}`} className={styles.resultItem}>
                  <span className={styles.resultThumbPlaceholder}><FolderIcon size={18} /></span>
                  <div>
                    <p className={styles.resultName}>{c.name}</p>
                    <p className={styles.resultMeta}>{c.container_type ?? "Container"}{c.location ? ` · ${c.location}` : ""}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </MobileShell>
  );
}
