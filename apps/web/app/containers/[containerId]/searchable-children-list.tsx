"use client";

import { useMemo, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";
import type { ContainerOrItem } from "@/app/api/sort-utils";
import styles from "@/app/containers/[containerId]/container-items.module.css";
import ContainerRow from "../container-row";
import ItemRow from "@/app/items/item-row";

type SearchableChildrenListProps = {
  childrenList: ContainerOrItem[];
  includeEditAction?: boolean;
};

export default function SearchableChildrenList({ childrenList, includeEditAction }: SearchableChildrenListProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredChildren = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return childrenList;
    }

    return childrenList.filter((entry) => entry.name.toLowerCase().includes(normalizedQuery));
  }, [childrenList, query]);

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <>
      <label className={styles.searchWrap}>
        <SearchIcon size={16} className={styles.searchIcon} />
        <input
          ref={inputRef}
          name="q"
          placeholder="Search name"
          className={styles.searchInput}
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query.length > 0 && (
          <button type="button" className={styles.clearSearchBtn} onClick={handleClear} aria-label="Clear search">
            Clear
          </button>
        )}
      </label>

      {filteredChildren.length === 0 && <p className={styles.empty}>No items or sub-containers found.</p>}

      {filteredChildren.length > 0 && (
        <section className={styles.card}>
          <ul className={styles.itemList}>
            {filteredChildren.map((entry) =>
              entry.type === "item" ? (
                <ItemRow key={entry.id} {...entry} includeEditAction={includeEditAction} />
              ) : (
                <ContainerRow key={entry.id} {...entry} includeEditAction={includeEditAction} />
              )
            )}
          </ul>
        </section>
      )}
    </>
  );
}
