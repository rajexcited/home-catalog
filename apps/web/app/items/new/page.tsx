import { redirect } from "next/navigation";

import { createItem } from "@/app/actions";
import { MobileShell } from "@/components/mobile-shell";
import { PlusIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/items/new/new-item.module.css";

type Props = { searchParams: Promise<{ error?: string; containerId?: string }> };

export default async function NewItemPage({ searchParams }: Props) {
  const { error, containerId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: containers }, { data: categoryRows }] = await Promise.all([
    supabase.from("containers").select("id, name").eq("owner_user_id", user.id).order("name"),
    supabase.from("items").select("category").eq("owner_user_id", user.id).not("category", "is", null),
  ]);
  const distinctCategories = Array.from(new Set((categoryRows ?? []).map(c => c.category)));

  return (
    <MobileShell title="Add Item" activeNav="add" backHref={containerId ? `/containers/${containerId}` : "/search"}>
      {error ? <p className={styles.toastErr}>{error}</p> : null}
      <section className={styles.card}>
        <form action={createItem} className={styles.form}>
          <label className={styles.label}>Name *</label>
          <input className={styles.input} name="name" placeholder="e.g. DeWalt Drill Set" required />
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Category</label>
              <input className={styles.input} name="category" placeholder="e.g. Power Tools" list="cat-list" />
              <datalist id="cat-list">{distinctCategories.map(c => <option key={c} value={c ?? ""} />)}</datalist>
            </div>
            <div>
              <label className={styles.label}>Container *</label>
              <select className={styles.select} name="containerId" defaultValue={containerId ?? ""} required>
                <option value="" disabled>Select container</option>
                {(containers ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.formGrid}>
            <div><label className={styles.label}>Quantity</label><input className={styles.input} name="quantity" type="number" min="0" step="1" defaultValue="1" /></div>
            <div><label className={styles.label}>Unit Cost ($)</label><input className={styles.input} name="unitCost" type="number" min="0" step="0.01" defaultValue="0" /></div>
          </div>
          <div className={styles.formGrid}>
            <div><label className={styles.label}>Purchase Date</label><input className={styles.input} name="purchaseDate" type="date" /></div>
            <div><label className={styles.label}>Warranty Expiry</label><input className={styles.input} name="warrantyExpiry" type="date" /></div>
          </div>
          <label className={styles.label}>Notes</label>
          <textarea className={styles.textarea} name="notes" placeholder="Optional notes" />
          <button type="submit" className={styles.btnPrimary}><PlusIcon size={16} />Save Item</button>
        </form>
      </section>
    </MobileShell>
  );
}
