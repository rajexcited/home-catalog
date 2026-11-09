import Link from "next/link";
import type { ItemReadResource } from "../services/item-service";
import styles from "./item-row.module.css";
import { BoxIcon, CopyIcon, DotsVerticalIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { itemValue } from "../api/sort-utils";
import { formatCurrency } from "../api/formatters";
import { cloneItem, deleteItem } from "@/app/actions";
import ConfirmDeleteForm from "@/components/confirm-delete-form";

export type ItemRowProps = ItemReadResource & {
  includeEditAction?: boolean;
};

export default function ItemRow(itemRow: ItemRowProps) {
  const thumb_url = itemRow.images.length > 0 ? itemRow.images[0].public_url : null;
  const value = itemValue(itemRow);
  return (
    <li className={styles.itemListRow}>
      <Link href={`/items/${itemRow.id}`} className={styles.itemRow}>
        {thumb_url ? (
          <img src={thumb_url} alt={itemRow.name} className={styles.itemThumb} />
        ) : (
          <span className={styles.itemThumbPlaceholder}>
            <BoxIcon size={18} />
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className={styles.itemName}>{itemRow.name}</p>
          <p className={styles.itemMeta}>{itemRow.category?.name ?? "Uncategorized"}</p>
          <p className={styles.itemPrice}>
            {formatCurrency(value)} · Qty {itemRow.quantity ?? 1}
          </p>
        </div>
      </Link>
      {itemRow.includeEditAction && (
        <details className={styles.mobileActions}>
          <summary className={styles.moreBtn} aria-label="More actions">
            <DotsVerticalIcon size={16} />
          </summary>
          <div className={styles.mobileMenu}>
            <Link href={`/items/${itemRow.id}/edit`} className={styles.mobileMenuAction}>
              <PencilIcon size={14} />
              <span>Edit</span>
            </Link>
            <form action={cloneItem} className={styles.mobileMenuForm}>
              <input type="hidden" name="itemId" value={itemRow.id} />
              <button type="submit" className={styles.mobileMenuAction}>
                <CopyIcon size={14} />
                <span>Clone</span>
              </button>
            </form>
            <ConfirmDeleteForm action={deleteItem} message={`Are you sure you want to delete item "${itemRow.name}"?`} className={styles.mobileMenuForm}>
              <input type="hidden" name="id" value={itemRow.id} />
              <input type="hidden" name="containerId" value={itemRow.container?.id ?? ""} />
              <button type="submit" className={`${styles.mobileMenuAction} ${styles.mobileMenuActionDanger}`}>
                <TrashIcon size={14} />
                <span>Delete</span>
              </button>
            </ConfirmDeleteForm>
          </div>
        </details>
      )}
    </li>
  );
}
