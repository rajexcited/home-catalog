import { redirect } from "next/navigation";
import { getUserId } from "@/app/services/user-service";
import { MobileShell } from "@/components/mobile-shell";
import { createClient } from "@/lib/supabase/server";
import styles from "./container-types.module.css";
import { getContainerIds, getContainerTypes } from "@/app/services/container-service";
import ContainerTypesManager, { ContainerTypeItem } from "./container-types-manager";

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

interface ContainerTypeRecord {
  name: string;
  ids: Set<string>;
  containerIds: Set<string>;
  description?: string;
}

export default async function ContainerTypesPage({ searchParams }: Props) {
  let { success, error } = await searchParams;
  const supabase = createClient();
  const supabaseClient = await supabase;
  const userId = await getUserId(supabase);
  if (!userId) redirect("/sign-in");

  let containerIdList: string[] = [];
  if (!error) {
    const { containerIds: ids, error: containerIdsError } = await getContainerIds(supabase);
    if (containerIdsError) {
      error = containerIdsError;
    } else {
      containerIdList = ids;
    }
  }

  const typeMap: Map<string, ContainerTypeRecord> = new Map();
  if (!error) {
    const containerTypeWithContainerRequest = supabaseClient
      .from("containers")
      .select("id, container_type: container_types(id, name, description)")
      .in("id", containerIdList);
    const containerTypesRequest = getContainerTypes(supabase, containerIdList);
    const [{ data: containers, error: containersError }, { containerTypes, error: containerTypesError }] = await Promise.all([
      containerTypeWithContainerRequest,
      containerTypesRequest
    ]);
    if (containersError || containerTypesError) {
      error = containerTypesError ?? containersError?.message;
    } else {
      console.log("Fetched containers:", containers);
      for (const containerType of Object.values(containerTypes.byId)) {
        const key = containerType.id.trim().toLowerCase();
        typeMap.set(key, { name: containerType.name, ids: new Set([containerType.id]), containerIds: new Set(), description: containerType.description ?? "" });
      }
      // containers fetched successfully
      for (const c of containers ?? []) {
        if (c.container_type) {
          const key = c.container_type.id.trim().toLowerCase();
          const record = typeMap.getOrInsert(key, {
            name: c.container_type.name,
            ids: new Set(),
            containerIds: new Set(),
            description: c.container_type.description ?? ""
          });
          record.ids.add(c.container_type.id);
          record.containerIds.add(c.id);
        }
      }
    }
  }

  const types: ContainerTypeItem[] = Array.from(typeMap.entries())
    .map(([key, detail]) => ({
      key,
      name: detail.name,
      description: detail.description ?? "",
      containerCount: detail.containerIds.size,
      ids: Array.from(detail.ids),
      containerIds: Array.from(detail.containerIds)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <MobileShell title="Container Types" activeNav="more" backHref="/">
      {success ? <p className={styles.toastOk}>{success}</p> : null}
      {error ? <p className={styles.toastErr}>{error}</p> : null}

      <ContainerTypesManager types={types} />
    </MobileShell>
  );
}
