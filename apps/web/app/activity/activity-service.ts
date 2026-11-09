import { createClient } from "@/lib/supabase/server";
import { getUserId } from "../services/user-service";
import { getContainerIds } from "../services/container-service";
import { EntityStatus } from "@/lib/supabase/types";
import { MAX_SAFE_INTEGER } from "../api/app-constants";

export interface ActivityEntry {
  id: string;
  type: "audit" | "container" | "item";
  text: string;
  updatedAt: string;
}

interface AuditActivityEntry {
  type: "audit";
  data: {
    action: string;
    created_at: string;
  };
  updatedAt: string;
}

interface ContainerActivityEntry {
  type: "container";
  data: {
    name: string;
    created_at: string;
    updated_at: string;
    status: EntityStatus;
  };
  updatedAt: string;
}

interface ItemActivityEntry {
  type: "item";
  data: {
    name: string;
    created_at: string;
    updated_at: string;
    status: EntityStatus;
  };
  updatedAt: string;
}

const getAuditLogs = async (limit: number, supabase = createClient()) => {
  // get audit logs for the current user
  const supabaseClient = await supabase;
  const userId = await getUserId(supabase);
  if (!userId) {
    return { logs: [], error: "User not authenticated" };
  }
  const { data: logs, error } = await supabaseClient
    .from("audit_logs")
    .select("action, created_at")
    .or(`user_id.eq.${userId},entity_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return { logs: [], error: error.message };
  }
  const logData: AuditActivityEntry[] = (logs ?? []).map((d) => ({
    type: "audit",
    data: d,
    updatedAt: d.created_at
  }));
  return { logs: logData, error: null };
};

const getContainerActivity = async (limit: number, supabase = createClient()) => {
  const { containerIds, error: containerIdsError } = await getContainerIds(supabase, ["enabled", "archived", "removed"]);
  if (containerIdsError) {
    return { containers: [], error: containerIdsError };
  }
  const supabaseClient = await supabase;
  const { data: recentContainers, error: containersError } = await supabaseClient
    .from("containers")
    .select("name, created_at, updated_at, status")
    .in("id", containerIds)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (containersError) {
    return { containers: [], error: containersError.message };
  }
  const recentContainersData: ContainerActivityEntry[] = (recentContainers ?? []).map((c) => ({
    type: "container",
    data: c,
    updatedAt: c.updated_at
  }));
  return { containers: recentContainersData, error: null };
};

const getItemActivity = async (limit: number, supabase = createClient()) => {
  const { containerIds: enabledContainerIds } = await getContainerIds(supabase, ["enabled"]);
  const supabaseClient = await supabase;
  const { data: recentItems, error: itemsError } = await supabaseClient
    .from("items")
    .select("name, created_at, updated_at, status")
    .in("container_id", enabledContainerIds)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (itemsError) {
    return { items: [], error: itemsError.message };
  }
  const recentItemsData: ItemActivityEntry[] = (recentItems ?? []).map((i) => ({
    type: "item",
    data: i,
    updatedAt: i.updated_at
  }));
  return { items: recentItemsData, error: null };
};

const createActivityText = (entityType: string, entityName: string, createdAt: string, updatedAt: string, status: EntityStatus) => {
  let action = status.toLowerCase();
  if (status === "enabled") {
    const timeDiff = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
    if (timeDiff > 2000) {
      action = "updated";
    } else {
      action = "created";
    }
  }
  return `${entityType} \`${entityName}\` was ${action}`;
};

export const getActivity = async (limit: number, supabase = createClient()) => {
  // priority-1: audit logs, mainly admin related
  const { logs: auditLogs, error } = await getAuditLogs(limit, supabase);
  if (error) {
    return { activity: [], error };
  }
  // priority-2: container created / updated
  const { containers: recentContainers, error: containerError } = await getContainerActivity(limit, supabase);
  if (containerError) {
    return { activity: [], error: containerError };
  }
  // priority-3: item created / updated
  const { items: recentItems, error: itemsError } = await getItemActivity(limit, supabase);
  if (itemsError) {
    return { activity: [], error: itemsError };
  }
  // priority-4: user sharing - TODO later
  const activityHolder = [...auditLogs, ...recentContainers, ...recentItems];
  const sorted = activityHolder.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); // newest first
  let sequenceId = 1;
  const activity: ActivityEntry[] = sorted.slice(0, limit).map((activity) => {
    if (activity.type === "audit") {
      return {
        id: "" + sequenceId++,
        type: activity.type,
        text: activity.data.action,
        updatedAt: activity.updatedAt
      };
    }
    const data = activity.data;
    return {
      id: "" + sequenceId++,
      type: activity.type,
      text: createActivityText(activity.type, activity.data.name, activity.data.created_at, activity.data.updated_at, activity.data.status),
      updatedAt: activity.updatedAt
    };
  });
  return { activity, error: null };
};
