import { createClient } from "@/lib/supabase/server";
import type { EntityStatus } from "@/lib/supabase/types";
import { BaseUserResource, getUserId } from "./user-service";

const ACTIVE_STATUS: EntityStatus = "enabled";

type ItemCountResult = { byContainerId: Record<string, { childItemIds: string[]; total: number }>; total: number };

/**
 * Returns item counts keyed by container ID in a single RPC call.
 * Useful for rendering per-container badges on list views.
 */
export const getItemCount = async (containerIds: string[] = [], supabase = createClient()) => {
  const emptyResult: ItemCountResult = { byContainerId: {}, total: 0 };
  let result: { itemCounts: ItemCountResult; error: string | null } = { itemCounts: emptyResult, error: null };
  if (containerIds.length === 0) {
    return result;
  }
  const supabaseClient = await supabase;
  const { data: itemCountByContainer, error: itemCountByContainerError } = await supabaseClient.rpc("get_item_counts_by_container", {
    container_ids: containerIds
  });
  if (itemCountByContainerError) {
    console.error(
      "Error fetching item counts:",
      itemCountByContainerError.message,
      itemCountByContainerError.details,
      itemCountByContainerError.cause,
      itemCountByContainerError.hint,
      itemCountByContainerError.code,
      itemCountByContainerError.stack
    );
    result = { itemCounts: emptyResult, error: itemCountByContainerError.message };
    return result;
  }

  const byContainerId: Record<string, { childItemIds: string[]; total: number }> = {};
  let totalCount = 0;
  for (const row of itemCountByContainer ?? []) {
    byContainerId[row.container_id] = { childItemIds: row.child_item_ids ?? [], total: Number(row.item_count) };
    totalCount += Number(row.item_count);
  }
  result = { itemCounts: { byContainerId, total: totalCount }, error: null };
  return result;
};

type ItemCostResult = { byContainerId: Record<string, { totalCost: number }>; totalCost: number };

export const getItemCost = async (containerIds: string[] = [], supabase = createClient()) => {
  const emptyResult: ItemCostResult = { byContainerId: {}, totalCost: 0 };
  let result: { itemCosts: ItemCostResult; error: string | null } = { itemCosts: emptyResult, error: null };
  if (containerIds.length === 0) {
    return result;
  }
  const supabaseClient = await supabase;
  const { data: itemCostByContainer, error: itemCostByContainerError } = await supabaseClient
    .from("items")
    .select("container_id, unit_cost, quantity")
    .in("container_id", containerIds)
    .eq("status", ACTIVE_STATUS);
  if (itemCostByContainerError) {
    console.error(
      "Error fetching item costs:",
      itemCostByContainerError.message,
      itemCostByContainerError.details,
      itemCostByContainerError.cause,
      itemCostByContainerError.hint,
      itemCostByContainerError.code,
      itemCostByContainerError.stack
    );
    result = { itemCosts: emptyResult, error: itemCostByContainerError.message };
    return result;
  }

  const itemCostsByContainer: ItemCostResult = { byContainerId: {}, totalCost: 0 };
  for (const row of itemCostByContainer ?? []) {
    const totalItemCost = Number(row.unit_cost ?? 0) * Number(row.quantity ?? 1);
    const containerInventoryCost = itemCostsByContainer.byContainerId[row.container_id] ?? { totalCost: 0 };
    containerInventoryCost.totalCost += totalItemCost;
    itemCostsByContainer.byContainerId[row.container_id] = containerInventoryCost;
    itemCostsByContainer.totalCost += totalItemCost;
  }

  result = { itemCosts: itemCostsByContainer, error: null };
  return result;
};

interface ItemImageResource {
  id: string;
  caption: string | null;
  storage_path: string;
  public_url: string;
  updated_at: string;
}

export interface ItemReadResource {
  type: "item";
  id: string;
  name: string;
  category: Pick<ItemCategoryReadResource, "id" | "name"> | null;
  subcategory: string | null;
  location: string | null;
  tags: string[] | null;
  notes: string | null;
  quantity: number | null;
  unit_cost: number | null;
  created_at: string;
  updated_at: string;
  status: EntityStatus;
  images: ItemImageResource[];
  container: { id: string; name: string; location: string | null };
  purchase_date: string | null;
  item_attributes: Record<string, any>;
}

export const getChildItems = async (containerId: string, supabase = createClient()): Promise<{ items: ItemReadResource[]; error: string | null }> => {
  const supabaseClient = await supabase;
  const { data: items, error } = await supabaseClient
    .from("items")
    .select(
      "id, name, category: item_categories!items_category_fkey(id, name), subcategory, location, tags, notes, quantity, unit_cost, created_at, updated_at, status"
    )
    .eq("container_id", containerId)
    .eq("status", ACTIVE_STATUS);

  if (error) {
    console.error("Error fetching child items:", error.message, error.details, error.cause, error.hint, error.code, error.stack);
    return { items: [], error: error.message };
  }

  const itemById: Record<string, ItemReadResource> = {};
  const itemResults: ItemReadResource[] = [];
  for (const item of items ?? []) {
    itemById[item.id] = {
      ...item,
      images: [],
      type: "item",
      container: { id: containerId, name: "-", location: null },
      purchase_date: null,
      item_attributes: {}
    };
    itemResults.push(itemById[item.id]);
  }

  const imageErrorMessages: string[] = [];
  const imageRequests = (items ?? []).map((item) => getImageDetails(item.id, supabase));
  const imageResults = await Promise.all(imageRequests);
  for (const { images, error: imageError } of imageResults) {
    if (imageError) {
      imageErrorMessages.push(imageError);
    }
    for (const image of images) {
      itemById[image.itemId].images.push(image);
    }
  }

  if (imageErrorMessages.length > 0) {
    console.error("Error fetching item images:", imageErrorMessages.join(", "));
    return { items: itemResults, error: imageErrorMessages.join(", ") };
  }

  const totalImages = Object.values(itemById).reduce((acc, item) => acc + item.images.length, 0);
  console.log(`Fetched ${itemResults.length} items for container ${containerId} with ${totalImages} images.`);
  return { items: itemResults, error: null };
};

export const getItemDetails = async (itemId: string, supabase = createClient()): Promise<{ item: ItemReadResource | null; error: string | null }> => {
  const supabaseClient = await supabase;
  const { data: itemData, error } = await supabaseClient
    .from("items")
    .select(
      "id, name, category: item_categories!items_category_fkey(id, name), subcategory, location, tags, notes, quantity, unit_cost, created_at, updated_at, status, container: containers!items_container_id_fkey(id, name, location), purchase_date, item_attributes"
    )
    .eq("id", itemId)
    .eq("status", ACTIVE_STATUS);

  if (error) {
    console.error("Error fetching item details:", error.message, error.details, error.cause, error.hint, error.code, error.stack);
    return { item: null, error: error.message };
  }

  if (!itemData || itemData.length === 0) {
    return { item: null, error: "Item not found" };
  }

  const { images, error: imageError } = await getImageDetails(itemId, supabase);

  if (imageError) {
    console.error("Error fetching item images:", imageError);
    return { item: null, error: imageError };
  }

  const itemDetails: ItemReadResource = {
    type: "item",
    ...itemData[0],
    images: images,
    item_attributes: (itemData[0].item_attributes ?? {}) as Record<string, any>,
    container: itemData[0].container ?? { id: "-", name: "-", location: null }
  };

  return { item: itemDetails, error: null };
};

async function getImageDetails(
  itemId: string,
  supabase = createClient()
): Promise<{ images: (ItemImageResource & { itemId: string })[]; error: string | null }> {
  const supabaseClient = await supabase;
  const { data: images, error: imageError } = await supabaseClient
    .from("item_images")
    .select("id, item_id, storage_path, caption, created_at, updated_at")
    .eq("item_id", itemId)
    .eq("status", ACTIVE_STATUS);

  if (imageError) {
    return { images: [], error: imageError.message };
  }
  if (!images) {
    return { images: [], error: null };
  }
  const imageList: (ItemImageResource & { itemId: string })[] = [];
  for (const image of images) {
    const { data: imagePublicUrl } = supabaseClient.storage.from("item-images").getPublicUrl(image.storage_path);
    imageList.push({
      id: image.id,
      caption: image.caption ?? null,
      storage_path: image.storage_path,
      public_url: imagePublicUrl.publicUrl,
      updated_at: image.updated_at,
      itemId: image.item_id
    });
  }

  return { images: imageList, error: null };
}

export interface ItemCategoryReadResource {
  type: "item_category";
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: BaseUserResource | null;
  updated_at: string;
  updated_by: BaseUserResource | null;
  shared_by: BaseUserResource | null;
}

interface ItemCategoriesResult {
  byName: Record<string, ItemCategoryReadResource>;
  byId: Record<string, ItemCategoryReadResource>;
  byNameCount: number;
  byIdCount: number;
}

export const getItemCategories = async (
  containerIds: string[] = [],
  supabase = createClient()
): Promise<{ itemCategories: ItemCategoriesResult; error: string | null }> => {
  const emptyItemCategories: ItemCategoriesResult = { byName: {}, byId: {}, byNameCount: 0, byIdCount: 0 };
  const userId = await getUserId(supabase);
  if (!userId) {
    return { itemCategories: emptyItemCategories, error: "User not authenticated" };
  }

  const supabaseClient = await supabase;
  const itemCategoriesByContainerQuery = containerIds.length === 0 ? null : supabaseClient
    .from("items")
    .select(
      "id,container:containers!items_container_id_fkey(id, owner:users!containers_owner_user_id_fkey(id, display_name, role)),category:item_categories!items_category_fkey(id, owner_user_id, name, description, created_at, updated_at, created_by:users!item_categories_created_by_fkey(id, display_name, role), updated_by:users!item_categories_updated_by_fkey(id, display_name, role))"
    )
    .in("container_id", containerIds)
    .eq("status", ACTIVE_STATUS)
    .not("category", "is", null);
  const itemCategoriesOwned = supabaseClient
    .from("item_categories")
    .select(
      "id, name, description, created_at, updated_at, created_by:users!item_categories_created_by_fkey(id, display_name, role), updated_by:users!item_categories_updated_by_fkey(id, display_name, role)"
    )
    .eq("owner_user_id", userId);

  const [byContainerResult, ownedResult] = await Promise.all([itemCategoriesByContainerQuery, itemCategoriesOwned]);
  const categoriesByContainer = byContainerResult?.data ?? [];
  const categoriesByContainerError = byContainerResult?.error ?? null;
  const { data: ownedCategories, error: ownedCategoriesError } = ownedResult;

  if (categoriesByContainerError) {
    console.error(
      "Error fetching item categories by container:",
      categoriesByContainerError.message,
      categoriesByContainerError.details,
      categoriesByContainerError.cause,
      categoriesByContainerError.hint,
      categoriesByContainerError.code,
      categoriesByContainerError.stack
    );
    return { itemCategories: emptyItemCategories, error: categoriesByContainerError.message };
  }
  if (ownedCategoriesError) {
    console.error(
      "Error fetching owned item categories:",
      ownedCategoriesError.message,
      ownedCategoriesError.details,
      ownedCategoriesError.cause,
      ownedCategoriesError.hint,
      ownedCategoriesError.code,
      ownedCategoriesError.stack
    );
    return { itemCategories: emptyItemCategories, error: ownedCategoriesError.message };
  }
  const byName = {} as Record<string, ItemCategoryReadResource>;
  const byId = {} as Record<string, ItemCategoryReadResource>;
  let byNameCount = 0;
  let byIdCount = 0;

  for (const ownedCategory of ownedCategories ?? []) {
    const resrource: ItemCategoryReadResource = {
      type: "item_category",
      id: ownedCategory.id,
      name: ownedCategory.name,
      description: ownedCategory.description,
      created_at: ownedCategory.created_at,
      created_by: ownedCategory.created_by,
      updated_at: ownedCategory.updated_at,
      updated_by: ownedCategory.updated_by,
      shared_by: null
    };
    if (!byId[resrource.id]) {
      byId[resrource.id] = resrource;
      byIdCount++;
    }
    const nameKey = resrource.name.toLowerCase();
    if (!byName[nameKey]) {
      byName[nameKey] = resrource;
      byNameCount++;
    }
  }

  for (const item of categoriesByContainer ?? []) {
    if (!item.category) {
      continue;
    }
    const resource: ItemCategoryReadResource = {
      type: "item_category",
      id: item.category.id,
      name: item.category.name,
      description: item.category.description,
      created_at: item.category.created_at,
      created_by: item.category.created_by,
      updated_at: item.category.updated_at,
      updated_by: item.category.updated_by,
      shared_by: item.category.owner_user_id === userId ? null : item.container.owner
    };
    if (!byId[resource.id]) {
      byId[resource.id] = resource;
      byIdCount++;
    }
    const nameKey = resource.name.toLowerCase();
    if (!byName[nameKey]) {
      byName[nameKey] = resource;
      byNameCount++;
    }
  }

  return { itemCategories: { byName, byId, byNameCount, byIdCount }, error: null };
};

type DistinctAttributeValues = {
  item_categories: string[];
  location: string[];
  tags: string[];
  item_category_options: { id: string; name: string }[];
};
export const getDistinctAttributeValuesFromItems = async (
  containerIds: string[],
  supabase = createClient()
): Promise<{ distinctValues: DistinctAttributeValues; error: string | null }> => {
  if (containerIds.length === 0) {
    return { distinctValues: { item_categories: [], location: [], tags: [], item_category_options: [] }, error: null };
  }

  const supabaseClient = await supabase;
  const { data: items, error: itemsError } = await supabaseClient
    .from("items")
    .select("category:item_categories!items_category_fkey(id, name), location, tags, item_attributes")
    .in("container_id", containerIds)
    .eq("status", ACTIVE_STATUS);
  if (itemsError) {
    return { distinctValues: { item_categories: [], location: [], tags: [], item_category_options: [] }, error: itemsError.message };
  }

  type ItemList = Exclude<typeof items, null>;
  type ItemRow = ItemList extends (infer Row)[] ? Row : never;
  const getDistinctValues = (itemList: typeof items, attributeGetter: (c: ItemRow) => undefined | null | string | string[]) => {
    const values = new Set<string>();
    for (const item of itemList ?? []) {
      const attributeValue = attributeGetter(item);
      const valueList = Array.isArray(attributeValue) ? attributeValue : [attributeValue];
      valueList.forEach((val) => val && values.add(val));
    }
    return Array.from(values).sort();
  };
  const distinctValues: DistinctAttributeValues = {
    item_categories: getDistinctValues(items, (c) => c.category?.name),
    location: getDistinctValues(items, (c) => c.location),
    tags: getDistinctValues(items, (c) => c.tags),
    item_category_options: []
  };
  setDistinctCategoryOptions(items, distinctValues);

  return { distinctValues, error: null };
};

function setDistinctCategoryOptions<T extends { category?: { id: string; name: string } | null }>(items: T[], distinctValues: DistinctAttributeValues) {
  const categoryOptionsMap: Record<string, { id: string; name: string }> = {};
  for (const item of items) {
    if (item.category) {
      categoryOptionsMap[item.category.name] = { id: item.category.id, name: item.category.name };
    }
  }
  distinctValues.item_category_options = distinctValues.item_categories.map((name) => categoryOptionsMap[name]);
}
