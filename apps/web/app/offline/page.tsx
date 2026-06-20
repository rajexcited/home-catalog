import Link from "next/link";

import { MobileShell } from "@/components/mobile-shell";
import styles from "@/app/offline/offline.module.css";

export default function OfflinePage() {
  return (
    <MobileShell title="Offline" subtitle="PWA fallback view" activeNav="home">
      <section className={styles.panel}>
        <p className={styles.icon}>☁</p>
        <p className={styles.title}>You are offline</p>
        <p className={styles.subtitle}>Cached containers and items remain available while your network reconnects.</p>
        <Link href="/" className={styles.link}>
          View Cached Data
        </Link>
      </section>
    </MobileShell>
  );
}
