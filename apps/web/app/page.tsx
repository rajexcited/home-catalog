import Link from "next/link";
import Image from "next/image";

import { MobileShell } from "@/components/mobile-shell";
import { BellIcon, FolderIcon, BoxIcon, GridIcon, MapPinIcon, SearchIcon, AddContainerIcon, AddItemIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/page.module.css";

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className={styles.publicPage}>
        <section className={styles.publicWrap}>
          <article className={styles.publicHero}>
            <p className={styles.publicLabel}>Home Catalog</p>
            <h1 className={styles.publicTitle}>Know what you own and where it lives.</h1>
            <p className={styles.publicBody}>A private household inventory for containers, items, photos, and value tracking.</p>
            <div className={styles.publicActions}>
              <Link href="/sign-in" className={styles.publicAction}>
                Sign in to continue
              </Link>
              <p className={styles.publicHint}>Sign-up is disabled. Access is invite-only.</p>
            </div>
          </article>
          <article className={styles.publicCollageCard}>
            <Image src="/public-collage.svg" alt="App preview" width={1200} height={760} priority className={styles.publicCollageImage} />
          </article>
          <section className={styles.publicPoints}>
            <article className={styles.publicPoint}>
              <p className={styles.publicPointTitle}>Organize by place</p>
              <p className={styles.publicPointBody}>Track rooms, shelves, boxes, and nested containers.</p>
            </article>
            <article className={styles.publicPoint}>
              <p className={styles.publicPointTitle}>Find items quickly</p>
              <p className={styles.publicPointBody}>Search by name and jump directly to item details.</p>
            </article>
            <article className={styles.publicPoint}>
              <p className={styles.publicPointTitle}>Keep visual records</p>
              <p className={styles.publicPointBody}>Attach photos and keep an up-to-date value snapshot.</p>
            </article>
          </section>
        </section>
      </main>
    );
  }

  const [
    { count: containerCount },
    { count: itemCount },
    { data: categories },
    { data: locations },
    { data: recentItems },
    { data: recentContainers },
    { data: profile },
    { data: itemValues }
  ] = await Promise.all([
    supabase.from("containers").select("id", { head: true, count: "exact" }).eq("owner_user_id", user.id),
    supabase.from("items").select("id", { head: true, count: "exact" }).eq("owner_user_id", user.id),
    supabase.from("items").select("category").eq("owner_user_id", user.id).not("category", "is", null),
    supabase.from("containers").select("location").eq("owner_user_id", user.id).not("location", "is", null),
    supabase.from("items").select("id, name, created_at, containers(name)").eq("owner_user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("containers").select("id, name, created_at").eq("owner_user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("users").select("display_name, email").eq("id", user.id).single(),
    supabase.from("items").select("quantity, unit_cost").eq("owner_user_id", user.id)
  ]);

  const categoryCount = new Set((categories ?? []).map((c: { category: string | null }) => c.category)).size;
  const locationCount = new Set((locations ?? []).map((l: { location: string | null }) => l.location)).size;
  const totalValue = (itemValues ?? []).reduce(
    (s: number, i: { quantity: number | null; unit_cost: number | null }) => s + Number(i.quantity ?? 1) * Number(i.unit_cost ?? 0),
    0
  );

  const displayName = profile?.display_name ?? profile?.email ?? user.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((word: string) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const recentActivity = [
    ...(recentContainers ?? []).map((container: { id: string; name: string; created_at: string }) => ({
      id: `container-${container.id}`,
      text: `Created container ${container.name}`,
      time: container.created_at,
      kind: "container"
    })),
    ...(recentItems ?? []).map((item: { id: string; name: string; created_at: string; containers: unknown }) => {
      const contName = item.containers && !Array.isArray(item.containers) ? (item.containers as { name: string }).name : "";
      return {
        id: `item-${item.id}`,
        text: `Added ${item.name}${contName ? ` to ${contName}` : ""}`,
        time: item.created_at,
        kind: "item"
      };
    })
  ]
    .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
    .slice(0, 6);

  return (
    <MobileShell
      title="Home Catalog"
      activeNav="home"
      headerActions={
        <>
          <Link href="/activity" className={styles.headerIconBtn} aria-label="Activity">
            <BellIcon size={19} />
          </Link>
          <Link href="/profile" className={styles.avatarBtn} aria-label="Profile">
            {initials}
          </Link>
        </>
      }
    >
      <Link href="/search" className={styles.searchBar}>
        <SearchIcon size={15} />
        <span>Search containers, items, tags...</span>
      </Link>

      <section className={styles.actionRow}>
        <Link href="/containers?add=1" className={styles.actionCard}>
          <span className={`${styles.actionIcon} ${styles.iconFolder}`}>
            <AddContainerIcon size={18} />
          </span>
          <span>
            <strong>Add Container</strong>
            <small>Room, shelf, box</small>
          </span>
        </Link>
        <Link href="/items/new" className={styles.actionCard}>
          <span className={`${styles.actionIcon} ${styles.iconBox}`}>
            <AddItemIcon size={18} />
          </span>
          <span>
            <strong>Add Item</strong>
            <small>Inventory entry</small>
          </span>
        </Link>
      </section>

      <div className={styles.quickNav}>
        <Link href="/containers" className={styles.quickNavItem}>
          <span className={`${styles.quickNavIcon} ${styles.iconFolder}`}>
            <FolderIcon size={21} />
          </span>
          <p className={styles.quickNavLabel}>Containers</p>
          <p className={styles.quickNavCount}>{containerCount ?? 0}</p>
        </Link>
        <Link href="/search" className={styles.quickNavItem}>
          <span className={`${styles.quickNavIcon} ${styles.iconBox}`}>
            <BoxIcon size={21} />
          </span>
          <p className={styles.quickNavLabel}>Items</p>
          <p className={styles.quickNavCount}>{(itemCount ?? 0).toLocaleString()}</p>
        </Link>
        <Link href="/types/items" className={styles.quickNavItem}>
          <span className={`${styles.quickNavIcon} ${styles.iconGrid}`}>
            <GridIcon size={21} />
          </span>
          <p className={styles.quickNavLabel}>Categories</p>
          <p className={styles.quickNavCount}>{categoryCount}</p>
        </Link>
        <Link href="/types/containers" className={styles.quickNavItem}>
          <span className={`${styles.quickNavIcon} ${styles.iconPin}`}>
            <MapPinIcon size={21} />
          </span>
          <p className={styles.quickNavLabel}>Locations</p>
          <p className={styles.quickNavCount}>{locationCount}</p>
        </Link>
      </div>

      <section className={styles.card}>
        <div className={styles.row}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            Recent Activity
          </h2>
          <Link href="/activity" className={styles.viewAll}>
            View all
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className={styles.empty}>No activity yet. Add a container or item to get started.</p>
        ) : (
          <ul className={styles.activityList} style={{ marginTop: "0.6rem" }}>
            {recentActivity.map((entry) => {
              return (
                <li key={entry.id} className={styles.activityItem}>
                  <span className={`${styles.activityDot} ${entry.kind === "container" ? styles.dotContainer : styles.dotItem}`} />
                  <p className={styles.activityText}>{entry.text}</p>
                  <p className={styles.activityTime}>{relativeTime(entry.time)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Quick Stats</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Total Items</p>
            <p className={styles.statValue}>{(itemCount ?? 0).toLocaleString()}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Total Value</p>
            <p className={styles.statValue}>${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Containers</p>
            <p className={styles.statValue}>{containerCount ?? 0}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Categories</p>
            <p className={styles.statValue}>{categoryCount}</p>
          </div>
        </div>
      </section>
    </MobileShell>
  );
}
