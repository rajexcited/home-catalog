import Link from "next/link";
import { redirect } from "next/navigation";

import { MobileShell } from "@/components/mobile-shell";
import { FolderIcon, BoxIcon, PlusIcon, PencilIcon, SearchIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/containers/[containerId]/container-items.module.css";

type Props = {
  params: Promise<{ containerId: string }>;
  searchParams: Promise<{
    filterCategory?: string;
    filterWarranty?: string;
    filterImage?: string;
    minValue?: string;
    maxValue?: string;
    sort?: string;
    childType?: string;
    childLocation?: string;
    childSort?: string;
  }>;
};

export default async function ContainerItemsPage({ params, searchParams }: Props) {
  const { containerId } = await params;
  const {
    filterCategory = "all",
    filterWarranty = "all",
    filterImage = "all",
    minValue,
    maxValue,
    sort = "name-asc",
    childType = "all",
    childLocation = "all",
    childSort = "name-asc"
  } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: container }, { data: items }, { data: childContainers }] = await Promise.all([
    supabase.from("containers").select("id, name, location, container_type").eq("id", containerId).eq("owner_user_id", user.id).single(),
    supabase
      .from("items")
      .select("id, name, category, quantity, unit_cost, warranty_expiry, created_at")
      .eq("container_id", containerId)
      .eq("owner_user_id", user.id),
    supabase.from("containers").select("id, name, container_type, location, created_at").eq("parent_id", containerId).eq("owner_user_id", user.id)
  ]);
  if (!container) redirect("/containers?error=Container not found");

  const allItems = items ?? [];
  const minValueNum = minValue ? Number(minValue) : undefined;
  const maxValueNum = maxValue ? Number(maxValue) : undefined;

  const itemIds = allItems.map((i) => i.id);
  const { data: images } =
    itemIds.length > 0
      ? await supabase.from("item_images").select("item_id, storage_path").in("item_id", itemIds)
      : { data: [] as { item_id: string; storage_path: string }[] };

  const hasImageSet = new Set<string>();
  const firstImageByItem = new Map<string, string>();
  for (const img of images ?? []) {
    hasImageSet.add(img.item_id);
    if (!firstImageByItem.has(img.item_id)) {
      const { data } = supabase.storage.from("item-images").getPublicUrl(img.storage_path);
      firstImageByItem.set(img.item_id, data.publicUrl);
    }
  }

  const categories = Array.from(new Set(allItems.map((i) => i.category ?? "Uncategorized"))).sort((a, b) => a.localeCompare(b));
  const childTypes = Array.from(new Set((childContainers ?? []).map((c) => c.container_type).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
  const childLocations = Array.from(new Set((childContainers ?? []).map((c) => c.location).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

  const now = Date.now();
  const soonMs = 90 * 24 * 60 * 60 * 1000;
  const itemValue = (i: { quantity: number | null; unit_cost: number | null }) => Number(i.quantity ?? 1) * Number(i.unit_cost ?? 0);

  const filteredItems = allItems
    .filter((i) => {
      const category = i.category ?? "Uncategorized";
      if (filterCategory !== "all" && category !== filterCategory) return false;

      const value = itemValue(i);
      if (typeof minValueNum === "number" && Number.isFinite(minValueNum) && value < minValueNum) return false;
      if (typeof maxValueNum === "number" && Number.isFinite(maxValueNum) && value > maxValueNum) return false;

      const expiryTs = i.warranty_expiry ? new Date(i.warranty_expiry).getTime() : null;
      const hasWarranty = expiryTs !== null && Number.isFinite(expiryTs);
      const isExpired = hasWarranty ? expiryTs < now : false;
      const isExpiringSoon = hasWarranty ? expiryTs >= now && expiryTs <= now + soonMs : false;
      if (filterWarranty === "expiring" && !isExpiringSoon) return false;
      if (filterWarranty === "expired" && !isExpired) return false;
      if (filterWarranty === "none" && hasWarranty) return false;

      const hasImage = hasImageSet.has(i.id);
      if (filterImage === "with" && !hasImage) return false;
      if (filterImage === "without" && hasImage) return false;

      return true;
    })
    .sort((a, b) => {
      const aValue = itemValue(a);
      const bValue = itemValue(b);
      const aQty = Number(a.quantity ?? 1);
      const bQty = Number(b.quantity ?? 1);
      const aWarranty = a.warranty_expiry ? new Date(a.warranty_expiry).getTime() : Number.MAX_SAFE_INTEGER;
      const bWarranty = b.warranty_expiry ? new Date(b.warranty_expiry).getTime() : Number.MAX_SAFE_INTEGER;
      const aCategory = a.category ?? "Uncategorized";
      const bCategory = b.category ?? "Uncategorized";
      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;

      switch (sort) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "value-desc":
          return bValue - aValue;
        case "value-asc":
          return aValue - bValue;
        case "qty-desc":
          return bQty - aQty;
        case "qty-asc":
          return aQty - bQty;
        case "warranty-asc":
          return aWarranty - bWarranty;
        case "warranty-desc":
          return bWarranty - aWarranty;
        case "category-asc":
          return aCategory.localeCompare(bCategory);
        case "category-desc":
          return bCategory.localeCompare(aCategory);
        case "newest":
          return bCreated - aCreated;
        case "oldest":
          return aCreated - bCreated;
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const filteredChildContainers = (childContainers ?? [])
    .filter((c) => {
      if (childType !== "all" && (c.container_type ?? "") !== childType) return false;
      if (childLocation !== "all" && (c.location ?? "") !== childLocation) return false;
      return true;
    })
    .sort((a, b) => {
      const aType = a.container_type ?? "";
      const bType = b.container_type ?? "";
      const aLocation = a.location ?? "";
      const bLocation = b.location ?? "";
      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;

      switch (childSort) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "type-asc":
          return aType.localeCompare(bType);
        case "type-desc":
          return bType.localeCompare(aType);
        case "location-asc":
          return aLocation.localeCompare(bLocation);
        case "location-desc":
          return bLocation.localeCompare(aLocation);
        case "newest":
          return bCreated - aCreated;
        case "oldest":
          return aCreated - bCreated;
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const totalValue = filteredItems.reduce((s, i) => s + itemValue(i), 0);

  return (
    <MobileShell
      title={container.name}
      activeNav="more"
      backHref="/containers"
      headerActions={
        <>
          <Link href={`/search?within=${containerId}`} className={styles.iconBtn} aria-label="Search">
            <SearchIcon size={16} />
          </Link>
          <Link href={`/containers/${containerId}/details`} className={styles.iconBtn} aria-label="Details">
            <PencilIcon size={15} />
          </Link>
        </>
      }
    >
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Items</p>
          <p className={styles.statValue}>{allItems.length}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Value</p>
          <p className={styles.statValue}>${totalValue.toFixed(0)}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Sub</p>
          <p className={styles.statValue}>{(childContainers ?? []).length}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Type</p>
          <p className={styles.statValue} style={{ fontSize: "0.7rem" }}>
            {container.container_type ?? "—"}
          </p>
        </div>
      </div>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Sort &amp; Filter</h2>
        <form method="get" className={styles.controlsForm}>
          <div className={styles.controlsGrid}>
            <label className={styles.label}>
              Item Category
              <select name="filterCategory" defaultValue={filterCategory} className={styles.select}>
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Warranty
              <select name="filterWarranty" defaultValue={filterWarranty} className={styles.select}>
                <option value="all">All</option>
                <option value="expiring">Expiring in 90 days</option>
                <option value="expired">Expired</option>
                <option value="none">No warranty date</option>
              </select>
            </label>

            <label className={styles.label}>
              Images
              <select name="filterImage" defaultValue={filterImage} className={styles.select}>
                <option value="all">All</option>
                <option value="with">With image</option>
                <option value="without">Without image</option>
              </select>
            </label>

            <label className={styles.label}>
              Sort Items
              <select name="sort" defaultValue={sort} className={styles.select}>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="value-desc">Value high-low</option>
                <option value="value-asc">Value low-high</option>
                <option value="qty-desc">Quantity high-low</option>
                <option value="qty-asc">Quantity low-high</option>
                <option value="warranty-asc">Warranty earliest</option>
                <option value="warranty-desc">Warranty latest</option>
                <option value="category-asc">Category A-Z</option>
                <option value="category-desc">Category Z-A</option>
                <option value="newest">Newest added</option>
                <option value="oldest">Oldest added</option>
              </select>
            </label>

            <label className={styles.label}>
              Min Item Value
              <input name="minValue" type="number" min="0" step="0.01" defaultValue={minValue ?? ""} className={styles.input} placeholder="0" />
            </label>

            <label className={styles.label}>
              Max Item Value
              <input name="maxValue" type="number" min="0" step="0.01" defaultValue={maxValue ?? ""} className={styles.input} placeholder="1000" />
            </label>

            <label className={styles.label}>
              Child Type
              <select name="childType" defaultValue={childType} className={styles.select}>
                <option value="all">All types</option>
                {childTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Child Location
              <select name="childLocation" defaultValue={childLocation} className={styles.select}>
                <option value="all">All locations</option>
                {childLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Sort Children
              <select name="childSort" defaultValue={childSort} className={styles.select}>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="type-asc">Type A-Z</option>
                <option value="type-desc">Type Z-A</option>
                <option value="location-asc">Location A-Z</option>
                <option value="location-desc">Location Z-A</option>
                <option value="newest">Newest added</option>
                <option value="oldest">Oldest added</option>
              </select>
            </label>
          </div>

          <div className={styles.controlsActions}>
            <button type="submit" className={styles.btnPrimary}>
              Apply
            </button>
            <Link href={`/containers/${containerId}`} className={styles.btnSecondary}>
              Reset
            </Link>
          </div>
        </form>
      </section>

      {filteredChildContainers.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Sub-containers ({filteredChildContainers.length})</h2>
          <ul className={styles.itemList}>
            {filteredChildContainers.map((cc) => (
              <li key={cc.id}>
                <Link href={`/containers/${cc.id}`} className={styles.childContainer}>
                  <span className={styles.childContainerIcon}>
                    <FolderIcon size={18} />
                  </span>
                  <div>
                    <p className={styles.childName}>{cc.name}</p>
                    <p className={styles.childMeta}>
                      {cc.container_type ?? "container"}
                      {cc.location ? ` · ${cc.location}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.row}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            Items ({filteredItems.length}
            {filteredItems.length !== allItems.length ? ` of ${allItems.length}` : ""})
          </h2>
        </div>
        <ul className={styles.itemList} style={{ marginTop: "0.6rem" }}>
          {filteredItems.length === 0 && <p className={styles.empty}>No items yet. Tap + to add one.</p>}
          {filteredItems.map((item) => {
            const thumb = firstImageByItem.get(item.id);
            const value = Number(item.quantity ?? 1) * Number(item.unit_cost ?? 0);
            return (
              <li key={item.id}>
                <Link href={`/items/${item.id}`} className={styles.itemRow}>
                  {thumb ? (
                    <img src={thumb} alt={item.name} className={styles.itemThumb} />
                  ) : (
                    <span className={styles.itemThumbPlaceholder}>
                      <BoxIcon size={18} />
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className={styles.itemName}>{item.name}</p>
                    <p className={styles.itemMeta}>{item.category ?? "Uncategorized"}</p>
                    <p className={styles.itemPrice}>
                      ${value.toFixed(2)} · Qty {item.quantity ?? 1}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <Link href={`/items/new?containerId=${containerId}`} className={styles.addFab} aria-label="Add item">
        <PlusIcon size={22} />
      </Link>
    </MobileShell>
  );
}
