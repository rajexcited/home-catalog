import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import styles from "../../add/new-container.module.css";
import { deleteContainer, updateContainer } from "@/app/actions";
import { PlusIcon, ShareIcon, TrashIcon } from "@/components/icons";
import { getUserId } from "../../../services/user-service";
import { ContainerReadResource, getContainers } from "../../../services/container-service";
import { MobileShell } from "@/components/mobile-shell";
import ErrorMessages from "@/components/error-messages";
import EditContainerFormSection, { getDistinctValues } from "../../edit-container-form-section";
import Link from "next/link";
import { getBackUrl } from "@/app/api/url-utils";
import ConfirmDeleteForm from "@/components/confirm-delete-form";

export type EditContainerPageProps = { params: Promise<{ containerId: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditContainerPage({ params, searchParams }: EditContainerPageProps) {
  const { error } = await searchParams;
  const { containerId } = await params;
  const supabase = createClient();
  const userId = await getUserId(supabase);

  if (!userId) {
    redirect("/sign-in");
  }

  const distinctValues = await getDistinctValues(supabase);
  const pageErrors = [...(error?.split(",") ?? []), ...distinctValues.errors];

  const { containers, error: containersError } = await getContainers([containerId], supabase);
  const backHref = (await getBackUrl()) ?? `/containers/${containerId}`;

  if (containersError) {
    redirect(`/containers/${containerId}?error=Error fetching container data. ${containersError ?? ""}`);
  }
  if (containers.list.length === 0) {
    redirect(`${backHref}?error=Container not found`);
  }
  const container: ContainerReadResource = containers.list[0];

  return (
    <MobileShell
      title={"Edit Container: " + (container.name ?? "")}
      activeNav="more"
      backHref={backHref}
      headerActions={
        <>
          <Link href={`/containers/${containerId}/sharing`} className={styles.iconBtn} aria-label="Sharing">
            <ShareIcon size={17} />
          </Link>
          <ConfirmDeleteForm action={deleteContainer} message={`Are you sure you want to delete container "${container.name}"?`}>
            <input type="hidden" name="id" value={container.id} />
            <button type="submit" className={styles.iconBtn}>
              <TrashIcon size={17} />
            </button>
          </ConfirmDeleteForm>
        </>
      }
    >
      <ErrorMessages errors={pageErrors} />

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Location</p>
          <p className={styles.statValue}>{container.location ?? "—"}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Type</p>
          <p className={styles.statValue} style={{ fontSize: "0.7rem" }}>
            {container.container_type?.name ?? "—"}
          </p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Items</p>
          <p className={styles.statValue}>
            {container.child_items.total} (${container.child_items.total_cost.toFixed(2)})
          </p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Sub-Containers</p>
          <p className={styles.statValue}>
            {container.child_containers.total} (${container.child_containers.total_cost.toFixed(2)})
          </p>
        </div>
      </div>

      <section className={styles.card}>
        <form action={updateContainer} className={styles.form}>
          <input name="id" type="hidden" value={container.id} readOnly />
          <EditContainerFormSection container={container} distinctValues={distinctValues} />

          <div className={styles.auditRow}>
            <p className={styles.auditLabel}>Created By: </p>
            <p className={styles.auditValue}>{container.created_by?.display_name ?? "Unknown"}</p>
          </div>
          <div className={styles.auditRow}>
            <p className={styles.auditLabel}>Created At: </p>
            <p className={styles.auditValue}>{new Date(container.created_at).toLocaleString()}</p>
          </div>
          <div className={styles.auditRow}>
            <p className={styles.auditLabel}>Updated At: </p>
            <p className={styles.auditValue}>{new Date(container.updated_at).toLocaleString()}</p>
          </div>

          <button type="submit" className={styles.btnPrimary}>
            <PlusIcon size={15} />
            Save Changes
          </button>
        </form>
      </section>

      <section className={styles.card}>
        {/* <button className={styles.btnSecondary}>Reset Values</button> */}
        <Link href={`/containers/${containerId}`} className={styles.btnSecondary}>
          Cancel
        </Link>
      </section>

      <section className={styles.card}>
        <ConfirmDeleteForm action={deleteContainer} message={`Are you sure you want to delete container "${container.name}"?`}>
          <input type="hidden" name="id" value={container.id} />
          <button type="submit" className={styles.btnDanger}>
            Delete Container
          </button>
        </ConfirmDeleteForm>
      </section>
    </MobileShell>
  );
}
