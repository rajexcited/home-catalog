"use client";

import { useState } from "react";
import { createContainerType, renameContainerType } from "@/app/actions";
import { PencilIcon, PlusIcon } from "@/components/icons";
import styles from "./container-types.module.css";

export type ContainerTypeItem = {
  key: string;
  name: string;
  description: string;
  containerCount: number;
  ids: string[];
  containerIds: string[];
};

type Props = { types: ContainerTypeItem[] };

export default function ContainerTypesManager({ types }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Types ({types.length})</h2>
        <button
          type="button"
          className={styles.newBtn}
          aria-expanded={isCreating}
          onClick={() => {
            setEditingKey(null);
            setIsCreating((open) => !open);
          }}
        >
          {isCreating ? (
            "Close"
          ) : (
            <>
              <PlusIcon size={14} />
              New Type
            </>
          )}
        </button>
      </div>

      {types.length === 0 && !isCreating && <p className={styles.empty}>No container types yet. Create one or add a container with a type field.</p>}

      <div className={styles.typeGrid}>
        {isCreating && (
          <form action={createContainerType} className={`${styles.form} ${styles.typeCard} ${styles.editCard}`} onSubmit={() => setIsCreating(false)}>
            <label className={styles.label}>Name *</label>
            <input name="name" placeholder="e.g. Shelf" className={styles.input} required />

            <label className={styles.label}>Description</label>
            <textarea name="description" placeholder="Describe this container type" className={styles.textarea} />

            <div className={styles.editActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary}>
                Create Type
              </button>
            </div>
          </form>
        )}

        {types.map((type) =>
          editingKey === type.key ? (
            <form
              key={type.key}
              action={renameContainerType}
              className={`${styles.form} ${styles.typeCard} ${styles.editCard}`}
              onSubmit={() => setEditingKey(null)}
            >
              <input type="hidden" name="oldTypeName" value={type.name} />
              {type.ids.map((id) => (
                <input key={id} type="hidden" name="typeId" value={id} />
              ))}

              <label className={styles.label}>Name *</label>
              <input name="newTypeName" defaultValue={type.name} className={styles.input} required />

              <label className={styles.label}>Description</label>
              <textarea name="typeDescription" defaultValue={type.description} className={styles.textarea} />

              <div className={styles.editActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setEditingKey(null)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div key={type.key} className={styles.typeCard}>
              <div className={styles.typeHeader}>
                <div>
                  <p className={styles.typeName}>{type.name}</p>
                  <p className={styles.typeCount}>
                    {type.containerCount} container{type.containerCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={`Edit ${type.name}`}
                  onClick={() => {
                    setIsCreating(false);
                    setEditingKey(type.key);
                  }}
                >
                  <PencilIcon size={15} />
                </button>
              </div>
              {type.description && <p className={styles.typeDescription}>{type.description}</p>}
            </div>
          )
        )}
      </div>
    </section>
  );
}
