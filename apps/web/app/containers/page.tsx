import Link from "next/link";
import { redirect } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { AddContainerIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/containers/containers.module.css";
import commonStyles from "@/app/common.module.css";
import { getTopLevelContainers } from "../services/container-service";
import { getUserId } from "../services/user-service";
import ErrorMessages from "@/components/error-messages";
import ContainerRow from "./container-row";

type SearchParams = {
  success?: string;
  error?: string;
};

type Props = { searchParams: Promise<SearchParams> };

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const clampPageSize = (value: number) => Math.min(Math.max(value, 1), MAX_PAGE_SIZE);

const buildPageHref = (page: number, pageSize: number, add: string | undefined) => {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (pageSize !== DEFAULT_PAGE_SIZE) params.set("page_size", String(pageSize));
  if (add === "1") params.set("add", "1");
  const query = params.toString();
  return query ? `/containers?${query}` : "/containers";
};

export default async function ContainersPage({ searchParams }: Props) {
  const { success, error } = await searchParams;
  // const page = parsePositiveInt(params.page, 1);
  // const pageSize = clampPageSize(parsePositiveInt(params.page_size, DEFAULT_PAGE_SIZE));
  // const rangeStart = (page - 1) * pageSize;
  // const rangeEnd = rangeStart + pageSize + 1;

  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) {
    redirect("/sign-in");
  }

  const { topLevelContainers, error: topLevelContainersError } = await getTopLevelContainers(supabase);

  return (
    <MobileShell
      title="Containers"
      activeNav="more"
      headerActions={
        <Link href="/containers/add" className={`${styles.iconBtn} ${styles.folderIcon}`} aria-label="Add container">
          <AddContainerIcon size={17} />
        </Link>
      }
    >
      {success ? <p className={commonStyles.toastOk}>{success}</p> : null}
      <ErrorMessages errors={[error, topLevelContainersError]} />

      <section className={styles.list}>
        {topLevelContainers.list.length === 0 && <p className={styles.empty}>No containers yet. Create your first one.</p>}
        {topLevelContainers.list.length > 0 && <h2 className={styles.sectionTitle}> {topLevelContainers.list.length} Top Containers</h2>}

        <ul className={styles.list}>
          {topLevelContainers.list.map((container) => (
            <ContainerRow key={container.id} {...container} includeEditAction={true} />
          ))}
        </ul>
      </section>
    </MobileShell>
  );
}
