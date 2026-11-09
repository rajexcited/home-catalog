import { createClient } from "@/lib/supabase/server";
import { BaseUserResource, getUserId } from "./user-service";
import type { EntityStatus } from "@/lib/supabase/types";
import { getItemCost, getItemCount } from "./item-service";

const ACTIVE_STATUS: EntityStatus = "enabled";

const getVisibleContainerIdsFallback = async (supabaseClient: Awaited<ReturnType<typeof createClient>>, userId: string, statusFilters: EntityStatus[]) => {
  const ids = new Set<string>();

  const { data: ownedRows, error: ownedError } = await supabaseClient.from("containers").select("id").eq("owner_user_id", userId).in("status", statusFilters);

  if (ownedError) {
    return { error: ownedError.message, containerIds: [] as string[] };
  }

  (ownedRows ?? []).forEach((row) => ids.add(row.id));

  const { data: shareRows, error: shareError } = await supabaseClient
    .from("container_shares")
    .select("container_id")
    .eq("shared_with_user_id", userId)
    .eq("status", "active");

  if (shareError) {
    return { error: shareError.message, containerIds: [] as string[] };
  }

  const sharedRootIds = Array.from(new Set((shareRows ?? []).map((row) => row.container_id)));
  if (sharedRootIds.length > 0) {
    const { data: sharedContainers, error: sharedContainersError } = await supabaseClient
      .from("containers")
      .select("id")
      .in("id", sharedRootIds)
      .in("status", statusFilters);

    if (sharedContainersError) {
      return { error: sharedContainersError.message, containerIds: [] as string[] };
    }

    (sharedContainers ?? []).forEach((row) => ids.add(row.id));
  }

  // Traverse all descendants for both owned and shared roots.
  let frontier = Array.from(ids);
  while (frontier.length > 0) {
    const { data: children, error: childrenError } = await supabaseClient.from("containers").select("id").in("parent_id", frontier).in("status", statusFilters);

    if (childrenError) {
      return { error: childrenError.message, containerIds: [] as string[] };
    }

    const next = (children ?? []).map((row) => row.id).filter((id) => !ids.has(id));
    next.forEach((id) => ids.add(id));
    frontier = next;
  }

  return { containerIds: Array.from(ids), error: null };
};

const getSharedContainerIds = async (supabase = createClient()) => {
  const supabaseClient = await supabase;
  const userId = await getUserId(supabase);
  if (!userId) {
    return { error: "User not authenticated", sharedContainerIds: [] as string[] };
  }
  const { data: sharedRows, error: sharedRowsError } = await supabaseClient
    .from("container_shares")
    .select("container_id")
    .eq("shared_with_user_id", userId)
    .eq("status", "active");

  if (sharedRowsError) {
    return { error: sharedRowsError.message, sharedContainerIds: [] as string[] };
  }
  const sharedContainerIds = Array.from(new Set((sharedRows ?? []).map((row) => row.container_id)));
  return { sharedContainerIds, error: null };
};

export const getContainerIds = async (supabase = createClient(), statusFilters: EntityStatus[] = [ACTIVE_STATUS], range?: { start: number; end: number }) => {
  const supabaseClient = await supabase;
  const userId = await getUserId(supabase);
  if (!userId) {
    return { error: "User not authenticated", containerIds: [] as string[] };
  }

  // Preferred path: single RPC resolves owned + shared + all descendants.
  const { data: visibleIds, error: rpcError } = await supabaseClient.rpc("get_visible_container_ids", {
    p_user_id: userId,
    status_filters: statusFilters,
    range_start: range?.start,
    range_end: range?.end
  });

  if (rpcError) {
    console.error("Error fetching visible container IDs:", rpcError.message, rpcError.details, rpcError.cause, rpcError.hint, rpcError.code, rpcError.stack);
    // Fallback for environments where migration/function is not yet applied.
    if (rpcError.message.includes("Could not find the function public.get_visible_container_ids")) {
      return getVisibleContainerIdsFallback(supabaseClient, userId, statusFilters);
    }
    return { error: rpcError.message, containerIds: [] as string[] };
  }

  const containerIds = Array.from(new Set((visibleIds ?? []).map((r) => r.id)));
  return { containerIds, error: null };
};

type ChildContainerIdsResult = { childContainerIds: string[]; total: number };
type ContainerCountResult = { byParentId: Record<string, ChildContainerIdsResult>; total: number };

const getChildContainerIds = async (containerIds: string[] | null = null, supabase = createClient()) => {
  const emptyResult: ContainerCountResult = { byParentId: {}, total: 0 };
  if (containerIds === null) {
    return { containerCount: emptyResult, error: null };
  }
  if (containerIds.length === 0) {
    const { containerIds: ids, error } = await getContainerIds(supabase);
    if (error) {
      return { containerCount: emptyResult, error };
    }
    containerIds = ids;
  }

  const supabaseClient = await supabase;
  const { data: childRows, error: childCountsError } = await supabaseClient.from("containers").select("id, parent_id").in("parent_id", containerIds);

  if (childCountsError) {
    console.error(
      "Error fetching child container counts:",
      childCountsError.message,
      childCountsError.details,
      childCountsError.cause,
      childCountsError.hint,
      childCountsError.code,
      childCountsError.stack
    );
    return { containerCount: emptyResult, error: childCountsError.message };
  }

  const parentContainerIdMap: Record<string, Set<string>> = {};
  for (const row of childRows ?? []) {
    const parentId = row.parent_id ?? "null";
    const containerSet = (parentContainerIdMap[parentId] = parentContainerIdMap[parentId] ?? new Set<string>());
    containerSet.add(row.id);
  }

  let totalCount = 0;
  const byParentId: Record<string, ChildContainerIdsResult> = {};

  for (const parentId of containerIds) {
    const childContainerIds = Array.from(parentContainerIdMap[parentId] ?? []);
    const totalChildren = childContainerIds.length;
    byParentId[parentId] = { childContainerIds, total: totalChildren };
    totalCount += totalChildren;
  }

  const containerCount: ContainerCountResult = { byParentId, total: totalCount };
  return { containerCount, error: null };
};

type ContainerCostResult = { byParentId: Record<string, { totalCost: number }>; totalCost: number };

const getChildContainerCosts = async (parentContainerIds: string[], supabase = createClient()) => {
  const emptyResult: ContainerCostResult = { byParentId: {}, totalCost: 0 };
  if (parentContainerIds.length === 0) {
    return { containerCost: emptyResult, error: null };
  }

  const parentIdsSet = new Set(parentContainerIds);
  const supabaseClient = await supabase;
  const { data: childContainers, error: childContainerCostError } = await supabaseClient
    .from("containers")
    .select("id, parent_id, unit_cost")
    .in("parent_id", Array.from(parentIdsSet));

  if (childContainerCostError) {
    console.error(
      "Error fetching child container costs:",
      childContainerCostError.message,
      childContainerCostError.details,
      childContainerCostError.cause,
      childContainerCostError.hint,
      childContainerCostError.code,
      childContainerCostError.stack
    );
    return { containerCost: emptyResult, error: childContainerCostError.message };
  }

  const containerCostsByParent: ContainerCostResult = { byParentId: {}, totalCost: 0 };
  for (const childContainer of childContainers ?? []) {
    const parentId = childContainer.parent_id ?? "null";
    const containerCostResult = (containerCostsByParent.byParentId[parentId] = containerCostsByParent.byParentId[parentId] ?? { totalCost: 0 });
    containerCostResult.totalCost += childContainer.unit_cost ?? 0;
    containerCostsByParent.totalCost += childContainer.unit_cost ?? 0;
  }

  return { containerCost: containerCostsByParent, error: null };
};

type BaseContainerResource = { id: string; name: string };
type BaseContainerTypeResource = { id: string; name: string };

export interface ContainerReadResource {
  type: "container";
  id: string;
  parent: BaseContainerResource | null;
  owner_user_id: string | null;
  name: string;
  container_type: BaseContainerTypeResource;
  location: string | null;
  tags: string[];
  notes: string;
  unit_cost: number | null;
  priority: number | null;
  status: EntityStatus;
  created_at: string;
  created_by: BaseUserResource | null;
  updated_at: string;
  updated_by: BaseUserResource | null;
  status_changed_at: string | null;
  status_changed_by: BaseUserResource | null;
  status_changed_reason: string | null;
  child_items: { ids: string[]; total: number; total_cost: number };
  child_containers: { ids: string[]; total: number; total_cost: number; children: ContainerReadResource[] };
  permission: "read" | "write";
  shared_by: BaseUserResource | null; // List of users with whom the container is shared
  shared_at: string | null; // Timestamp when the container was shared
}

interface ContainerResult {
  byId: Record<string, ContainerReadResource>;
  list: ContainerReadResource[];
}

const getContainersOld = async (supabase = createClient(), range = { start: 0, end: 10 }, statusFilter: EntityStatus = ACTIVE_STATUS) => {
  const emptyResult: ContainerResult = { byId: {}, list: [] };
  const { containerIds, error: containerIdsError } = await getContainerIds(supabase, [statusFilter], range);
  if (containerIdsError) {
    return { containers: emptyResult, error: containerIdsError };
  }
  const byId = {} as Record<string, ContainerReadResource>;
  const list = [] as ContainerReadResource[];
  const supabaseClient = await supabase;
  const { data: containers, error: containersError } = await supabaseClient
    .from("containers")
    .select(
      "id, parent_id, owner_user_id, name, location, tags, notes, unit_cost, priority, status, created_at, updated_at, status_changed_at, status_changed_reason,container_type: container_types(id, name), created_by: users!containers_created_by_fkey(id, display_name, role), updated_by: users!containers_updated_by_fkey(id, display_name, role), status_changed_by: users!containers_status_changed_by_fkey(id, display_name, role)"
    )
    .in("id", containerIds);
  if (containersError) {
    return { containers: emptyResult, error: containersError.message };
  }

  const parentIds = Array.from(new Set((containers ?? []).map((container) => container.parent_id).filter((parentId): parentId is string => Boolean(parentId))));
  const parentMap = new Map<string, BaseContainerResource>();
  if (parentIds.length > 0) {
    const { data: parents, error: parentsError } = await supabaseClient.from("containers").select("id, name").in("id", parentIds);
    if (parentsError) {
      return { containers: emptyResult, error: parentsError.message };
    }
    for (const parent of parents ?? []) {
      parentMap.set(parent.id, { id: parent.id, name: parent.name });
    }
  }

  for (const container of containers ?? []) {
    if (container.id) {
      const containerParent = container.parent_id ? (parentMap.get(container.parent_id) ?? null) : null;
      const localContainer: ContainerReadResource = {
        type: "container",
        id: container.id,
        parent: containerParent,
        owner_user_id: container.owner_user_id,
        name: container.name,
        container_type: container.container_type,
        location: container.location,
        tags: container.tags || [],
        notes: container.notes,
        unit_cost: container.unit_cost,
        priority: container.priority,
        status: container.status,
        created_at: container.created_at,
        created_by: container.created_by,
        updated_at: container.updated_at,
        updated_by: container.updated_by,
        status_changed_at: container.status_changed_at,
        status_changed_by: container.status_changed_by,
        status_changed_reason: container.status_changed_reason,
        child_items: { ids: [], total: 0, total_cost: 0 },
        child_containers: { ids: [], total: 0, total_cost: 0, children: [] },
        permission: "write", // Default permission, can be updated based on shared info
        shared_by: null, // This will be populated if the container is shared
        shared_at: null // This will be populated if the container is shared
      };
      byId[container.id] = localContainer;
      list.push(localContainer);
    }
  }
  return { containers: { byId, list }, error: null };
};

export const getContainers = async (containerIds: string[], supabase = createClient(), withChildren = false) => {
  const emptyResult: ContainerResult = { byId: {}, list: [] };

  if (containerIds.length === 0) {
    return { containers: emptyResult, error: null };
  }

  const byId = {} as Record<string, ContainerReadResource>;
  const list = [] as ContainerReadResource[];
  const supabaseClient = await supabase;
  const containersQuery = supabaseClient
    .from("containers")
    .select(
      "id, parent_id, owner_user_id, name, location, tags, notes, unit_cost, priority, status, created_at, updated_at, status_changed_at, status_changed_reason,container_type: container_types(id, name), created_by: users!containers_created_by_fkey(id, display_name, role), updated_by: users!containers_updated_by_fkey(id, display_name, role), status_changed_by: users!containers_status_changed_by_fkey(id, display_name, role)"
    )
    .in("id", containerIds);

  const itemCountRequest = getItemCount(containerIds, supabase);
  const itemCostRequest = getItemCost(containerIds, supabase);
  const childContainerCountRequest = getChildContainerIds(containerIds, supabase);
  const childContainerCostRequest = getChildContainerCosts(containerIds, supabase);

  const [
    { data: containers, error: containersError },
    { itemCounts, error: itemCountsError },
    { itemCosts, error: itemCostsError },
    { containerCount: childContainerCount, error: childContainerCountError },
    { containerCost: childContainerCost, error: childContainerCostError }
  ] = await Promise.all([containersQuery, itemCountRequest, itemCostRequest, childContainerCountRequest, childContainerCostRequest]);

  if (containersError) {
    console.error(
      "Error fetching containers:",
      containersError.message,
      containersError.details,
      containersError.cause,
      containersError.hint,
      containersError.code,
      containersError.stack
    );
    return { containers: emptyResult, error: containersError.message };
  }
  if (itemCountsError) {
    return { containers: emptyResult, error: itemCountsError };
  }
  if (itemCostsError) {
    return { containers: emptyResult, error: itemCostsError };
  }
  if (childContainerCountError) {
    return { containers: emptyResult, error: childContainerCountError };
  }
  if (childContainerCostError) {
    return { containers: emptyResult, error: childContainerCostError };
  }

  const parentIds = Array.from(new Set((containers ?? []).map((container) => container.parent_id).filter((parentId): parentId is string => Boolean(parentId))));
  const parentMap = new Map<string, BaseContainerResource>();
  if (parentIds.length > 0) {
    const { data: parents, error: parentsError } = await supabaseClient.from("containers").select("id, name").in("id", parentIds);
    if (parentsError) {
      return { containers: emptyResult, error: parentsError.message };
    }
    for (const parent of parents ?? []) {
      parentMap.set(parent.id, { id: parent.id, name: parent.name });
    }
  }

  const childContainerRequests: Promise<{ containers: ContainerResult; error: string | null }>[] = [];
  const childContainerIds: Set<string> = new Set();

  for (const container of containers ?? []) {
    if (container.id) {
      const containerParent = container.parent_id ? (parentMap.get(container.parent_id) ?? null) : null;
      const mergedContainer: ContainerReadResource = {
        type: "container",
        id: container.id,
        parent: containerParent,
        owner_user_id: container.owner_user_id,
        name: container.name,
        container_type: container.container_type,
        location: container.location,
        tags: container.tags || [],
        notes: container.notes,
        unit_cost: container.unit_cost,
        priority: container.priority,
        status: container.status,
        created_at: container.created_at,
        created_by: container.created_by,
        updated_at: container.updated_at,
        updated_by: container.updated_by,
        status_changed_at: container.status_changed_at,
        status_changed_by: container.status_changed_by,
        status_changed_reason: container.status_changed_reason,
        child_items: {
          ids: itemCounts.byContainerId[container.id]?.childItemIds ?? [],
          total: itemCounts.byContainerId[container.id]?.total ?? 0,
          total_cost: itemCosts.byContainerId[container.id]?.totalCost ?? 0
        },
        child_containers: {
          ids: childContainerCount.byParentId[container.id]?.childContainerIds ?? [],
          total: childContainerCount.byParentId[container.id]?.total || 0,
          total_cost: childContainerCost.byParentId[container.id]?.totalCost ?? 0,
          children: []
        },
        permission: "write", // Default permission, can be updated based on shared info
        shared_by: null, // This will be populated if the container is shared
        shared_at: null // This will be populated if the container is shared
      };
      byId[container.id] = mergedContainer;
      list.push(mergedContainer);
      if (withChildren) {
        childContainerRequests.push(getContainers(mergedContainer.child_containers.ids, supabase, false));
      } else {
        // If not fetching children, we can set total_cost for child_containers
        mergedContainer.child_containers.ids.forEach((id) => childContainerIds.add(id));
      }
    }
  }

  const childContainerInventoryCostRequests = getItemCost(Array.from(childContainerIds), supabase);

  const [childContainerResults, { itemCosts: childContainerInventoryCost, error: childContainerInventoryCostError }] = await Promise.all([
    Promise.all(childContainerRequests),
    childContainerInventoryCostRequests
  ]);
  const childContainerErrors = childContainerResults.filter((result) => result.error !== null).map((result) => result.error);
  if (childContainerErrors.length > 0) {
    console.error("Error fetching child containers:", childContainerErrors);
    return { containers: emptyResult, error: "Error fetching child containers. " + childContainerErrors.join(", ") };
  }

  if (childContainerInventoryCostError) {
    console.error("Error fetching child container inventory cost:", childContainerInventoryCostError);
    return { containers: emptyResult, error: "Error fetching child container inventory cost. " + childContainerInventoryCostError };
  }

  for (const result of childContainerResults) {
    for (const childContainer of result.containers.list) {
      const parentId = childContainer.parent?.id;
      if (parentId && byId[parentId]) {
        byId[parentId].child_containers.children.push(childContainer);
      }
    }
  }

  return { containers: { byId, list }, error: null };
};

export const getTopLevelContainers = async (supabase = createClient()) => {
  const emptyResult: ContainerResult = { byId: {}, list: [] };
  const supabaseClient = await supabase;
  const userId = await getUserId(supabase);
  if (!userId) {
    return { topLevelContainers: emptyResult, error: "User not authenticated" };
  }
  const { data: containerRoots, error: containerRootsError } = await supabaseClient.rpc("get_visible_container_roots", { p_user_id: userId });

  if (containerRootsError) {
    console.error(
      "Error fetching top-level containers:",
      containerRootsError.message,
      containerRootsError.details,
      containerRootsError.cause,
      containerRootsError.hint,
      containerRootsError.code,
      containerRootsError.stack
    );
    return { topLevelContainers: emptyResult, error: containerRootsError.message };
  }

  const topLevelContainerIds = (containerRoots ?? []).map((c) => c.id);
  const sharedContainersQuery = supabaseClient
    .from("container_shares")
    .select("container_id, permission, shared_by: users!container_shares_granted_by_fkey(id, display_name, role), shared_at: created_at")
    .in("container_id", topLevelContainerIds)
    .eq("shared_with_user_id", userId)
    .eq("status", "active");
  const [{ containers, error: containerError }, { data: sharedContainers, error: sharedContainersError }] = await Promise.all([
    getContainers(topLevelContainerIds, supabase),
    sharedContainersQuery
  ]);

  if (containerError) {
    return { topLevelContainers: emptyResult, error: containerError };
  }
  if (sharedContainersError) {
    console.error(
      "Error fetching shared containers:",
      sharedContainersError.message,
      sharedContainersError.details,
      sharedContainersError.cause,
      sharedContainersError.hint,
      sharedContainersError.code,
      sharedContainersError.stack
    );
    return { topLevelContainers: emptyResult, error: sharedContainersError.message };
  }

  // Merge shared information into the containers
  const sharedContainerMap = new Map(sharedContainers?.map((sc) => [sc.container_id, sc]));
  const topLevelContainers: ContainerResult = { byId: {}, list: [] };
  for (const container of containers.list) {
    const sharedInfo = sharedContainerMap.get(container.id);
    const updatedContainer: ContainerReadResource = {
      ...container,
      permission: sharedInfo?.permission === "view" ? "read" : "write",
      shared_by: sharedInfo?.shared_by || null,
      shared_at: sharedInfo?.shared_at || null
    };

    topLevelContainers.byId[container.id] = updatedContainer;
    topLevelContainers.list.push(updatedContainer);
  }

  return { topLevelContainers, error: null };
};

export interface ContainerTypeReadResource {
  type: "container_type";
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: BaseUserResource | null;
  updated_at: string;
  updated_by: BaseUserResource | null;
  shared_by: BaseUserResource | null;
}
interface ContainerTypesResult {
  byName: Record<string, ContainerTypeReadResource>;
  byId: Record<string, ContainerTypeReadResource>;
  byNameCount: number;
  byIdCount: number;
}

export const getContainerTypes = async (
  supabase = createClient(),
  containerIds: string[] = []
): Promise<{ containerTypes: ContainerTypesResult; error: string | null }> => {
  const emptyContainerTypes: ContainerTypesResult = { byName: {}, byId: {}, byNameCount: 0, byIdCount: 0 };
  if (containerIds.length === 0) {
    const { containerIds: fetchedIds, error } = await getContainerIds(supabase);
    if (error) {
      return { containerTypes: emptyContainerTypes, error };
    }
    containerIds = fetchedIds;
  }
  const userId = await getUserId(supabase);
  if (!userId) {
    return { containerTypes: emptyContainerTypes, error: "User not authenticated" };
  }

  const supabaseClient = await supabase;

  const containerTypesByContainerQuery = supabaseClient
    .from("containers")
    .select(
      "id, owner:users!containers_owner_user_id_fkey(id, display_name, role), container_type:container_types!containers_container_type_fkey(id, name, description, created_at, updated_at, owner_user_id, created_by:users!container_types_created_by_fkey(id, display_name, role), updated_by:users!container_types_updated_by_fkey(id, display_name, role))"
    )
    .in("id", containerIds)
    .eq("status", ACTIVE_STATUS)
    .not("container_type", "is", null);
  const containerTypesOwnedQuery = supabaseClient
    .from("container_types")
    .select(
      "id, name, description, created_at, updated_at, created_by:users!container_types_created_by_fkey(id, display_name, role), updated_by:users!container_types_updated_by_fkey(id, display_name, role)"
    )
    .eq("owner_user_id", userId);

  const [{ data: containerTypesByContainer, error: containerTypesByContainerError }, { data: containerTypesOwned, error: containerTypesOwnedError }] =
    await Promise.all([containerTypesByContainerQuery, containerTypesOwnedQuery]);

  if (containerTypesByContainerError) {
    return { containerTypes: emptyContainerTypes, error: containerTypesByContainerError.message };
  }
  if (containerTypesOwnedError) {
    return { containerTypes: emptyContainerTypes, error: containerTypesOwnedError.message };
  }

  const byName = {} as Record<string, ContainerTypeReadResource>;
  const byId = {} as Record<string, ContainerTypeReadResource>;
  let byNameCount = 0;
  let byIdCount = 0;

  for (const containerType of containerTypesOwned ?? []) {
    const resource: ContainerTypeReadResource = {
      type: "container_type",
      id: containerType.id,
      name: containerType.name,
      description: containerType.description,
      created_at: containerType.created_at,
      created_by: containerType.created_by,
      updated_at: containerType.updated_at,
      updated_by: containerType.updated_by,
      shared_by: null
    };
    if (!byId[containerType.id]) {
      byId[containerType.id] = resource;
      byIdCount++;
    }
    const containerTypeName = containerType.name.trim().toLowerCase();
    if (!byName[containerTypeName]) {
      byName[containerTypeName] = resource;
      byNameCount++;
    }
  }

  for (const container of containerTypesByContainer ?? []) {
    const resource: ContainerTypeReadResource = {
      type: "container_type",
      id: container.container_type.id,
      name: container.container_type.name,
      description: container.container_type.description,
      created_at: container.container_type.created_at,
      created_by: container.container_type.created_by,
      updated_at: container.container_type.updated_at,
      updated_by: container.container_type.updated_by,
      shared_by: container.container_type.owner_user_id === userId ? null : container.owner
    };
    if (!byId[container.container_type.id]) {
      byId[container.container_type.id] = resource;
      byIdCount++;
    }
    const containerTypeName = container.container_type.name.toLowerCase();
    if (!byName[containerTypeName]) {
      byName[containerTypeName] = resource;
      byNameCount++;
    }
  }

  return { containerTypes: { byName, byId, byNameCount, byIdCount }, error: null };
};

type DistinctAttributeValues = {
  container_type: string[];
  location: string[];
  tags: string[];
  container_type_options: { id: string; name: string }[];
};
export const getDistinctAttributeValuesFromContainers = async (
  containerIds: string[],
  supabase = createClient()
): Promise<{ distinctValues: DistinctAttributeValues; error: string | null }> => {
  if (containerIds.length === 0) {
    return { distinctValues: { container_type: [], location: [], tags: [], container_type_options: [] }, error: null };
  }

  const supabaseClient = await supabase;
  const { data: containers, error: containersError } = await supabaseClient
    .from("containers")
    .select("container_type: container_types(id, name), location, tags")
    .in("id", containerIds)
    .eq("status", ACTIVE_STATUS);
  if (containersError) {
    return { distinctValues: { container_type: [], location: [], tags: [], container_type_options: [] }, error: containersError.message };
  }

  type ContainerList = Exclude<typeof containers, null>;
  type ContainerRow = ContainerList extends (infer Row)[] ? Row : never;
  const getDistinctValues = (containerList: typeof containers, attributeGetter: (c: ContainerRow) => undefined | null | string | string[]) => {
    const values = new Set<string>();
    for (const container of containerList ?? []) {
      const attributeValue = attributeGetter(container);
      const valueList = Array.isArray(attributeValue) ? attributeValue : [attributeValue];
      valueList.forEach((val) => val && values.add(val));
    }
    return Array.from(values).sort();
  };
  const distinctValues: DistinctAttributeValues = {
    container_type: getDistinctValues(containers, (c) => c.container_type?.name),
    location: getDistinctValues(containers, (c) => c.location),
    tags: getDistinctValues(containers, (c) => c.tags),
    container_type_options: []
  };
  setDistinctContainerTypeOptions(containers ?? [], distinctValues);

  return { distinctValues, error: null };
};

function setDistinctContainerTypeOptions<T extends { container_type?: { id: string; name: string } | null }>(
  items: T[],
  distinctValues: DistinctAttributeValues
) {
  const containerTypeOptionsMap: Record<string, { id: string; name: string }> = {};
  for (const item of items) {
    if (item.container_type) {
      containerTypeOptionsMap[item.container_type.name] = { id: item.container_type.id, name: item.container_type.name };
    }
  }
  distinctValues.container_type_options = distinctValues.container_type.map((name) => containerTypeOptionsMap[name]);
}
