import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MobileShell } from "@/components/mobile-shell";
import { FolderIcon, BoxIcon, GridIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/dashboard/page.module.css";
import PublicHomePage, { NullableError } from "../public-page";
import { getProfile, getUserId } from "../services/user-service";
import { getContainerIds, getContainerTypes, getTopLevelContainers } from "../services/container-service";
import { getItemCategories, getItemCount } from "../services/item-service";
import { getActivity } from "../activity/activity-service";
import ContainerRow from "../containers/container-row";
import ErrorMessages from "@/components/error-messages";
import { formatCurrency } from "../api/formatters";

type SearchParams = {
  success?: string;
  error?: string;
};
type Props = { searchParams: Promise<SearchParams> };

function relativeTime(dateStr: string) {
  return formatDistanceToNow(dateStr, { addSuffix: true, includeSeconds: true });
}

interface CountResult {
  containerCount: number;
  itemCount: number;
  containerTypesCount: number;
  itemCategoriesCount: number;
  containerLocationCount: number;
  itemLocationCount: number;
  totalValue: number;
  totalContainerValue: number;
  totalItemValue: number;
}

async function getTotalValue(
  supabase: ReturnType<typeof createClient>,
  containerIds: string[]
): Promise<{ totalContainerValue: number; totalItemValue: number; totalValue: number; error: string | null }> {
  if (containerIds.length === 0) {
    return { totalContainerValue: 0, totalItemValue: 0, totalValue: 0, error: null };
  }
  const supabaseClient = await supabase;
  const containerValueQuery = supabaseClient.from("containers").select("id, unit_cost").in("id", containerIds).eq("status", "enabled");

  const itemValueQuery = supabaseClient.from("items").select("id, container_id, unit_cost").in("container_id", containerIds).eq("status", "enabled");

  const [{ data: containerValues, error: containerValueError }, { data: itemValues, error: itemValueError }] = await Promise.all([
    containerValueQuery,
    itemValueQuery
  ]);

  const containerValueById: Record<string, number> = {};
  let totalContainerValue = 0;
  for (const container of containerValues ?? []) {
    const unitCost = Number(container.unit_cost ?? 0);
    containerValueById[container.id] = unitCost;
    totalContainerValue += unitCost;
  }

  let totalItemValue = 0;
  const valuesByContainerId: Record<string, number> = {};
  for (const item of itemValues ?? []) {
    const containerId = item.container_id;
    const itemCost = Number(item.unit_cost ?? 0);
    if (containerValueById[containerId] === undefined) {
      valuesByContainerId[containerId] = (valuesByContainerId[containerId] || 0) + itemCost;
    }
    totalItemValue += itemCost;
  }

  for (const containerId in containerValueById) {
    const containerValue = containerValueById[containerId];
    valuesByContainerId[containerId] = containerValue;
  }

  const totalValue = Object.values(valuesByContainerId).reduce((sum, value) => sum + value, 0);
  const valueError = containerValueError?.message || itemValueError?.message || null;

  return { totalContainerValue, totalItemValue, totalValue, error: valueError };
}

async function getTotalCounts(supabase: ReturnType<typeof createClient>): Promise<{ counts: CountResult; error: string | null }> {
  const countResult: CountResult = {
    containerCount: 0,
    itemCount: 0,
    containerTypesCount: 0,
    itemCategoriesCount: 0,
    containerLocationCount: 0,
    itemLocationCount: 0,
    totalValue: 0,
    totalContainerValue: 0,
    totalItemValue: 0
  };
  const { containerIds, error: containerIdsError } = await getContainerIds(supabase, ["enabled", "archived", "removed"]);
  if (containerIdsError) {
    return { counts: countResult, error: containerIdsError };
  }
  countResult.containerCount = containerIds.length;
  const supabaseClient = await supabase;
  const containerLocationCountQuery = supabaseClient
    .from("containers")
    .select("location", { count: "exact", head: true })
    .in("id", containerIds)
    .eq("status", "enabled")
    .not("location", "is", null);

  const itemLocationCountQuery = supabaseClient
    .from("items")
    .select("location", { count: "exact", head: true })
    .in("container_id", containerIds)
    .eq("status", "enabled")
    .not("location", "is", null);

  const [
    { itemCounts, error: itemCountError },
    { containerTypes, error: containerTypesError },
    { itemCategories, error: itemCategoriesError },
    { count: containerLocationCount, error: containerLocationCountError },
    { count: itemLocationCount, error: itemLocationCountError },
    { totalContainerValue, totalItemValue, totalValue, error: totalValueError }
  ] = await Promise.all([
    getItemCount(containerIds, supabase),
    getContainerTypes(supabase, containerIds),
    getItemCategories(containerIds, supabase),
    containerLocationCountQuery,
    itemLocationCountQuery,
    getTotalValue(supabase, containerIds)
  ]);

  countResult.itemCount = itemCounts.total;
  countResult.containerTypesCount = containerTypes.byNameCount;
  countResult.itemCategoriesCount = itemCategories.byNameCount;
  countResult.containerLocationCount = containerLocationCount ?? 0;
  countResult.itemLocationCount = itemLocationCount ?? 0;
  countResult.totalValue = totalValue;
  countResult.totalContainerValue = totalContainerValue;
  countResult.totalItemValue = totalItemValue;

  let countError = "";
  if (itemCountError) {
    countError += `Item count error: ${itemCountError}. `;
  }
  if (containerTypesError) {
    countError += `Container types error: ${containerTypesError}. `;
  }
  if (itemCategoriesError) {
    countError += `Item categories error: ${itemCategoriesError}. `;
  }
  if (containerLocationCountError) {
    countError += `Container location count error: ${containerLocationCountError}. `;
  }
  if (itemLocationCountError) {
    countError += `Item location count error: ${itemLocationCountError}. `;
  }
  if (totalValueError) {
    countError += `Total value error: ${totalValueError}. `;
  }

  return { counts: countResult, error: countError || null };
}

export default async function HomePage({ searchParams }: Props) {
  const TOP_LEVEL_CONTAINERS_LIMIT = 1;
  const { success: pageSuccess, error: pageError } = await searchParams;
  const pageErrors: NullableError[] = [pageError];

  const supabase = createClient();
  const userId = await getUserId(supabase);

  if (!userId) {
    return <PublicHomePage errors={pageErrors} />;
  }

  const activityDotStyleMap: Record<string, string> = {
    container: styles.dotContainer,
    item: styles.dotItem,
    shared: styles.dotShared
  };
  const recentActivityLimitOnDashboard = 5;

  const [
    { counts: totalCounts, error: totalCountsError },
    { topLevelContainers, error: topLevelContainersError },
    { profile, error: profileError },
    { activity: recentActivity, error: recentActivityError }
  ] = await Promise.all([
    getTotalCounts(supabase),
    getTopLevelContainers(supabase),
    getProfile(supabase),
    getActivity(recentActivityLimitOnDashboard, supabase)
  ]);

  const tagsCount = 0;
  const totalWarrentiedItems = 0;

  const initials = (profile?.display_name ?? "User")
    .split(" ")
    .map((word: string) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (profileError) {
    pageErrors.push(profileError);
    return <PublicHomePage errors={pageErrors} />;
  }

  pageErrors.push(totalCountsError);

  return (
    <MobileShell
      title="Home"
      activeNav="home"
      headerActions={
        <Link href="/profile" className={styles.avatarBtn} aria-label="Profile">
          {initials}
        </Link>
      }
    >
      {pageSuccess ? <p className={styles.toastOk}>{pageSuccess}</p> : null}
      <ErrorMessages errors={pageErrors} />

      <section className={styles.card}>
        <div className={styles.row}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            Top Level Containers ({topLevelContainers.list.length})
          </h2>
          <Link href="/containers" className={styles.viewAll}>
            View all
          </Link>
        </div>
        <ErrorMessages errors={[topLevelContainersError]} />

        {!topLevelContainersError && topLevelContainers.list.length === 0 && <p className={styles.empty}>No containers yet. Create your first container.</p>}
        {topLevelContainers.list.length > 0 && (
          <ul className={styles.topLevelContainerList}>
            {topLevelContainers.list.slice(0, TOP_LEVEL_CONTAINERS_LIMIT).map((container) => (
              <ContainerRow key={container.id} {...container} />
            ))}
          </ul>
        )}
      </section>

      <section className={styles.quickNav}>
        <Link href="/search?tab=containers" className={styles.quickNavItem}>
          <span className={`${styles.quickNavIcon} ${styles.iconFolder}`}>
            <FolderIcon size={21} />
          </span>
          <p className={styles.quickNavCount}> {totalCounts.containerCount}</p>
          <p className={styles.quickNavLabel}> Containers </p>
        </Link>
        <Link href="/search?tab=items" className={styles.quickNavItem}>
          <span className={`${styles.quickNavIcon} ${styles.iconBox}`}>
            <BoxIcon size={21} />
          </span>
          <p className={styles.quickNavCount}> {totalCounts.itemCount}</p>
          <p className={styles.quickNavLabel}> Items </p>
        </Link>
        <Link href="/containers/types" className={styles.quickNavItem}>
          <span className={`${styles.quickNavIcon} ${styles.iconGrid}`}>
            <GridIcon size={21} />
          </span>
          <p className={styles.quickNavCount}> {totalCounts.containerTypesCount}</p>
          <p className={styles.quickNavLabel}> Container Types </p>
        </Link>
        <Link href="/items/categories" className={styles.quickNavItem}>
          <span className={`${styles.quickNavIcon} ${styles.iconPin}`}>
            <GridIcon size={21} />
          </span>
          <p className={styles.quickNavCount}> {totalCounts.itemCategoriesCount}</p>
          <p className={styles.quickNavLabel}> Item Categories </p>
        </Link>
      </section>

      <section className={styles.card}>
        <div className={styles.row}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            Recent Activity ({recentActivity.length < recentActivityLimitOnDashboard ? recentActivity.length : recentActivityLimitOnDashboard})
          </h2>
          <Link href="/activity" className={styles.viewAll}>
            View all
          </Link>
        </div>
        {recentActivityError && <p className={styles.toastErr}>{recentActivityError}</p>}
        {!recentActivityError && recentActivity.length === 0 && <p className={styles.empty}>No activity yet. Add a container to get started.</p>}
        {recentActivity.length > 0 && (
          <ul className={styles.activityList} style={{ marginTop: "0.6rem" }}>
            {recentActivity.map((entry) => {
              return (
                <li key={entry.id} className={styles.activityItem}>
                  <span className={`${styles.activityDot} ${activityDotStyleMap[entry.type] || styles.dotOther}`} />
                  <p className={styles.activityText}>{entry.text}</p>
                  <p className={styles.activityTime}>{relativeTime(entry.updatedAt)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Quick Stats</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Container Locations</p>
            <p className={styles.statValue}>{totalCounts.containerLocationCount}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Item Locations</p>
            <p className={styles.statValue}>{totalCounts.itemLocationCount}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Total Value</p>
            <p className={styles.statValue}>{formatCurrency(totalCounts.totalValue)}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Total Container Value</p>
            <p className={styles.statValue}>{formatCurrency(totalCounts.totalContainerValue)}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Total Item Value</p>
            <p className={styles.statValue}>{formatCurrency(totalCounts.totalItemValue)}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Tags</p>
            <p className={styles.statValue}>{tagsCount}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Total Warrentied Items</p>
            <p className={styles.statValue}>{totalWarrentiedItems}</p>
          </div>
        </div>
      </section>
    </MobileShell>
  );
}
