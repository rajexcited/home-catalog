import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteItem, deleteItemImage, updateItem, uploadItemImage, cloneItem } from "@/app/actions";
import { MobileShell } from "@/components/mobile-shell";
import { CameraIcon, PencilIcon, TrashIcon, CopyIcon, AlertIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/items/[itemId]/item-details.module.css";

type Props = { params: Promise<{ itemId: string }>; searchParams: Promise<{ success?: string; error?: string }> };

export default async function ItemDetailsPage({ params, searchParams }: Props) {
  const { itemId } = await params;
  const { success, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: item }, { data: images }] = await Promise.all([
    supabase.from("items").select("id, container_id, name, category, quantity, unit_cost, purchase_date, warranty_expiry, notes, containers(name)").eq("id", itemId).eq("owner_user_id", user.id).single(),
    supabase.from("item_images").select("id, storage_path, caption").eq("item_id", itemId).eq("owner_user_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (!item) redirect("/search?error=Item not found");

  const imageUrls = (images ?? []).map(img => {
    const { data } = supabase.storage.from("item-images").getPublicUrl(img.storage_path);
    return { ...img, url: data.publicUrl };
  });

  const containerName = item.containers && !Array.isArray(item.containers)
    ? (item.containers as { name: string }).name : "Unknown";
  const totalValue = Number(item.quantity ?? 1) * Number(item.unit_cost ?? 0);
  const warrantyExpiry = item.warranty_expiry ? new Date(item.warranty_expiry) : null;
  const warrantyExpiringSoon = warrantyExpiry && warrantyExpiry.getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000;

  return (
    <MobileShell
      title={item.name}
      activeNav="more"
      backHref={`/containers/${item.container_id}`}
      headerActions={
        <form action={cloneItem}>
          <input type="hidden" name="itemId" value={item.id} />
          <button type="submit" className={styles.iconBtn} title="Clone item"><CopyIcon size={15} /></button>
        </form>
      }
    >
      {success ? <p className={styles.toastOk}>{success}</p> : null}
      {error ? <p className={styles.toastErr}>{error}</p> : null}

      {warrantyExpiringSoon && (
        <div className={styles.warrantyAlert}>
          <AlertIcon size={16} />
          Warranty expires {item.warranty_expiry}
        </div>
      )}

      {imageUrls.length > 0 && (
        <section className={styles.card}>
          <div className={styles.gallery}>
            {imageUrls.map(img => (
              <div key={img.id} style={{ position: "relative", flexShrink: 0 }}>
                <img src={img.url} alt={img.caption ?? item.name} className={styles.galleryImg} />
                <form action={deleteItemImage} style={{ position: "absolute", top: "0.25rem", right: "0.25rem" }}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="imageId" value={img.id} />
                  <button type="submit" className={styles.iconBtn} style={{ width: "1.5rem", height: "1.5rem", background: "rgba(0,0,0,0.55)", color: "#fff", border: "none" }}>×</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.detailsTable}>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Category</span><span className={styles.detailValue}>{item.category ?? "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Container</span><Link href={`/containers/${item.container_id}`} className={styles.detailValue} style={{ color: "#2563eb", textDecoration: "none" }}>{containerName}</Link></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Quantity</span><span className={styles.detailValue}>{item.quantity ?? 1}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Unit Cost</span><span className={styles.detailValue}>${Number(item.unit_cost ?? 0).toFixed(2)}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Total Value</span><span className={styles.detailValue}>${totalValue.toFixed(2)}</span></div>
          {item.purchase_date && <div className={styles.detailRow}><span className={styles.detailLabel}>Purchased</span><span className={styles.detailValue}>{item.purchase_date}</span></div>}
          {item.warranty_expiry && <div className={styles.detailRow}><span className={styles.detailLabel}>Warranty</span><span className={styles.detailValue}>{item.warranty_expiry}</span></div>}
        </div>
        {item.notes && <p style={{ margin: "0.6rem 0 0", fontSize: "0.82rem", color: "#475569" }}>{item.notes}</p>}
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Upload Photo</h2>
        <form action={uploadItemImage} className={styles.form}>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif" className={styles.input} required />
          <input name="caption" placeholder="Caption (optional)" className={styles.input} />
          <button type="submit" className={styles.btnSecondary} style={{ width: "100%", justifyContent: "center" }}><CameraIcon size={16} />Upload Image</button>
        </form>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Edit Item</h2>
        <form action={updateItem} className={styles.form}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="containerId" value={item.container_id} />
          <label className={styles.label}>Name</label>
          <input name="name" defaultValue={item.name} className={styles.input} required />
          <div className={styles.formGrid}>
            <div><label className={styles.label}>Category</label><input name="category" defaultValue={item.category ?? ""} className={styles.input} /></div>
            <div><label className={styles.label}>Quantity</label><input name="quantity" type="number" min="0" step="1" defaultValue={item.quantity ?? 1} className={styles.input} /></div>
          </div>
          <div className={styles.formGrid}>
            <div><label className={styles.label}>Unit Cost ($)</label><input name="unitCost" type="number" min="0" step="0.01" defaultValue={item.unit_cost ?? 0} className={styles.input} /></div>
            <div><label className={styles.label}>Purchase Date</label><input name="purchaseDate" type="date" defaultValue={item.purchase_date ?? ""} className={styles.input} /></div>
          </div>
          <label className={styles.label}>Warranty Expiry</label>
          <input name="warrantyExpiry" type="date" defaultValue={item.warranty_expiry ?? ""} className={styles.input} />
          <textarea name="notes" defaultValue={item.notes ?? ""} className={styles.textarea} placeholder="Notes" />
          <button type="submit" className={styles.btnPrimary}><PencilIcon size={15} />Save Item</button>
        </form>
      </section>

      <section className={styles.card}>
        <form action={deleteItem}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="containerId" value={item.container_id} />
          <button type="submit" className={styles.btnDanger}><TrashIcon size={15} />Delete Item</button>
        </form>
      </section>
    </MobileShell>
  );
}
