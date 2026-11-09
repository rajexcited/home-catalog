import { ContainerReadResource } from "../services/container-service";
import { ItemReadResource } from "../services/item-service";

// type SortableItem = {
//   name: string;
//   quantity: number | null;
//   unit_cost: number | null;
//   created_at: string;
//   updated_at: string;
//   category: string | null;
//   type: string | null;
//   location: string | null;
//   warranty: string | null;
// };

type CompareFn<T> = (a: T, b: T) => number;
export type ContainerOrItem = ContainerReadResource | ItemReadResource;

const normalizeText = (value: string | null | undefined, fallback = "uncategorized") => (value ?? fallback).toLowerCase();
const toTimestamp = (value: string) => new Date(value).getTime();

export function containerTypeValue(c: ContainerOrItem): string | null {
  if (c.type === "container") {
    return c.container_type.name;
  }
  return null;
}

export function itemCategoryValue(i: ContainerOrItem): string | null {
  if (i.type === "item") {
    return i.category?.name ?? null;
  }
  return null;
}

export function itemValue(ic: any): number {
  const qnt = getQuantity(ic);
  const cost = Number(ic.unit_cost ?? 0);
  return qnt * cost;
}

function getQuantity(i: any): number {
  if (i.type === "item") {
    return i.quantity ?? 1;
  }
  return 1;
}

const reverse =
  <T>(compareFn: CompareFn<T>): CompareFn<T> =>
  (a, b) =>
    compareFn(b, a);

const compareBy = {
  name: <T extends { name: string }>(a: T, b: T) => normalizeText(a.name).localeCompare(normalizeText(b.name)),
  value: <T extends { unit_cost: number | null }>(a: T, b: T) => itemValue(a) - itemValue(b),
  quantity: <T extends { quantity: number | null }>(a: T, b: T) => getQuantity(a) - getQuantity(b),
  warranty: <T extends { warranty: string | null }>(a: T, b: T) => normalizeText(a.warranty).localeCompare(normalizeText(b.warranty)),
  createdAt: <T extends { created_at: string }>(a: T, b: T) => toTimestamp(a.created_at) - toTimestamp(b.created_at),
  updatedAt: <T extends { updated_at: string }>(a: T, b: T) => toTimestamp(a.updated_at) - toTimestamp(b.updated_at),
  category: <T extends { category: string | null }>(a: T, b: T) => normalizeText(a.category).localeCompare(normalizeText(b.category)),
  containerType: <T extends { type: string | null }>(a: T, b: T) => normalizeText(a.type).localeCompare(normalizeText(b.type)),
  location: <T extends { location: string | null }>(a: T, b: T) => normalizeText(a.location).localeCompare(normalizeText(b.location))
};

export type ItemSortValue =
  | "name-asc"
  | "name-desc"
  | "value-asc"
  | "value-desc"
  | "qty-asc"
  | "qty-desc"
  | "warranty-asc"
  | "warranty-desc"
  | "itemcategory-asc"
  | "itemcategory-desc"
  | "containertype-asc"
  | "containertype-desc"
  | "location-asc"
  | "location-desc"
  | "lastmodified-asc"
  | "lastmodified-desc"
  | "newest"
  | "oldest";

type ItemSortOption<T = any> = {
  title: string;
  nestedSortValue: ItemSortValue | null;
  compareFn: CompareFn<T>;
};

export const ITEM_SORT_VALUES: Record<ItemSortValue, ItemSortOption> = {
  "name-asc": { title: "Name A-Z", nestedSortValue: null, compareFn: compareBy.name },
  "name-desc": { title: "Name Z-A", nestedSortValue: null, compareFn: reverse(compareBy.name) },
  "value-asc": { title: "Value low-high", nestedSortValue: "newest", compareFn: compareBy.value },
  "value-desc": { title: "Value high-low", nestedSortValue: "oldest", compareFn: reverse(compareBy.value) },
  "qty-asc": { title: "Quantity low-high", nestedSortValue: "name-asc", compareFn: compareBy.quantity },
  "qty-desc": { title: "Quantity high-low", nestedSortValue: "name-desc", compareFn: reverse(compareBy.quantity) },
  "warranty-asc": { title: "Warranty A-Z", nestedSortValue: "name-asc", compareFn: compareBy.warranty },
  "warranty-desc": { title: "Warranty Z-A", nestedSortValue: "name-desc", compareFn: reverse(compareBy.warranty) },
  "itemcategory-asc": { title: "Category A-Z", nestedSortValue: "name-asc", compareFn: compareBy.category },
  "itemcategory-desc": { title: "Category Z-A", nestedSortValue: "name-desc", compareFn: reverse(compareBy.category) },
  "containertype-asc": { title: "Type A-Z", nestedSortValue: "name-asc", compareFn: compareBy.containerType },
  "containertype-desc": { title: "Type Z-A", nestedSortValue: "name-desc", compareFn: reverse(compareBy.containerType) },
  "location-asc": { title: "Location A-Z", nestedSortValue: "name-asc", compareFn: compareBy.location },
  "location-desc": { title: "Location Z-A", nestedSortValue: "name-desc", compareFn: reverse(compareBy.location) },
  "lastmodified-asc": { title: "Last modified oldest", nestedSortValue: "newest", compareFn: compareBy.updatedAt },
  "lastmodified-desc": { title: "Last modified newest", nestedSortValue: "oldest", compareFn: reverse(compareBy.updatedAt) },
  newest: { title: "Newest added", nestedSortValue: "name-asc", compareFn: reverse(compareBy.createdAt) },
  oldest: { title: "Oldest added", nestedSortValue: "name-desc", compareFn: compareBy.createdAt }
};

export function sortContainerOrItems(items: ContainerOrItem[], sortValue: ItemSortValue): ContainerOrItem[] {
  const sortChain: ItemSortValue[] = [];
  const visited = new Set<ItemSortValue>();

  let currentSortValue: ItemSortValue | null = sortValue;
  while (currentSortValue && !visited.has(currentSortValue)) {
    sortChain.push(currentSortValue);
    visited.add(currentSortValue);
    currentSortValue = ITEM_SORT_VALUES[currentSortValue].nestedSortValue;
  }

  return [...items].sort((a, b) => {
    for (const chainSortValue of sortChain) {
      const comparison = ITEM_SORT_VALUES[chainSortValue].compareFn(a, b);
      if (comparison !== 0) {
        // no need to continue the chain since sort order is already determined
        return comparison;
      }
    }
    return 0;
  });
}
