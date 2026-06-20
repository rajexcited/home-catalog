import { redirect } from "next/navigation";

import { renameContainerType } from "@/app/actions";
import { MobileShell } from "@/components/mobile-shell";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/types/containers/container-types.module.css";

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function ContainerTypesPage({ searchParams }: Props) {
  const { success, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: containers } = await supabase.from("containers").select("container_type, location").eq("owner_user_id", user.id);

  const typeMap = new Map<string, number>();
  const locationMap = new Map<string, number>();
  for (const c of containers ?? []) {
    if (c.container_type) typeMap.set(c.container_type, (typeMap.get(c.container_type) ?? 0) + 1);
    if (c.location) locationMap.set(c.location, (locationMap.get(c.location) ?? 0) + 1);
  }

  return (
    <MobileShell title="Container Types" activeNav="more" backHref="/profile">
      {success ? <p className={styles.toastOk}>{success}</p> : null}
      {error ? <p className={styles.toastErr}>{error}</p> : null}

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Types ({typeMap.size})</h2>
        {typeMap.size === 0 && <p className={styles.empty}>No container types yet. Add a container with a type field.</p>}
        <div className={styles.typeGrid}>
          {Array.from(typeMap.entries())
            .sort()
            .map(([type, count]) => (
              <div key={type} className={styles.typeCard}>
                <p className={styles.typeName}>{type}</p>
                <p className={styles.typeCount}>
                  {count} container{count !== 1 ? "s" : ""}
                </p>
                <div className={styles.typeActions}>
                  <form action={renameContainerType} style={{ display: "flex", gap: "0.3rem", flex: 1 }}>
                    <input type="hidden" name="oldType" value={type} />
                    <input name="newType" defaultValue={type} className={styles.renameInput} required />
                    <button type="submit" className={styles.iconBtn} title="Rename" style={{ flexShrink: 0 }}>
                      ✓
                    </button>
                  </form>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Locations ({locationMap.size})</h2>
        {locationMap.size === 0 && <p className={styles.empty}>No locations set yet. Edit a container to add a location.</p>}
        <div className={styles.typeGrid}>
          {Array.from(locationMap.entries())
            .sort()
            .map(([loc, count]) => (
              <div key={loc} className={styles.typeCard}>
                <p className={styles.typeName}>{loc}</p>
                <p className={styles.typeCount}>
                  {count} container{count !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
        </div>
      </section>
    </MobileShell>
  );
}
