import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteItem, cloneItem } from "@/app/actions";
import { MobileShell } from "@/components/mobile-shell";
import { TrashIcon, CopyIcon, PencilIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/items/[itemId]/item-details.module.css";
import ErrorMessages from "@/components/error-messages";
import ItemImageSectionPage from "./image-section";
import { getItemDetails } from "@/app/services/item-service";
import { getUserId } from "@/app/services/user-service";
import { itemValue } from "@/app/api/sort-utils";
import { formatCurrency } from "@/app/api/formatters";
import ConfirmDeleteForm from "@/components/confirm-delete-form";

type Props = { params: Promise<{ itemId: string }>; searchParams: Promise<{ success?: string; error?: string }> };

export default async function ItemDetailsPage({ params, searchParams }: Props) {
  const { itemId } = await params;
  const { success, error } = await searchParams;
  const pageErrors: string[] = [];

  if (error) {
    pageErrors.push(...error.split("$,$"));
  }

  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) {
    redirect("/sign-in");
  }
  const { item, error: itemError } = await getItemDetails(itemId, supabase);

  if (itemError) {
    pageErrors.push(itemError);
  }
  if (!item) {
    pageErrors.push("Item not found");
  }

  const totalValue = formatCurrency(itemValue(item));

  // const warrantyExpiry = item.warranty_expiry ? new Date(item.warranty_expiry) : null;
  // const warrantyExpiringSoon = warrantyExpiry && warrantyExpiry.getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000;

  return (
    <MobileShell
      title={item?.name ?? "Item Details"}
      activeNav="more"
      backHref={item ? `/containers/${item.container.id}` : "/dashboard"}
      headerActions={
        item && (
          <>
            <form action={cloneItem}>
              <input type="hidden" name="itemId" value={item.id} />
              <button type="submit" className={styles.iconBtn} title="Clone item">
                <CopyIcon size={15} />
              </button>
            </form>
            <Link href={`/items/${item.id}/edit`} className={styles.iconBtn} title="Edit item">
              <PencilIcon size={15} />
            </Link>
            <ConfirmDeleteForm action={deleteItem} message={`Are you sure you want to delete item "${item.name}"?`}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="containerId" value={item.container.id} />
              <button type="submit" className={styles.iconBtn + " " + styles.btnDanger}>
                <TrashIcon size={15} />
              </button>
            </ConfirmDeleteForm>
          </>
        )
      }
    >
      {success ? <p className={styles.toastOk}>{success}</p> : null}
      <ErrorMessages errors={pageErrors} />

      {/* {warrantyExpiringSoon && (
        <div className={styles.warrantyAlert}>
          <AlertIcon size={16} />
          Warranty expires {item.warranty_expiry}
        </div>
      )} */}

      {item && (
        <>
          <ItemImageSectionPage item={item} />

          <section className={styles.card}>
            <div className={styles.detailsTable}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Category</span>
                <span className={styles.detailValue}>{item.category?.name ?? "—"}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Container</span>
                <Link href={`/containers/${item.container.id}`} className={styles.detailValue} style={{ color: "#2563eb", textDecoration: "none" }}>
                  {item.container.name}
                </Link>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Quantity</span>
                <span className={styles.detailValue}>{item.quantity ?? 1}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Unit Cost</span>
                <span className={styles.detailValue}>${Number(item.unit_cost ?? 0).toFixed(2)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Total Value</span>
                <span className={styles.detailValue}>{totalValue}</span>
              </div>
              {item.purchase_date && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Purchased</span>
                  <span className={styles.detailValue}>{item.purchase_date}</span>
                </div>
              )}
              {/* {item.warranty_expiry && <div className={styles.detailRow}><span className={styles.detailLabel}>Warranty</span><span className={styles.detailValue}>{item.warranty_expiry}</span></div>} */}
            </div>
            {item.notes && <p style={{ margin: "0.6rem 0 0", fontSize: "0.82rem", color: "#475569" }}>{item.notes}</p>}
          </section>

          <section className={styles.card}>
            <div className={styles.controlsActions}>
              <form action={cloneItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <button type="submit" className={styles.btnSecondary} title="Clone item">
                  <CopyIcon size={15} />
                  Clone Item
                </button>
              </form>
              <Link href={`/items/${item.id}/edit`} className={styles.btnSecondary}>
                <PencilIcon size={15} />
                Edit Item
              </Link>
              <ConfirmDeleteForm action={deleteItem} message={`Are you sure you want to delete item "${item.name}"?`}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="containerId" value={item.container.id} />
                <button type="submit" className={styles.btnDanger}>
                  <TrashIcon size={15} />
                  Delete Item
                </button>
              </ConfirmDeleteForm>
            </div>
          </section>
        </>
      )}
    </MobileShell>
  );
}
