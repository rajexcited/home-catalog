import { MobileShell } from "@/components/mobile-shell";
import { FilterIcon } from "@/components/icons";
import styles from "@/app/search/search.module.css";

export default function SearchLoading() {
  return (
    <MobileShell
      title="Search"
      activeNav="search"
      headerActions={
        <span className={styles.iconBtn}>
          <FilterIcon size={16} />
        </span>
      }
    >
      <div className={`${styles.skeletonBlock} ${styles.skeletonSearch}`} />
      <div className={`${styles.skeletonBlock} ${styles.skeletonToggle}`} />

      <section className={styles.card} aria-busy="true" aria-label="Loading search results">
        <h2 className={styles.sectionTitle}>Items</h2>
        <ul className={styles.resultList}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <li key={idx} className={styles.skeletonItem}>
              <div className={`${styles.skeletonBlock} ${styles.skeletonThumb}`} />
              <div className={styles.skeletonText}>
                <div className={`${styles.skeletonBlock} ${styles.skeletonLineLg}`} />
                <div className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`} />
              </div>
              <div className={`${styles.skeletonBlock} ${styles.skeletonPrice}`} />
            </li>
          ))}
        </ul>
      </section>
    </MobileShell>
  );
}
