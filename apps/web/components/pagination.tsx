import React, { useMemo } from "react";
import styles from "@/components/pagination.module.css";

type ViewMode = "container" | "item";

type PaginationProps<T> = {
  items: T[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  renderCard: (item: T, index: number) => React.ReactNode;
  viewMode: ViewMode;
  className?: string;
};

function Pagination<T>({ items, currentPage, pageSize, onPageChange, renderCard, viewMode, className }: PaginationProps<T>) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const pagedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, pageSize, safeCurrentPage]);

  const pages = useMemo(() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const visible = [1];
    const left = Math.max(2, safeCurrentPage - 1);
    const right = Math.min(totalPages - 1, safeCurrentPage + 1);

    if (left > 2) visible.push(-1);
    for (let p = left; p <= right; p++) visible.push(p);
    if (right < totalPages - 1) visible.push(-2);

    visible.push(totalPages);
    return visible;
  }, [safeCurrentPage, totalPages]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) return;
    onPageChange(page);
  };

  return (
    <section className={`${styles["pagination-root"]} ${className ?? ""}`.trim()}>
      <div className={`${styles["cards-grid"]} ${styles[viewMode]}`}>
        {pagedItems.map((item, index) => (
          <article className={styles["card"]} key={index}>
            {renderCard(item, index)}
          </article>
        ))}
      </div>

      <nav className={styles["pagination-nav"]} aria-label="Pagination Navigation">
        <button type="button" className={styles["page-btn"]} onClick={() => handlePageChange(safeCurrentPage - 1)} disabled={safeCurrentPage === 1}>
          Prev
        </button>

        {pages.map((page, idx) =>
          page < 0 ? (
            <span key={`ellipsis-${idx}`} className={styles["ellipsis"]} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              type="button"
              key={page}
              onClick={() => handlePageChange(page)}
              className={`${styles["page-btn"]} ${page === safeCurrentPage ? styles["active"] : ""}`}
              aria-current={page === safeCurrentPage ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}

        <button type="button" className={styles["page-btn"]} onClick={() => handlePageChange(safeCurrentPage + 1)} disabled={safeCurrentPage === totalPages}>
          Next
        </button>
      </nav>
    </section>
  );
}

export default Pagination;
