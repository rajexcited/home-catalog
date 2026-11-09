import Link from "next/link";
import { AnimatedFilterDetails } from "@/components/animated-filter-details";
import { ChevronDownIcon, FilterIcon, XIcon } from "@/components/icons";
import styles from "@/components/filter-sort-section.module.css";
import { ContainerOrItem, containerTypeValue, ITEM_SORT_VALUES, itemCategoryValue, ItemSortValue, itemValue } from "@/app/api/sort-utils";

type SectionType = "item" | "container";
type FilterSortSectionProps = {
  id?: string;
  type: SectionType;
  filterParams: Partial<FilterValues>;
  defaultFilterValues: FilterValues;
  itemCategories: string[];
  containerTypes?: string[];
  locations?: string[];
  tags: string[];
};

const ITEM_WARRANTY_FILTER_VALUES = {
  all: "All",
  "expiring-1m": "Expiring in 1 month",
  expired: "Expired",
  none: "No Warranty"
};
const ITEM_IMAGE_FILTER_VALUES = {
  all: "All",
  with: "With Image",
  without: "Without Image"
};
const SORT_VALUES: Record<SectionType, ItemSortValue[]> = {
  item: [
    "name-asc",
    "name-desc",
    "value-desc",
    "value-asc",
    "qty-desc",
    "qty-asc",
    "warranty-asc",
    "warranty-desc",
    "itemcategory-asc",
    "itemcategory-desc",
    "lastmodified-asc",
    "lastmodified-desc",
    "newest",
    "oldest"
  ],
  container: [
    "name-asc",
    "name-desc",
    "containertype-asc",
    "containertype-desc",
    "location-asc",
    "location-desc",
    "lastmodified-asc",
    "lastmodified-desc",
    "newest",
    "oldest"
    // ],
    // search: [
    //   "name-asc",
    //   "name-desc",
    //   "value-desc",
    //   "value-asc",
    //   "qty-desc",
    //   "qty-asc",
    //   "warranty-asc",
    //   "warranty-desc",
    //   "itemcategory-asc",
    //   "itemcategory-desc",
    //   "containertype-asc",
    //   "containertype-desc",
    //   "location-asc",
    //   "location-desc",
    //   "lastmodified-asc",
    //   "lastmodified-desc",
    //   "newest",
    //   "oldest"
  ]
};

export interface FilterValues {
  itemCategory: string;
  itemWarranty: keyof typeof ITEM_WARRANTY_FILTER_VALUES;
  hasItemImage: keyof typeof ITEM_IMAGE_FILTER_VALUES;
  minValue: number;
  maxValue: number;
  sort: ItemSortValue;
  containerType: string;
  location: string;
  tag: string;
}

export function parseFilterValues(props: Pick<FilterSortSectionProps, "filterParams" | "defaultFilterValues" | "type">): {
  filterValues: FilterValues;
  activeFilterCount: number;
} {
  let activeFilterCount = 0;
  let filterValues: FilterValues = { ...props.filterParams, ...props.defaultFilterValues };

  if (filterValues.itemCategory !== props.defaultFilterValues.itemCategory) {
    activeFilterCount++;
  }
  if (!(filterValues.itemWarranty in ITEM_WARRANTY_FILTER_VALUES)) {
    filterValues.itemWarranty = props.defaultFilterValues.itemWarranty;
  }
  if (filterValues.itemWarranty !== props.defaultFilterValues.itemWarranty) {
    activeFilterCount++;
  }
  if (!(filterValues.hasItemImage in ITEM_IMAGE_FILTER_VALUES)) {
    filterValues.hasItemImage = props.defaultFilterValues.hasItemImage;
  }
  if (filterValues.hasItemImage !== props.defaultFilterValues.hasItemImage) {
    activeFilterCount++;
  }
  if (isNaN(Number(filterValues.minValue))) {
    filterValues.minValue = props.defaultFilterValues.minValue;
  }
  if (filterValues.minValue !== props.defaultFilterValues.minValue) {
    activeFilterCount++;
  }
  if (isNaN(Number(filterValues.maxValue))) {
    filterValues.maxValue = props.defaultFilterValues.maxValue;
  }
  if (filterValues.maxValue !== props.defaultFilterValues.maxValue) {
    activeFilterCount++;
  }

  const allowedSortValues = SORT_VALUES[props.type];
  if (!allowedSortValues.includes(filterValues.sort)) {
    filterValues.sort = props.defaultFilterValues.sort;
  }
  if (filterValues.sort !== props.defaultFilterValues.sort) {
    activeFilterCount++;
  }
  if (filterValues.containerType !== props.defaultFilterValues.containerType) {
    activeFilterCount++;
  }
  if (filterValues.location !== props.defaultFilterValues.location) {
    activeFilterCount++;
  }
  if (filterValues.tag !== props.defaultFilterValues.tag) {
    activeFilterCount++;
  }

  return { filterValues, activeFilterCount };
}

function isEligibleForFilter(item: ContainerOrItem, filterValues: FilterValues): boolean {
  if (filterValues.containerType === "all" && item.type === "container") {
    return true;
  }
  if (containerTypeValue(item) === filterValues.containerType) {
    return true;
  }

  if (filterValues.itemCategory === "all") {
    return item.type === "item";
  }
  if (itemCategoryValue(item) === filterValues.itemCategory) {
    return true;
  }

  if (filterValues.location === "all") {
    return true;
  }

  if (item.location === filterValues.location) {
    return true;
  }
  if (item.tags?.includes(filterValues.tag)) {
    return true;
  }
  if (filterValues.minValue === -1 && filterValues.maxValue === -1) {
    return true;
  }
  const value = itemValue({ quantity: "quantity" in item ? item.quantity : null, unit_cost: item.unit_cost });
  if (filterValues.minValue === -1 && value <= filterValues.maxValue) {
    return true;
  }
  if (filterValues.maxValue === -1 && value >= filterValues.minValue) {
    return true;
  }
  if (value >= filterValues.minValue && value <= filterValues.maxValue) {
    return true;
  }

  if (filterValues.hasItemImage === "all") {
    return true;
  }
  const hasImage = item.type === "item" && item.images.length > 0;
  if (filterValues.hasItemImage === "with" && hasImage) {
    return true;
  }
  if (filterValues.hasItemImage === "without" && !hasImage) {
    return true;
  }

  //   const expiryTs = i.warranty_expiry ? new Date(i.warranty_expiry).getTime() : null;
  //   const hasWarranty = expiryTs !== null && Number.isFinite(expiryTs);
  //   const isExpired = hasWarranty ? expiryTs < now : false;
  //   const isExpiringSoon = hasWarranty ? expiryTs >= now && expiryTs <= now + soonMs : false;
  //   if (filterWarranty === "expiring" && !isExpiringSoon) return false;
  //   if (filterWarranty === "expired" && !isExpired) return false;
  //   if (filterWarranty === "none" && hasWarranty) return false;
  return false;
}

export function filterContainerItems(items: ContainerOrItem[], filterValues: FilterValues): ContainerOrItem[] {
  const filteredItems: ContainerOrItem[] = [];

  console.log(`Filtering ${items.length} items with filter values:`, filterValues);
  for (const item of items) {
    if (isEligibleForFilter(item, filterValues)) {
      filteredItems.push(item);
    }
  }

  return filteredItems;
}

export default async function FilterSortSection(props: FilterSortSectionProps) {
  const { filterValues, activeFilterCount } = parseFilterValues(props);
  const sortMap = SORT_VALUES[props.type].reduce(
    (acc, sortValue) => {
      acc[sortValue] = ITEM_SORT_VALUES[sortValue].title;
      return acc;
    },
    {} as Record<ItemSortValue, string>
  );

  const locationTitle = props.type === "container" ? "Container Location" : "Item Location";
  const sortTitle = props.type === "container" ? "Sort Containers" : "Sort Items";

  return (
    <AnimatedFilterDetails
      summary={
        <>
          <FilterIcon size={16} className={styles.filtersIcon} />
          <span>Sort &amp; Filter</span>
          {activeFilterCount > 0 && <span className={styles.filtersBadge}>{activeFilterCount} active</span>}
          <ChevronDownIcon size={15} className={styles.filtersChevron} />
        </>
      }
    >
      <form method="get" className={styles.controlsForm}>
        <div className={styles.controlsGrid}>
          {props.type === "container" && props.containerTypes && (
            <label className={styles.label}>
              Container Type
              <select name="containerType" defaultValue={filterValues.containerType} className={styles.select}>
                <option value="all">All types</option>
                {props.containerTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className={styles.label}>
            Item Category
            <select name="filterCategory" defaultValue={filterValues.itemCategory} className={styles.select}>
              <option value="all">All categories</option>
              {props.itemCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Warranty
            <select name="filterWarranty" defaultValue={filterValues.itemWarranty} className={styles.select}>
              {Object.entries(ITEM_WARRANTY_FILTER_VALUES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Images
            <select name="filterImage" defaultValue={filterValues.hasItemImage} className={styles.select}>
              {Object.entries(ITEM_IMAGE_FILTER_VALUES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Min Item Value ($)
            <input
              name="minValue"
              type="number"
              min="0"
              step="0.01"
              defaultValue={filterValues.minValue >= 0 ? filterValues.minValue : ""}
              className={styles.input}
              placeholder="No minimum"
            />
          </label>

          <label className={styles.label}>
            Max Item Value ($)
            <input
              name="maxValue"
              type="number"
              min="0"
              step="0.01"
              defaultValue={filterValues.maxValue >= 0 ? filterValues.maxValue : ""}
              className={styles.input}
              placeholder="No maximum"
            />
          </label>

          {props.locations && (
            <label className={styles.label}>
              {locationTitle}
              <select name="location" defaultValue={filterValues.location} className={styles.select}>
                <option value="all">All locations</option>
                {props.locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className={styles.label}>
            {sortTitle}
            <select name="sort" defaultValue={filterValues.sort} className={styles.select}>
              {Object.entries(sortMap).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.controlsActions}>
          <button type="submit" className={styles.btnPrimary}>
            <FilterIcon size={15} />
            Apply
          </button>
          {props.type === "container" && props.id && (
            <Link href={`/containers/${props.id}`} className={styles.btnSecondary}>
              <XIcon size={15} />
              Reset
            </Link>
          )}
          {props.type === "item" && props.id && (
            <Link href={`/items/${props.id}`} className={styles.btnSecondary}>
              <XIcon size={15} />
              Reset
            </Link>
          )}
        </div>
      </form>
    </AnimatedFilterDetails>
  );
}
