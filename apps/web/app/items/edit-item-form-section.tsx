import styles from "./edit-item-form.module.css";
import { CreatableSingleSelect } from "@/components/creatable-single-select";
import NotesTextarea from "@/components/notes-textarea";
import { getDistinctAttributeValuesFromItems, ItemReadResource } from "../services/item-service";
import { PencilIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { getContainerIds } from "../services/container-service";

type Props = { item: ItemReadResource; distinctValues: DistinctValuesResult; editFields?: (keyof ItemReadResource | "warranty_expiry")[] };

export type DistinctValuesResult = {
  itemCategories: { id: string; name: string }[];
  locations: string[];
  tags: string[];
  containerNameList: { id: string; name: string; parent: { id: string; name: string } | null; nameWithParent: string }[];
  errors: string[];
};

export async function getDistinctValues(supabase = createClient()): Promise<DistinctValuesResult> {
  const { containerIds, error: containerIdsError } = await getContainerIds(supabase);
  if (containerIdsError) {
    return { itemCategories: [], locations: [], tags: [], containerNameList: [], errors: [containerIdsError] };
  }

  const supabaseClient = await supabase;
  const containerNameQuery = supabaseClient.from("containers").select("id,name,parent:parent_id(id,name)").in("id", containerIds).order("name");

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

  const containerNameListWithParent = (containerNameData ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    parent: c.parent ? { id: c.parent.id, name: c.parent.name } : null,
    nameWithParent: c.parent ? `${c.name} of ${c.parent.name}` : c.name
  }));

  return {
    itemCategories: itemValues.distinctValues.item_category_options,
    locations: itemValues.distinctValues.location,
    tags: itemValues.distinctValues.tags,
    containerNameList: containerNameListWithParent,
    errors
  };
}

export default function EditItemFormSection({ item, distinctValues, editFields }: Props) {
  const containerNameOptions = distinctValues.containerNameList.map((c) => ({ value: c.id, label: c.nameWithParent }));
  const categoryOptions = distinctValues.itemCategories.map((c) => ({ value: c.id, label: c.name }));
  const locationOptions = distinctValues.locations;
  const tagOptions = distinctValues.tags;

  console.log(containerNameOptions);

  return (
    <>
      <label className={styles.label}>Name *</label>
      <input className={styles.input} name="name" placeholder="e.g. DeWalt Drill Set" required />
      <div className={styles.formGrid}>
        {(!editFields || editFields.includes("category")) && (
          <div>
            <label className={styles.label}>Category *</label>
            <CreatableSingleSelect name="category" defaultValue={item.category?.id} options={categoryOptions} placeholder="e.g. Power Tools" required={true} />
          </div>
        )}
        {(!editFields || editFields.includes("container")) && (
          <div>
            <label className={styles.label}>Container *</label>
            <CreatableSingleSelect
              name="container"
              defaultValue={item.container.id}
              options={containerNameOptions}
              placeholder="Select container"
              required={true}
            />
          </div>
        )}
      </div>
      <div className={styles.formGrid}>
        {(!editFields || editFields.includes("quantity")) && (
          <div>
            <label className={styles.label}>Quantity</label>
            <input name="quantity" type="number" min="0" step="1" defaultValue={item.quantity ?? 1} className={styles.input} />
          </div>
        )}
        {(!editFields || editFields.includes("unit_cost")) && (
          <div>
            <label className={styles.label}>Unit Cost ($)</label>
            <input name="unitCost" type="number" min="0" step="0.01" defaultValue={item.unit_cost ?? 0} className={styles.input} />
          </div>
        )}
      </div>
      <div className={styles.formGrid}>
        {(!editFields || editFields.includes("purchase_date")) && (
          <div>
            <label className={styles.label}>Purchase Date</label>
            <input name="purchaseDate" type="date" defaultValue={item.purchase_date ?? ""} className={styles.input} />
          </div>
        )}
        {(!editFields || editFields.includes("warranty_expiry")) && (
          <div>
            <label className={styles.label}>Warranty Expiry</label>
            <input
              name="warrantyExpiry"
              type="date"
              defaultValue={(item.item_attributes?.warranty_expiry as string | undefined) ?? ""}
              className={styles.input}
            />
          </div>
        )}
      </div>
      <div className={styles.formGrid}>
        {(!editFields || editFields.includes("location")) && (
          <div>
            <label className={styles.label}>Location</label>
            <CreatableSingleSelect name="location" defaultValue={item.location ?? ""} options={locationOptions} placeholder="Select location" />
          </div>
        )}
        {(!editFields || editFields.includes("tags")) && (
          <div>
            <label className={styles.label}>Tags</label>
            <CreatableSingleSelect name="tags" isMulti defaultValue={item.tags ?? []} options={tagOptions} placeholder="Add or select tags" />
          </div>
        )}
      </div>
      {(!editFields || editFields.includes("notes")) && (
        <div>
          <NotesTextarea name="notes" label="Notes" placeholder="Optional notes" maxLength={200} />
        </div>
      )}

      <button type="submit" className={styles.btnPrimary}>
        <PencilIcon size={15} />
        Save Item
      </button>
    </>
  );
}
