import { redirect } from "next/navigation";

import { renameItemCategory } from "@/app/actions";
import { MobileShell } from "@/components/mobile-shell";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/types/items/item-categories.module.css";

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function ItemCategoriesPage({ searchParams }: Props) {
  const { success, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: items } = await supabase.from("items").select("category").eq("owner_user_id", user.id);
  const categoryMap = new Map<string, number>();
  for (const i of items ?? []) {
    const cat = i.category ?? "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }

  return (
    <MobileShell title="Item Categories" activeNav="more" backHref="/profile">
      {success ? <p className={styles.toastOk}>{success}</p> : null}
      {error ? <p className={styles.toastErr}>{error}</p> : null}

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Categories ({categoryMap.size})</h2>
        {categoryMap.size === 0 && <p className={styles.empty}>No categories yet. Add items with a category field.</p>}
        <div className={styles.catGrid}>
          {Array.from(categoryMap.entries())
            .sort()
            .map(([cat, count]) => (
              <div key={cat} className={styles.catCard}>
                <p className={styles.catName}>{cat}</p>
                <p className={styles.catCount}>
                  {count} item{count !== 1 ? "s" : ""}
                </p>
                {cat !== "Uncategorized" && (
                  <div className={styles.catActions}>
                    <form action={renameItemCategory} style={{ display: "flex", gap: "0.3rem", flex: 1 }}>
                      <input type="hidden" name="oldCategory" value={cat} />
                      <input name="newCategory" defaultValue={cat} className={styles.renameInput} required />
                      <button type="submit" className={styles.iconBtn} title="Rename" style={{ flexShrink: 0 }}>
                        ✓
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
        </div>
      </section>
    </MobileShell>
  );
}
