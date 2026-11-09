import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createItem } from "@/app/actions";
import { MobileShell } from "@/components/mobile-shell";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/items/add/new-item.module.css";
import { ItemReadResource } from "@/app/services/item-service";
import { getUserId } from "@/app/services/user-service";
import ErrorMessages from "@/components/error-messages";
import EditItemFormSection, { getDistinctValues } from "../edit-item-form-section";
import { toSafePath } from "@/app/api/url-utils";

export type AddItemProps = { searchParams: Promise<{ error?: string; parentId?: string }> };

export default async function NewItemPage({ searchParams }: AddItemProps) {
  const { error, parentId } = await searchParams;
  const supabase = createClient();
  const userId = getUserId(supabase);

  if (!userId) {
    redirect("/sign-in");
  }

  const headerList = await headers();
  const referer = headerList.get("referer");
  const backHref = toSafePath(referer) ?? "/dashboard";

  const distinctValues = await getDistinctValues(supabase);
  const pageErrors = [...(error ? error.split("$,$") : []), ...distinctValues.errors];

  // const containerNameOptions = distinctValues.containerNameList.map((c) => ({ value: c.id, label: c.name }));
  // const categoryOptions = distinctValues.itemCategories.map((c) => ({ value: c.id, label: c.name }));

  const newItem: ItemReadResource = {
    id: "",
    name: "",
    category: null,
    container: { id: parentId ?? "", name: "", location: null },
    quantity: 1,
    unit_cost: null,
    purchase_date: null,
    notes: null,
    created_at: "",
    updated_at: "",
    type: "item",
    images: [],
    location: null,
    status: "enabled",
    subcategory: null,
    tags: [],
    item_attributes: {}
  };

  return (
    <MobileShell title="Add Item" activeNav="addItem" backHref={backHref}>
      <ErrorMessages errors={pageErrors} />
      <section className={styles.card}>
        <form action={createItem} className={styles.form}>
          <EditItemFormSection
            item={newItem}
            distinctValues={distinctValues}
            editFields={["category", "container", "quantity", "unit_cost", "notes", "purchase_date", "warranty_expiry"]}
          />
          {/* <label className={styles.label}>Name *</label>
          <input className={styles.input} name="name" placeholder="e.g. DeWalt Drill Set" required />
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Category *</label>
              <CreatableSingleSelect name="category" options={categoryOptions} placeholder="e.g. Power Tools" />
            </div>
            <div>
              <label className={styles.label}>Container *</label>
              <CreatableSingleSelect name="container" defaultValue={parentId ?? ""} options={containerNameOptions} placeholder="Select container" />
            </div>
          </div>
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Quantity</label>
              <input className={styles.input} name="quantity" type="number" min="0" step="1" defaultValue="1" />
            </div>
            <div>
              <label className={styles.label}>Unit Cost ($)</label>
              <input className={styles.input} name="unitCost" type="number" min="0" step="0.01" defaultValue="" />
            </div>
          </div>
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Purchase Date</label>
              <input className={styles.input} name="purchaseDate" type="date" />
            </div>
            <div>
              <label className={styles.label}>Warranty Expiry</label>
              <input className={styles.input} name="warrantyExpiry" type="date" />
            </div>
          </div>
          <label className={styles.label}>Notes</label>
          <textarea className={styles.textarea} name="notes" placeholder="Optional notes" /> 
          <button type="submit" className={styles.btnPrimary}>
            <PlusIcon size={16} />
            Save Item
          </button>
            */}
        </form>
      </section>
    </MobileShell>
  );
}
