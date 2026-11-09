import { ContainerReadResource, getContainerIds, getDistinctAttributeValuesFromContainers } from "../services/container-service";
import styles from "./edit-container-form.module.css";
import { createClient } from "@/lib/supabase/server";
import { CreatableSingleSelect } from "@/components/creatable-single-select";
import NotesTextarea from "@/components/notes-textarea";

export type DistinctValuesResult = {
  containerTypeList: { id: string; name: string }[];
  locations: string[];
  tags: string[];
  containerNameList: { id: string; name: string; parent: { id: string; name: string } | null; nameWithParent: string }[];
  errors: string[];
};

export async function getDistinctValues(supabase: ReturnType<typeof createClient>): Promise<DistinctValuesResult> {
  const { containerIds, error: containerIdsError } = await getContainerIds(supabase);
  if (containerIdsError) {
    return { containerTypeList: [], locations: [], tags: [], containerNameList: [], errors: [containerIdsError] };
  }

  const supabaseClient = await supabase;
  const containerNameQuery = supabaseClient.from("containers").select("id,name,parent:parent_id(id,name)").in("id", containerIds).order("name");

  const [containerValues, containerNameResults] = await Promise.all([getDistinctAttributeValuesFromContainers(containerIds, supabase), containerNameQuery]);

  const errors = [];
  if (containerValues.error) {
    errors.push(containerValues.error);
  }
  if (containerNameResults.error) {
    errors.push(containerNameResults.error.message);
  }

  const containerNameListWithParent = (containerNameResults.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    parent: c.parent ? { id: c.parent.id, name: c.parent.name } : null,
    nameWithParent: c.parent ? `${c.name} of ${c.parent.name}` : c.name
  }));

  return {
    containerTypeList: containerValues.distinctValues.container_type_options,
    locations: containerValues.distinctValues.location,
    tags: containerValues.distinctValues.tags,
    containerNameList: containerNameListWithParent,
    errors: errors
  };
}

type Props = { container: ContainerReadResource; distinctValues: DistinctValuesResult; editFields?: (keyof ContainerReadResource)[] };

export default function EditContainerFormSection({ container, distinctValues, editFields }: Props) {
  const containerNameOptions = distinctValues.containerNameList
    .filter((c) => c.name !== container.name) // Exclude the current container from the list of parent options
    .map((c) => ({ value: c.id, label: c.nameWithParent }));
  const containerTypeOptions = distinctValues.containerTypeList.map((c) => ({ value: c.id, label: c.name }));
  const locationOptions = distinctValues.locations;
  const tagOptions = distinctValues.tags;

  return (
    <>
      <label className={styles.label}>Name *</label>
      <input name="name" placeholder="e.g. Garage Shelf" className={styles.input} required defaultValue={container.name ?? ""} />
      <div className={styles.formGrid}>
        {(!editFields || editFields.includes("container_type")) && (
          <div>
            <label className={styles.label}>Type *</label>
            <CreatableSingleSelect
              name="containerType"
              defaultValue={container.container_type?.id}
              options={containerTypeOptions}
              placeholder="Type (garage, shelf...)"
              required={true}
            />
          </div>
        )}
        {(!editFields || editFields.includes("parent")) && (
          <div>
            <label className={styles.label}>Parent Container *</label>
            <CreatableSingleSelect
              name="parentId"
              defaultValue={container.parent?.id}
              options={containerNameOptions}
              placeholder="Select container"
              required={true}
            />
          </div>
        )}
      </div>
      <div className={styles.formGrid}>
        {(!editFields || editFields.includes("location")) && (
          <div>
            <label className={styles.label}>Location *</label>
            <CreatableSingleSelect name="location" defaultValue={container.location ?? ""} options={locationOptions} placeholder="Location" required={true} />
          </div>
        )}
        {(!editFields || editFields.includes("tags")) && (
          <div>
            <label className={styles.label}>Tags</label>
            <CreatableSingleSelect name="tags" isMulti defaultValue={container.tags ?? []} options={tagOptions} placeholder="Add or select tags" />
          </div>
        )}
      </div>
      <div className={styles.formGrid}>
        {(!editFields || editFields.includes("unit_cost")) && (
          <div>
            <label className={styles.label}>Unit Cost ($)</label>
            <input name="unitCost" type="number" min="0" step="0.01" defaultValue={container.unit_cost ?? 0} className={styles.input} />
          </div>
        )}
      </div>
      {(!editFields || editFields.includes("notes")) && (
        <div>
          <NotesTextarea defaultValue={container.notes ?? ""} name="notes" label="Notes" maxLength={150} />
        </div>
      )}
    </>
  );
}
