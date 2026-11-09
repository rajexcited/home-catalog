import Link from "next/link";
import styles from "@/app/containers/containers.module.css";
import type { ContainerReadResource } from "../services/container-service";
import { AddContainerIcon, AddItemIcon, DotsVerticalIcon, FolderIcon, LinkIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { deleteContainer } from "@/app/actions";
import ConfirmDeleteForm from "@/components/confirm-delete-form";

export type ContainerRowProps = ContainerReadResource & {
  includeEditAction?: boolean;
};

export default function ContainerRow(containerRow: ContainerRowProps) {
  return (
    <li className={styles.listRow}>
      <Link href={`/containers/${containerRow.id}`} className={styles.listItem}>
        <span className={styles.folderIcon}>
          <FolderIcon size={20} />
        </span>
        <div>
          <p className={styles.itemName}>{containerRow.name + " ( " + containerRow.container_type.name + " ) "}</p>
          <p className={styles.itemMeta}>{containerRow.location || ""}</p>
          <p className={styles.itemMeta}>
            {containerRow.child_containers.total + " container" + (containerRow.child_containers.total > 1 ? "s" : "")}
            {" · "}
            {containerRow.child_items.total + " item" + (containerRow.child_items.total > 1 ? "s" : "")}
          </p>
          {containerRow.shared_by && <p className={styles.itemMeta}>Shared by {containerRow.shared_by.display_name}</p>}
        </div>
      </Link>
      {containerRow.includeEditAction && (
        <details className={styles.mobileActions}>
          <summary className={styles.moreBtn} aria-label="More actions">
            <DotsVerticalIcon size={16} />
          </summary>
          <div className={styles.mobileMenu}>
            <Link href={`/containers/${containerRow.id}`} className={styles.mobileMenuAction}>
              <LinkIcon size={14} />
              <span>View</span>
            </Link>
            <Link href={`/containers/${containerRow.id}/edit`} className={styles.mobileMenuAction}>
              <PencilIcon size={14} />
              <span>Edit</span>
            </Link>
            <Link href={`/items/new?containerId=${containerRow.id}&returnTo=/containers/${containerRow.id}`} className={styles.mobileMenuAction}>
              <AddItemIcon size={14} />
              <span>Add item</span>
            </Link>
            <Link href={`/containers/add?parentId=${containerRow.id}&returnTo=/containers/${containerRow.id}`} className={styles.mobileMenuAction}>
              <AddContainerIcon size={14} />
              <span>Add container</span>
            </Link>
            <ConfirmDeleteForm
              action={deleteContainer}
              message={`Are you sure you want to delete container "${containerRow.name}"?`}
              className={styles.mobileMenuForm}
            >
              <input type="hidden" name="id" value={containerRow.id} />
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
