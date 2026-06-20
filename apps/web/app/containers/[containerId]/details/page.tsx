import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteContainer, updateContainer } from "@/app/actions";
import { MobileShell } from "@/components/mobile-shell";
import { ShareIcon, FolderIcon, PencilIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/containers/[containerId]/details/container-details.module.css";

type Props = { params: Promise<{ containerId: string }>; searchParams: Promise<{ success?: string; error?: string }> };

export default async function ContainerDetailsPage({ params, searchParams }: Props) {
  const { containerId } = await params;
  const { success, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: container }, { data: items }] = await Promise.all([
    supabase.from("containers").select("id, name, container_type, location, notes").eq("id", containerId).eq("owner_user_id", user.id).single(),
    supabase.from("items").select("id, quantity, unit_cost").eq("container_id", containerId).eq("owner_user_id", user.id),
  ]);
  if (!container) redirect("/containers?error=Container not found");

  const totalValue = (items ?? []).reduce((s, i) => s + Number(i.quantity ?? 1) * Number(i.unit_cost ?? 0), 0);

  return (
    <MobileShell
      title={container.name}
      activeNav="more"
      backHref={`/containers/${containerId}`}
      headerActions={
        <Link href={`/containers/${containerId}/sharing`} className={styles.iconBtn} aria-label="Sharing">
          <ShareIcon size={16} />
        </Link>
      }
    >
      {success ? <p className={styles.toastOk}>{success}</p> : null}
      {error ? <p className={styles.toastErr}>{error}</p> : null}

      <div className={styles.heroPlaceholder}><FolderIcon size={40} /></div>

      <section className={styles.card}>
        <div className={styles.detailsGrid}>
          <div className={styles.kv}><p className={styles.kvLabel}>Type</p><p className={styles.kvValue}>{container.container_type ?? "—"}</p></div>
          <div className={styles.kv}><p className={styles.kvLabel}>Items</p><p className={styles.kvValue}>{items?.length ?? 0}</p></div>
          <div className={styles.kv}><p className={styles.kvLabel}>Location</p><p className={styles.kvValue}>{container.location ?? "—"}</p></div>
          <div className={styles.kv}><p className={styles.kvLabel}>Total Value</p><p className={styles.kvValue}>${totalValue.toFixed(2)}</p></div>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Edit Details</h2>
        <form action={updateContainer} className={styles.form}>
          <input type="hidden" name="id" value={container.id} />
          <label className={styles.label}>Name</label>
          <input name="name" defaultValue={container.name} className={styles.input} required />
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Type</label>
              <input name="containerType" defaultValue={container.container_type ?? ""} className={styles.input} placeholder="garage, shelf…" />
            </div>
            <div>
              <label className={styles.label}>Location</label>
              <input name="location" defaultValue={container.location ?? ""} className={styles.input} placeholder="e.g. Main House" />
            </div>
          </div>
          <label className={styles.label}>Notes</label>
          <textarea name="notes" defaultValue={container.notes ?? ""} className={styles.textarea} placeholder="Optional notes" />
          <button type="submit" className={styles.btnPrimary}><PencilIcon size={15} />Save Changes</button>
        </form>
      </section>

      <section className={styles.card}>
        <div className={styles.actionRow}>
          <Link href={`/containers/${containerId}/sharing`} className={styles.btnSecondary}><ShareIcon size={15} />Manage Sharing</Link>
        </div>
      </section>

      <section className={styles.card}>
        <form action={deleteContainer}>
          <input type="hidden" name="id" value={container.id} />
          <button type="submit" className={styles.btnDanger}>Delete Container</button>
        </form>
      </section>
    </MobileShell>
  );
}
