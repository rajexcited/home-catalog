import Link from "next/link";
import { redirect } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { SearchIcon, FilterIcon, FolderIcon, BoxIcon } from "@/components/icons";
import { SearchPendingIndicator } from "./search-pending-indicator";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/search/search.module.css";
import { getUserId } from "../services/user-service";
import { getContainerIds, getDistinctAttributeValuesFromContainers } from "../services/container-service";
import { getItemCount, ItemCategoryReadResource, getDistinctAttributeValuesFromItems } from "../services/item-service";
import FilterSortSection, { FilterValues } from "@/components/filter-sort-section";
import { ItemSortValue } from "../api/sort-utils";

type SearchParams = {
  q?: string;
  tab?: string;
  within?: string;
  containerType?: string;
  itemCategory?: string;
  location?: string;
  sort?: string;
  page?: string;
  page_size?: string;
};

type Props = { searchParams: Promise<SearchParams> };

type BasicDetailType = {
  id: string;
  name: string;
};

type SearchResultItem = {
  id: string;
  name: string;
  category: BasicDetailType | null;
  location: string | null;
  quantity: number | null;
  unit_cost: number | null;
  container: BasicDetailType;
};

type SearchResultContainer = {
  id: string;
  name: string;
  container_type: BasicDetailType;
  location: string | null;
  unit_cost: number | null;
  parent: BasicDetailType | null;
  item_count: number;
};

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

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

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const clampPageSize = (value: number) => Math.min(Math.max(value, 1), MAX_PAGE_SIZE);

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const tabId = params.tab === "containers" ? "container" : "item";
  const within = params.within;
  const containerType = params.containerType;
  const itemCategory = params.itemCategory;
  const location = params.location;
  const sort = (params.sort ?? "name-asc") as ItemSortValue;
  const page = parsePositiveInt(params.page, 1);
  const pageSize = clampPageSize(parsePositiveInt(params.page_size, DEFAULT_PAGE_SIZE));
  const rangeStart = (page - 1) * pageSize;
  const rangeEnd = rangeStart + pageSize - 1;

  const supabase = createClient();
  const supabaseClient = await supabase;
  const userId = await getUserId(supabase);
  if (!userId) {
    redirect("/sign-in");
  }

  const buildQueryParams = (next: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const merged: SearchParams = {
      q,
      tab: tabId === "container" ? "containers" : "items",
      within,
      containerType,
      itemCategory,
      location,
      sort,
      page: String(page),
      page_size: String(pageSize),
      ...next
    };
    if (merged.q) params.set("q", merged.q);
    if (merged.within) params.set("within", merged.within);
    if (merged.tab) params.set("tab", merged.tab);
    if (merged.containerType) params.set("containerType", merged.containerType);
    if (merged.itemCategory) params.set("itemCategory", merged.itemCategory);
    if (merged.location) params.set("location", merged.location);
    if (merged.sort) params.set("sort", merged.sort);
    const nextPage = parsePositiveInt(merged.page, 1);
    if (nextPage > 1) params.set("page", String(nextPage));
    const nextPageSize = clampPageSize(parsePositiveInt(merged.page_size, DEFAULT_PAGE_SIZE));
    if (nextPageSize !== DEFAULT_PAGE_SIZE) params.set("page_size", String(nextPageSize));
    return params.toString();
  };

  const { itemCategories, tags, containerTypes: allContainerTypes, locations: allLocations } = await getDistinctValues(supabase);

  const { containerIds, error: containerIdsError } = await getContainerIds(supabase);

  let searchError: string | null = containerIdsError;
  let pageItems: SearchResultItem[] = [];
  let pageContainers: SearchResultContainer[] = [];
  let totalItemCount = 0;
  let totalContainerCount = 0;

  if (!searchError && containerIds.length > 0) {
    if (tabId === "item") {
      let countQuery = supabaseClient.from("items").select("id", { count: "exact", head: true }).eq("status", "enabled").in("container_id", containerIds);
      let dataQuery = supabaseClient
        .from("items")
        .select("id, name, category: item_categories(id, name), location, quantity, unit_cost, container:containers(id,name)")
        .eq("status", "enabled")
        .in("container_id", containerIds)
        .order("name");

      if (q) {
        countQuery = countQuery.ilike("name", `%${q}%`);
        dataQuery = dataQuery.ilike("name", `%${q}%`);
      }
      if (within) {
        countQuery = countQuery.eq("container_id", within);
        dataQuery = dataQuery.eq("container_id", within);
      }

      const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([countQuery, dataQuery.range(rangeStart, rangeEnd)]);
      totalItemCount = count ?? 0;
      if (countError || dataError) {
        searchError = countError?.message ?? dataError?.message ?? "Search failed";
      } else {
        pageItems = (data ?? []) as SearchResultItem[];
      }
    } else {
      let countQuery = supabaseClient.from("containers").select("id", { count: "exact", head: true }).eq("status", "enabled").in("id", containerIds);
      let dataQuery = supabaseClient
        .from("containers")
        .select("id, name, container_type: container_types(id, name), location, unit_cost, parent:parent_id(id,name)")
        .eq("status", "enabled")
        .in("id", containerIds)
        .order("name");

      if (q) {
        countQuery = countQuery.ilike("name", `%${q}%`);
        dataQuery = dataQuery.ilike("name", `%${q}%`);
      }
      if (within) {
        countQuery = countQuery.eq("parent_id", within);
        dataQuery = dataQuery.eq("parent_id", within);
      }

      const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([countQuery, dataQuery.range(rangeStart, rangeEnd)]);
      totalContainerCount = count ?? 0;
      if (countError || dataError) {
        searchError = countError?.message ?? dataError?.message ?? "Search failed";
      } else {
        const rows = data ?? [];
        const rangedContainerIds = rows.map((row) => row.id);
        const { itemCounts, error: itemCountError } = await getItemCount(rangedContainerIds, supabase);
        if (itemCountError) {
          searchError = itemCountError;
        } else {
          pageContainers = rows.map((row) => ({
            ...row,
            parent: row.parent,
            item_count: itemCounts.byContainerId[row.id]?.total ?? 0
          }));
        }
      }
    }
  }

  const activeTotalCount = tabId === "item" ? totalItemCount : totalContainerCount;
  const hasPrevPage = page > 1;
  const hasNextPage = page * pageSize < activeTotalCount;

  return (
    <MobileShell title="Search" activeNav="search">
      <form method="get" className={styles.searchWrap}>
        <SearchIcon size={16} style={{ flexShrink: 0, color: "#94a3b8" }} />
        <input name="q" defaultValue={q} placeholder="Search items, containers, tags…" className={styles.searchInput} autoComplete="off" />
        <SearchPendingIndicator />
        {within && <input type="hidden" name="within" value={within} />}
        <input type="hidden" name="tab" value={tabId === "container" ? "containers" : "items"} />
        {containerType && <input type="hidden" name="containerType" value={containerType} />}
        {itemCategory && <input type="hidden" name="itemCategory" value={itemCategory} />}
        {location && <input type="hidden" name="location" value={location} />}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {q && (
          <Link href={`/search?${buildQueryParams({ q: "", page: "1" })}`} className={styles.searchClear}>
            ×
          </Link>
        )}
      </form>

      <FilterSortSection
        type={tabId}
        defaultFilterValues={defaultFilterValues}
        filterParams={{ containerType, itemCategory, location, sort }}
        itemCategories={itemCategories}
        containerTypes={allContainerTypes}
        locations={allLocations}
        tags={[]}
      />

      <div className={styles.toggleRow}>
        <Link href={`?${buildQueryParams({ tab: "items", page: "1" })}`} className={`${styles.toggleBtn}${tabId === "item" ? " " + styles.toggleActive : ""}`}>
          Items
        </Link>
        <Link
          href={`?${buildQueryParams({ tab: "containers", page: "1" })}`}
          className={`${styles.toggleBtn}${tabId === "container" ? " " + styles.toggleActive : ""}`}
        >
          Containers
        </Link>
      </div>

      {searchError && <p className={styles.toastErr}>{searchError}</p>}

      {/* {within && withinRes.data && (
        <div className={styles.scopeRow}>
          <span>Within:</span>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>{withinRes.data.name}</span>
          <Link href={`/search?${buildQueryParams({ page: "1" })}`} className={styles.scopeLink}>
            Change
          </Link>
        </div>
      )} */}

      {tabId === "item" && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Items ({totalItemCount})</h2>
          <ul className={styles.resultList}>
            {totalItemCount === 0 && <p className={styles.empty}>{q ? `No items matching "${q}"` : "Type to search items."}</p>}
            {pageItems.map((item) => (
              <li key={item.id}>
                <Link href={`/items/${item.id}`} className={styles.resultItem}>
                  <span className={styles.resultThumbPlaceholder}>
                    <BoxIcon size={18} />
                  </span>
                  <div>
                    <p className={styles.resultName}>{item.name}</p>
                    <p className={styles.resultMeta}>within {item.container.name}</p>
                    <p className={styles.resultMeta}>
                      {item.category?.name ?? "Uncategorized"}
                      {item.location ? ` · ${item.location}` : ""}
                      {item.quantity != null ? ` · Qty: ${item.quantity}` : ""}
                    </p>
                  </div>
                  <span className={styles.resultRight} style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                    ${Number(item.unit_cost ?? 0).toFixed(2)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tabId === "container" && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Containers ({totalContainerCount})</h2>
          <ul className={styles.resultList}>
            {totalContainerCount === 0 && <p className={styles.empty}>{q ? `No containers matching "${q}"` : "Type to search containers."}</p>}
            {pageContainers.map((container) => (
              <li key={container.id}>
                <Link href={`/containers/${container.id}`} className={styles.resultItem}>
                  <span className={styles.resultThumbPlaceholder}>
                    <FolderIcon size={18} />
                  </span>
                  <div>
                    <p className={styles.resultName}>{container.name}</p>
                    <p className={styles.resultMeta}>{container.parent ? ` within ${container.parent.name}` : "Top Level"}</p>
                    <p className={styles.resultMeta}>
                      {container.container_type.name ?? "Container"}
                      {container.location ? ` · ${container.location}` : ""}
                      {container.item_count != null ? ` · Items: ${container.item_count}` : ""}
                    </p>
                  </div>
                  <span className={styles.resultRight} style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                    ${Number(container.unit_cost ?? 0).toFixed(2)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeTotalCount > 0 && (
        <section className={styles.pagination}>
          {hasPrevPage ? (
            <Link href={`?${buildQueryParams({ page: String(page - 1) })}`} className={styles.btnSecondary}>
              Previous
            </Link>
          ) : (
            <span className={styles.paginationSpacer} />
          )}
          <span className={styles.pageLabel}>Page {page}</span>
          {hasNextPage ? (
            <Link href={`?${buildQueryParams({ page: String(page + 1) })}`} className={styles.btnSecondary}>
              Next
            </Link>
          ) : (
            <span className={styles.paginationSpacer} />
          )}
        </section>
      )}
    </MobileShell>
  );
}
