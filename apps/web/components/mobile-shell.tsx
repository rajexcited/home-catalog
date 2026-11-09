import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon, HomeIcon, SearchIcon, BellIcon, AddContainerIcon, AddItemIcon, MenuIcon } from "@/components/icons";
import styles from "@/components/mobile-shell.module.css";

export type NavKey = "home" | "search" | "addContainer" | "addItem" | "activity" | "more";

export type MobileShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  activeNav: NavKey;
  backHref?: string;
  headerActions?: ReactNode;
  navParams?: string;
};

export function MobileShell({ title, subtitle, children, activeNav, backHref, headerActions, navParams }: MobileShellProps) {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {backHref ? (
          <header className={styles.pageHeader}>
            <Link href={backHref} className={styles.backBtn} aria-label="Go back">
              <ArrowLeftIcon size={20} />
            </Link>
            <h1 className={styles.pageTitle}>{title}</h1>
            <div className={styles.pageActions}>{headerActions ?? null}</div>
          </header>
        ) : (
          <header className={styles.dashHeader}>
            <div>
              <p className={styles.appLabel}>Home Catalog</p>
              <h1 className={styles.dashTitle}>{title}</h1>
              {subtitle ? <p className={styles.dashSubtitle}>{subtitle}</p> : null}
            </div>
            {headerActions ? <div className={styles.dashActions}>{headerActions}</div> : null}
          </header>
        )}
        <div className={styles.content}>{children}</div>
      </div>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          <li className={styles.navItem}>
            <Link href={`/${navParams ? `?${navParams}` : ""}`} className={`${styles.navLink} ${activeNav === "home" ? styles.active : ""}`}>
              <HomeIcon size={21} />
              <span>Home</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href={`/search?${navParams ? `?${navParams}` : ""}`} className={`${styles.navLink} ${activeNav === "search" ? styles.active : ""}`}>
              <SearchIcon size={21} />
              <span>Search</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href={`/containers/add${navParams ? `?${navParams}` : ""}`}
              className={`${styles.navLink} ${styles.addLink} ${styles.folderIconLink} ${activeNav === "addContainer" ? styles.active : ""}`}
              aria-label="Add new container"
            >
              <AddContainerIcon size={21} />
              <span>Container</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href={`/items/add${navParams ? `?${navParams}` : ""}`}
              className={`${styles.navLink} ${styles.addLink} ${activeNav === "addItem" ? styles.active : ""}`}
              aria-label="Add new item"
            >
              <AddItemIcon size={21} />
              <span>Item</span>
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href={`/activity${navParams ? `?${navParams}` : ""}`} className={`${styles.navLink} ${activeNav === "activity" ? styles.active : ""}`}>
              <BellIcon size={21} />
              <span>Activity</span>
            </Link>
          </li>
          <li className={`${styles.navItem} ${styles.moreNavItem}`}>
            <details className={styles.moreMenu}>
              <summary className={`${styles.navLink} ${styles.moreTrigger} ${activeNav === "more" ? styles.active : ""}`}>
                <MenuIcon size={21} />
                <span>More</span>
              </summary>
              <ul className={styles.moreMenuList}>
                <li>
                  <Link href="/containers/types" className={styles.moreMenuLink}>
                    Container Types
                  </Link>
                </li>
                <li>
                  <Link href="/items/categories" className={styles.moreMenuLink}>
                    Item Categories
                  </Link>
                </li>
                <li>
                  <Link href="/containers" className={styles.moreMenuLink}>
                    Containers
                  </Link>
                </li>
                <li>
                  <Link href="/search?tab=items" className={styles.moreMenuLink}>
                    Items
                  </Link>
                </li>
                <li>
                  <Link href="/locations" className={styles.moreMenuLink}>
                    Locations
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className={styles.moreMenuLink}>
                    Profile
                  </Link>
                </li>
              </ul>
            </details>
          </li>
        </ul>
      </nav>
    </main>
  );
}
