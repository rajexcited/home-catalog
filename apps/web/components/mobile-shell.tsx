import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowLeftIcon, HomeIcon, SearchIcon, PlusIcon, BellIcon, MenuIcon } from "@/components/icons";
import styles from "@/components/mobile-shell.module.css";

export type NavKey = "home" | "search" | "add" | "activity" | "more";

export type MobileShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  activeNav: NavKey;
  backHref?: string;
  headerActions?: ReactNode;
};

export function MobileShell({ title, subtitle, children, activeNav, backHref, headerActions }: MobileShellProps) {
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
          <li>
            <Link href="/" className={`${styles.navLink} ${activeNav === "home" ? styles.active : ""}`}>
              <HomeIcon size={21} />
              <span>Home</span>
            </Link>
          </li>
          <li>
            <Link href="/search" className={`${styles.navLink} ${activeNav === "search" ? styles.active : ""}`}>
              <SearchIcon size={21} />
              <span>Search</span>
            </Link>
          </li>
          <li className={styles.addItem}>
            <Link href="/items/new" className={styles.addBtn} aria-label="Add new item">
              <PlusIcon size={22} />
            </Link>
          </li>
          <li>
            <Link href="/activity" className={`${styles.navLink} ${activeNav === "activity" ? styles.active : ""}`}>
              <BellIcon size={21} />
              <span>Activity</span>
            </Link>
          </li>
          <li>
            <Link href="/profile" className={`${styles.navLink} ${activeNav === "more" ? styles.active : ""}`}>
              <MenuIcon size={21} />
              <span>More</span>
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
