"use client";

import { useState } from "react";
import { createItemCategory, renameItemCategory } from "@/app/actions";
import { PencilIcon, PlusIcon } from "@/components/icons";
import styles from "./item-categories.module.css";

export type ItemCategoryItem = {
  itemIds: string[];
  key: string;
  name: string;
  description: string;
  itemCount: number;
  ids: string[];
};

type Props = { categories: ItemCategoryItem[] };

export default function ItemCategoriesManager({ categories }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Categories ({categories.length})</h2>
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
              New Category
            </>
          )}
        </button>
      </div>

      {categories.length === 0 && !isCreating && <p className={styles.empty}>No categories yet. Create one or add an item with a category field.</p>}

      <div className={styles.catGrid}>
        {isCreating && (
          <form action={createItemCategory} className={`${styles.form} ${styles.catCard} ${styles.editCard}`} onSubmit={() => setIsCreating(false)}>
            <label className={styles.label}>Name *</label>
            <input name="name" placeholder="e.g. Kitchen" className={styles.input} required />

            <label className={styles.label}>Description</label>
            <textarea name="description" placeholder="Describe this category" className={styles.textarea} />

            <div className={styles.editActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary}>
                Create Category
              </button>
            </div>
          </form>
        )}

        {categories.map((category) =>
          editingKey === category.key ? (
            <form
              key={category.key}
              action={renameItemCategory}
              className={`${styles.form} ${styles.catCard} ${styles.editCard}`}
              onSubmit={() => setEditingKey(null)}
            >
              <input type="hidden" name="oldCategory" value={category.name} />
              {category.ids.map((id) => (
                <input key={id} type="hidden" name="categoryId" value={id} />
              ))}

              <label className={styles.label}>Name *</label>
              <input name="newCategory" defaultValue={category.name} className={styles.input} required />

              <label className={styles.label}>Description</label>
              <textarea name="categoryDescription" defaultValue={category.description} className={styles.textarea} />

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
            <div key={category.key} className={styles.catCard}>
              <div className={styles.catHeader}>
                <div>
                  <p className={styles.catName}>{category.name}</p>
                  <p className={styles.catCount}>
                    {category.itemCount} item{category.itemCount !== 1 ? "s" : ""}
                  </p>
                </div>
                {category.ids.length > 0 && (
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label={`Edit ${category.name}`}
                    onClick={() => {
                      setIsCreating(false);
                      setEditingKey(category.key);
                    }}
                  >
                    <PencilIcon size={15} />
                  </button>
                )}
              </div>
              {category.description && <p className={styles.catDescription}>{category.description}</p>}
            </div>
          )
        )}
      </div>
    </section>
  );
}
