import Link from "next/link";
import { redirect } from "next/navigation";

import { createContainer } from "@/app/actions";
import { MobileShell } from "@/components/mobile-shell";
import { FolderIcon, PlusIcon, DotsVerticalIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/containers/containers.module.css";

type Props = { searchParams: Promise<{ success?: string; error?: string; add?: string }> };

export default async function ContainersPage({ searchParams }: Props) {
  const { success, error, add } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: containers }, { data: items }] = await Promise.all([
    supabase.from("containers").select("id, name, location, container_type, parent_id").eq("owner_user_id", user.id).order("name"),
    supabase.from("items").select("id, container_id").eq("owner_user_id", user.id),
  ]);

  const itemCountByContainer = new Map<string, number>();
  for (const item of items ?? []) {
    itemCountByContainer.set(item.container_id, (itemCountByContainer.get(item.container_id) ?? 0) + 1);
  }
  const childCountByContainer = new Map<string, number>();
  for (const c of containers ?? []) {
    if (c.parent_id) childCountByContainer.set(c.parent_id, (childCountByContainer.get(c.parent_id) ?? 0) + 1);
  }

  return (
    <MobileShell
      title="Containers"
      activeNav="more"
      headerActions={
        <Link href="/containers?add=1" className={styles.iconBtn} aria-label="Add container">
          <PlusIcon size={17} />
        </Link>
      }
    >
      {success ? <p className={styles.toastOk}>{success}</p> : null}
      {error ? <p className={styles.toastErr}>{error}</p> : null}

      {add === "1" && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>New Container</h2>
          <form action={createContainer} className={styles.form}>
            <input name="name" placeholder="Container name" className={styles.input} required />
            <div className={styles.formGrid}>
              <input name="containerType" placeholder="Type (garage, shelf…)" className={styles.input} />
              <input name="location" placeholder="Location" className={styles.input} />
            </div>
            <textarea name="notes" placeholder="Notes (optional)" className={styles.textarea} rows={2} />
            <button type="submit" className={styles.btnPrimary}>
              <PlusIcon size={16} />Create Container
            </button>
          </form>
        </section>
      )}

      <section className={styles.card}>
        <ul className={styles.list}>
          {(containers ?? []).length === 0 && (
            <p className={styles.empty}>No containers yet. Tap + to create your first one.</p>
          )}
          {(containers ?? []).map(c => {
            const icount = itemCountByContainer.get(c.id) ?? 0;
            const ccount = childCountByContainer.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link href={`/containers/${c.id}`} className={styles.listItem}>
                  <span className={styles.folderIcon}><FolderIcon size={20} /></span>
                  <div>
                    <p className={styles.itemName}>{c.name}</p>
                    <p className={styles.itemMeta}>
                      {c.container_type ? `${c.container_type} · ` : ""}
                      {ccount > 0 ? `${ccount} sub · ` : ""}
                      {icount} items
                      {c.location ? ` · ${c.location}` : ""}
                    </p>
                  </div>
                  <div className={styles.itemActions}>
                    <Link href={`/containers/${c.id}/details`} className={styles.iconBtn} aria-label="Edit">
                      <DotsVerticalIcon size={15} />
                    </Link>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </MobileShell>
  );
}
