import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/actions";
import { MobileShell } from "@/components/mobile-shell";
import { UserIcon, FolderIcon, GridIcon, MapPinIcon, LogOutIcon, ChevronRightIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/profile/profile.module.css";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("users").select("display_name, email").eq("id", user.id).single();
  const displayName = profile?.display_name ?? profile?.email ?? user.email ?? "User";
  const email = profile?.email ?? user.email ?? "";
  const initials = displayName
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [{ count: containerCount }, { count: itemCount }] = await Promise.all([
    supabase.from("containers").select("id", { head: true, count: "exact" }).eq("owner_user_id", user.id),
    supabase.from("items").select("id", { head: true, count: "exact" }).eq("owner_user_id", user.id)
  ]);

  return (
    <MobileShell title="Profile" activeNav="more">
      <section className={styles.card}>
        <div className={styles.profileHead}>
          <div className={styles.profileAvatar}>{initials}</div>
          <div>
            <p className={styles.profileName}>{displayName}</p>
            <p className={styles.profileEmail}>{email}</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0.5rem", marginTop: "0.875rem" }}>
          <div style={{ background: "#f8fafc", borderRadius: "0.65rem", padding: "0.6rem", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "0.67rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Containers</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "1.1rem", fontWeight: 700 }}>{containerCount ?? 0}</p>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: "0.65rem", padding: "0.6rem", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "0.67rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Items</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "1.1rem", fontWeight: 700 }}>{itemCount ?? 0}</p>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <ul className={styles.menuList}>
          <li>
            <Link href="/containers" className={styles.menuItem}>
              <FolderIcon size={18} className={styles.menuIcon} />
              Containers
              <ChevronRightIcon size={16} className={styles.menuChevron} />
            </Link>
          </li>
          <li>
            <Link href="/types/containers" className={styles.menuItem}>
              <MapPinIcon size={18} className={styles.menuIcon} />
              Container Types &amp; Locations
              <ChevronRightIcon size={16} className={styles.menuChevron} />
            </Link>
          </li>
          <li>
            <Link href="/types/items" className={styles.menuItem}>
              <GridIcon size={18} className={styles.menuIcon} />
              Item Categories
              <ChevronRightIcon size={16} className={styles.menuChevron} />
            </Link>
          </li>
          <li>
            <Link href="/activity" className={styles.menuItem}>
              <UserIcon size={18} className={styles.menuIcon} />
              Activity Log
              <ChevronRightIcon size={16} className={styles.menuChevron} />
            </Link>
          </li>
        </ul>
      </section>

      <section className={styles.card}>
        <ul className={styles.menuList}>
          <li>
            <form action={signOut}>
              <button type="submit" className={`${styles.menuItem} ${styles.menuItemDanger}`}>
                <LogOutIcon size={18} style={{ color: "#dc2626", flexShrink: 0 }} />
                Sign Out
              </button>
            </form>
          </li>
        </ul>
      </section>
    </MobileShell>
  );
}
