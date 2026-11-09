import Link from "next/link";
import styles from "@/app/public-page.module.css";
import commonStyles from "@/app/common.module.css";
import ErrorMessages from "@/components/error-messages";

export type NullableError = string | null | undefined;

export default async function PublicHomePage({ success, errors }: { success?: string; errors: NullableError[] }) {
  return (
    <main className={styles.publicPage}>
      <section className={styles.publicWrap}>
        <article className={styles.publicHero}>
          <p className={styles.publicLabel}>Home Catalog</p>
          <h1 className={styles.publicTitle}>Know what you own and where it lives.</h1>
          <p className={styles.publicBody}>A private household inventory for containers, items, photos, and value tracking.</p>
          {success && <p className={commonStyles.toastOk}>{success}</p>}
          <ErrorMessages errors={errors} />

          <div className={styles.publicActions}>
            <Link href="/sign-in" className={styles.publicAction}>
              Sign in to continue
            </Link>
            <p className={styles.publicHint}>Sign-up is disabled. Access is invite-only. Contact Admin for invitation.</p>
          </div>
        </article>
        {/* <article className={styles.publicCollageCard}>
          <Image src="/public-collage.svg" alt="App preview" width={1200} height={760} priority className={styles.publicCollageImage} />
        </article> */}
        <section className={styles.publicPoints}>
          <article className={styles.publicPoint}>
            <p className={styles.publicPointTitle}>Organize by place</p>
            <p className={styles.publicPointBody}>Track rooms, shelves, boxes, and nested containers.</p>
          </article>
          <article className={styles.publicPoint}>
            <p className={styles.publicPointTitle}>Find items quickly</p>
            <p className={styles.publicPointBody}>Search by name and jump directly to item details.</p>
          </article>
          <article className={styles.publicPoint}>
            <p className={styles.publicPointTitle}>Keep visual records</p>
            <p className={styles.publicPointBody}>Attach photos and keep an up-to-date value snapshot.</p>
          </article>
        </section>
      </section>
    </main>
  );
}
