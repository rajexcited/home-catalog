import { redirect } from "next/navigation";
import { getUserId } from "@/app/services/user-service";
import { getContainerIds } from "@/app/services/container-service";
import { getItemCategories } from "@/app/services/item-service";
import { MobileShell } from "@/components/mobile-shell";
import { createClient } from "@/lib/supabase/server";
import styles from "./item-categories.module.css";
import ItemCategoriesManager, { ItemCategoryItem } from "./item-categories-manager";

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

interface ItemCategoryRecord {
  name: string;
  description: string;
  ids: Set<string>;
  itemIds: Set<string>;
}

export default async function ItemCategoriesPage({ searchParams }: Props) {
  let { success, error } = await searchParams;
  const supabase = createClient();
  const supabaseClient = await supabase;
  const userId = await getUserId(supabase);
  if (!userId) redirect("/sign-in");

  let containerIdList: string[] = [];
  if (!error) {
    const { containerIds, error: containerIdsError } = await getContainerIds(supabase);
    if (containerIdsError) {
      error = containerIdsError;
    } else {
      containerIdList = containerIds;
    }
  }

  const categoryMap: Map<string, ItemCategoryRecord> = new Map();
  if (!error) {
    const itemsRequest = supabaseClient
      .from("items")
      .select("id, category")
      .in("container_id", containerIdList)
      .eq("status", "enabled")
      .not("category", "is", null);
    const itemCategoriesRequest = getItemCategories(containerIdList, supabase);
    const [{ itemCategories, error: categoriesError }, { data: itemsResult, error: itemsError }] = await Promise.all([itemCategoriesRequest, itemsRequest]);
    if (categoriesError || itemsError) {
      error = categoriesError ?? itemsError?.message;
    } else {
      for (const category of Object.values(itemCategories.byId)) {
        const key = category.id.trim().toLowerCase();
        categoryMap.set(key, { name: category.name, description: category.description ?? "", ids: new Set([category.id]), itemIds: new Set() });
      }
      for (const item of itemsResult ?? []) {
        if (item.category) {
          const key = item.category.trim().toLowerCase();
          const record = categoryMap.getOrInsert(key, {
            name: "Unknown",
            description: "",
            ids: new Set([item.category]),
            itemIds: new Set([item.id])
          });
          record.ids.add(item.category);
          record.itemIds.add(item.id);
        }
      }
    }
  }

  const categories: ItemCategoryItem[] = Array.from(categoryMap.entries())
    .map(([key, detail]) => ({
      key,
      name: detail.name,
      description: detail.description,
      ids: Array.from(detail.ids),
      itemIds: Array.from(detail.itemIds),
      itemCount: detail.itemIds.size
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <MobileShell title="Item Categories" activeNav="more" backHref="/profile">
      {success ? <p className={styles.toastOk}>{success}</p> : null}
      {error ? <p className={styles.toastErr}>{error}</p> : null}

      <ItemCategoriesManager categories={categories} />
    </MobileShell>
  );
}
