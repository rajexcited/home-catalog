import { redirect } from "next/navigation";
import { updateItem, cloneItem } from "@/app/actions";
import { MobileShell } from "@/components/mobile-shell";
import { PencilIcon, CopyIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/items/[itemId]/item-details.module.css";
import ErrorMessages from "@/components/error-messages";
import ItemImageSectionPage from "../image-section";
import { getUserId } from "@/app/services/user-service";
import { getDistinctAttributeValuesFromItems, getItemDetails } from "@/app/services/item-service";
import { getContainerIds } from "@/app/services/container-service";
import EditItemFormSection, { DistinctValuesResult } from "../../edit-item-form-section";

type Props = { params: Promise<{ itemId: string }>; searchParams: Promise<{ success?: string; error?: string }> };

async function getDistinctValues(supabase = createClient()): Promise<DistinctValuesResult> {
  const { containerIds, error: containerIdsError } = await getContainerIds(supabase);
  if (containerIdsError) {
    return { itemCategories: [], locations: [], tags: [], containerNameList: [], errors: [containerIdsError] };
  }

  const supabaseClient = await supabase;
  const containerNameQuery = supabaseClient.from("containers").select("id,name").in("id", containerIds).order("name");

  const [itemValues, { data: containerNameData, error: containerNameError }] = await Promise.all([
    getDistinctAttributeValuesFromItems(containerIds, supabase),
    containerNameQuery
  ]);

  const errors = [];
  if (itemValues.error) {
    errors.push(itemValues.error);
  }
  if (containerNameError) {
    errors.push(containerNameError.message);
  }

  return {
    itemCategories: itemValues.distinctValues.item_category_options,
    locations: itemValues.distinctValues.location,
    tags: itemValues.distinctValues.tags,
    containerNameList: (containerNameData ?? []).map((c) => ({ id: c.id, name: c.name, nameWithParent: c.name, parent: null })),
    errors
  };
}

export default async function ItemDetailsPage({ params, searchParams }: Props) {
  const { itemId } = await params;
  const { success, error } = await searchParams;
  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect("/sign-in");

  const { item, error: itemError } = await getItemDetails(itemId, supabase);
  if (itemError) {
    redirect(`/items/${itemId}?error=${encodeURIComponent(itemError)}`);
  }
  if (!item) {
    redirect(`/items/${itemId}?error=Item not found`);
  }

  const distinctValues = await getDistinctValues(supabase);
  const pageErrors = [...(error?.split("$,$") ?? []), ...distinctValues.errors];

  return (
    <MobileShell
      title={"Edit Item: " + item.name}
      activeNav="more"
      backHref={`/items/${item.id}`}
      headerActions={
        <>
          <form action={cloneItem}>
            <input type="hidden" name="itemId" value={item.id} />
            <button type="submit" className={styles.iconBtn} title="Clone item">
              <CopyIcon size={15} />
            </button>
          </form>
          <button type="submit" form="editItemForm" className={styles.iconBtn} title="Save item">
            <PencilIcon size={15} />
          </button>
        </>
      }
    >
      {success ? <p className={styles.toastOk}>{success}</p> : null}
      <ErrorMessages errors={pageErrors} />

      {/* {warrantyExpiringSoon && (
        <div className={styles.warrantyAlert}>
          <AlertIcon size={16} />
          Warranty expires {item.warranty_expiry}
        </div>
      )} */}

      {/* {imageUrls.length > 0 && (
        <section className={styles.card}>
          <div className={styles.gallery}>
            {imageUrls.map((img) => (
              <div key={img.id} style={{ position: "relative", flexShrink: 0 }}>
                <img src={img.url} alt={img.caption ?? item.name} className={styles.galleryImg} />
                <form action={deleteItemImage} style={{ position: "absolute", top: "0.25rem", right: "0.25rem" }}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="imageId" value={img.id} />
                  <button
                    type="submit"
                    className={styles.iconBtn}
                    style={{ width: "1.5rem", height: "1.5rem", background: "rgba(0,0,0,0.55)", color: "#fff", border: "none" }}
                  >
                    ×
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Upload Photo</h2>
        <form action={uploadItemImage} className={styles.form}>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif" className={styles.input} required />
          <input name="caption" placeholder="Caption (optional)" className={styles.input} />
          <button type="submit" className={styles.btnSecondary + " " + styles.uploadImgBtn}>
            <CameraIcon size={16} />
            Upload Image
          </button>
        </form>
      </section> */}
      <ItemImageSectionPage item={item} />

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Edit Item</h2>
        <form id="editItemForm" action={updateItem} className={styles.form} name="editItemForm">
          <input type="hidden" name="id" value={item.id} />
          <EditItemFormSection item={item} distinctValues={distinctValues} />
          {/* <label className={styles.label}>Name *</label>
          <input className={styles.input} name="name" placeholder="e.g. DeWalt Drill Set" required />
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Category *</label>
              <CreatableSingleSelect name="category" defaultValue={item.category?.id} options={categoryOptions} placeholder="e.g. Power Tools" />
            </div>
            <div>
              <label className={styles.label}>Container *</label>
              <CreatableSingleSelect name="container" defaultValue={item.container.id} options={containerNameOptions} placeholder="Select container" />
            </div>
          </div>
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Unit Cost ($)</label>
              <input name="unitCost" type="number" min="0" step="0.01" defaultValue={item.unit_cost ?? 0} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>Quantity</label>
              <input name="quantity" type="number" min="0" step="1" defaultValue={item.quantity ?? 1} className={styles.input} />
            </div>
          </div>
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Purchase Date</label>
              <input name="purchaseDate" type="date" defaultValue={item.purchase_date ?? ""} className={styles.input} />
            </div>
          </div> 
          <label className={styles.label}>Warranty Expiry</label>
          <input name="warrantyExpiry" type="date" defaultValue={item.warranty_expiry ?? ""} className={styles.input} /> 
          <textarea name="notes" defaultValue={item.notes ?? ""} className={styles.textarea} placeholder="Notes" />
          <button type="submit" className={styles.btnPrimary}>
            <PencilIcon size={15} />
            Save Item
          </button>
              */}
        </form>
      </section>
    </MobileShell>
  );
}
