import Link from "next/link";
import { redirect } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { PencilIcon, TrashIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/containers/[containerId]/container-items.module.css";
import { sortContainerOrItems } from "@/app/api/sort-utils";
import FilterSortSection, { filterContainerItems, FilterValues, parseFilterValues } from "@/components/filter-sort-section";
import { getContainerIds, getContainers, getDistinctAttributeValuesFromContainers } from "@/app/services/container-service";
import { getUserId } from "@/app/services/user-service";
import { getChildItems, getDistinctAttributeValuesFromItems } from "@/app/services/item-service";
import SearchableChildrenList from "./searchable-children-list";
import { deleteContainer } from "@/app/actions";
import ConfirmDeleteForm from "@/components/confirm-delete-form";
import { getBackUrl } from "@/app/api/url-utils";

type Props = {
  params: Promise<{ containerId: string }>;
  searchParams: Promise<Partial<FilterValues>>;
};

const defaultFilterValues: FilterValues = {
  itemCategory: "all",
  itemWarranty: "all",
  hasItemImage: "all",
  minValue: -1,
  maxValue: -1,
  sort: "name-asc",
  containerType: "all",
  location: "all",
  tag: "all"
};

type DistinctValues = {
  itemCategories: string[];
  containerTypes: string[];
  locations: string[];
  tags: string[];
};

async function getDistinctValues(supabase: ReturnType<typeof createClient>): Promise<DistinctValues & { error: string | null }> {
  const { containerIds, error: containerIdsError } = await getContainerIds(supabase);
  if (containerIdsError) {
    return { itemCategories: [], containerTypes: [], locations: [], tags: [], error: containerIdsError };
  }

  const [containerValues, itemValues] = await Promise.all([
    getDistinctAttributeValuesFromContainers(containerIds, supabase),
    getDistinctAttributeValuesFromItems(containerIds, supabase)
  ]);

  const uniqueLocations = new Set<string>([...containerValues.distinctValues.location, ...itemValues.distinctValues.location]);
  const uniqueTags = new Set<string>([...containerValues.distinctValues.tags, ...itemValues.distinctValues.tags]);
  return {
    itemCategories: itemValues.distinctValues.item_categories.concat("Uncategorized"),
    containerTypes: containerValues.distinctValues.container_type.concat("Uncategorized"),
    locations: Array.from(uniqueLocations).sort(),
    tags: Array.from(uniqueTags).sort(),
    error: null
  };
}

export default async function ContainerItemsPage({ params, searchParams }: Props) {
  const { containerId } = await params;
  const supabase = createClient();

  const userId = await getUserId(supabase);
  if (!userId) {
    redirect("/sign-in");
  }

  const { filterValues } = parseFilterValues({ filterParams: await searchParams, defaultFilterValues, type: "container" });

  const [{ containers, error: containersError }, { items, error: itemsError }] = await Promise.all([
    getContainers([containerId], supabase, true),
    getChildItems(containerId, supabase)
  ]);
  if (containersError || itemsError) {
    redirect(`/containers?error=Error fetching container data. ${containersError ?? ""} ${itemsError ?? ""}`);
  }
  if (containers.list.length === 0) {
    redirect("/containers?error=Container not found");
  }

  const container = containers.list[0];
  // console.log("Fetched container:", container);

  const allChildren = [...(containers.list[0].child_containers?.children ?? []), ...items];
  console.log(
    `Fetched total ${allChildren.length} children for container ${containerId}. ${containers.list[0].child_containers?.children.length} containers, ${items.length} items`
  );
  const filteredChildren = filterContainerItems(allChildren, filterValues);
  const sortedFilteredChildren = sortContainerOrItems(filteredChildren, filterValues.sort);
  console.log(`After filtering and sorting, ${sortedFilteredChildren.length} children remain for container ${containerId}.`);

  const { itemCategories, tags, containerTypes: allContainerTypes, locations: allLocations } = await getDistinctValues(supabase);

  // only keep values related to child containers and items
  const childContainerTypes = container.child_containers?.children
    .map((c) => (allContainerTypes.includes(c.container_type?.name) && c.container_type?.name) || null)
    .filter((ct) => ct !== null);
  const containerTypes = [...new Set(childContainerTypes)];

  const childLocations = container.child_containers?.children
    .map((c) => (allLocations.includes(c.location ?? "") && c.location) || null)
    .filter((cl) => cl !== null);
  const locations = [...new Set(childLocations)];

  const parentContainerId = container.parent?.id ?? null;
  let backHref = await getBackUrl();
  if (!backHref) {
    backHref = parentContainerId ? `/containers/${parentContainerId}` : "/dashboard";
  }

  return (
    <MobileShell
      title={container.name}
      subtitle={container.tags?.join(", ")}
      activeNav="more"
      backHref={backHref}
      navParams={`parentId=${containerId}`}
      headerActions={
        <>
          <Link href={`/containers/${containerId}/edit`} className={styles.iconBtn} aria-label="Edit">
            <PencilIcon size={15} /> <span className={styles.iconBtnLabel}>Edit</span>
          </Link>
          <ConfirmDeleteForm action={deleteContainer} message={`Are you sure you want to delete container "${container.name}"?`}>
            <input type="hidden" name="id" value={container.id} />
            <button type="submit" className={styles.iconBtn}>
              <TrashIcon size={15} /> <span className={styles.iconBtnLabel}>Delete</span>
            </button>
          </ConfirmDeleteForm>
        </>
      }
    >
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Location</p>
          <p className={styles.statValue}>{container.location ?? "—"}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Type</p>
          <p className={styles.statValue} style={{ fontSize: "0.7rem" }}>
            {container.container_type?.name ?? "—"}
          </p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Items</p>
          <p className={styles.statValue}>
            {container.child_items.total} (${container.child_items.total_cost.toFixed(2)})
          </p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Sub-Containers</p>
          <p className={styles.statValue}>
            {container.child_containers.total} (${container.child_containers.total_cost.toFixed(2)})
          </p>
        </div>
      </div>

      <FilterSortSection
        type="container"
        defaultFilterValues={defaultFilterValues}
        filterParams={filterValues}
        id={containerId}
        itemCategories={itemCategories}
        containerTypes={containerTypes}
        locations={locations}
        tags={tags}
      />

      <SearchableChildrenList childrenList={sortedFilteredChildren} includeEditAction={true} />
    </MobileShell>
  );
}
