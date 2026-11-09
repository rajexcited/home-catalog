import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import styles from "./new-container.module.css";
import { createContainer } from "@/app/actions";
import { PlusIcon } from "@/components/icons";
import { getUserId } from "../../services/user-service";
import { ContainerReadResource } from "../../services/container-service";
import { MobileShell } from "@/components/mobile-shell";
import ErrorMessages from "@/components/error-messages";
import EditContainerFormSection, { getDistinctValues } from "../edit-container-form-section";
import { getBackUrl } from "../../api/url-utils";

export type AddContainerPageProps = { searchParams: Promise<{ error?: string; parentId?: string }> };

export default async function AddContainerPageWithoutParent({ searchParams }: AddContainerPageProps) {
  const { error, parentId } = await searchParams;
  const supabase = createClient();
  const userId = await getUserId(supabase);

  if (!userId) {
    redirect("/sign-in");
  }

  const distinctValues = await getDistinctValues(supabase);
  const pageErrors = [...(error?.split(",") ?? []), ...distinctValues.errors];

  const backHref = (await getBackUrl()) ?? "/dashboard";
  const newContainer: ContainerReadResource = {
    id: "",
    name: "",
    type: "container",
    container_type: { id: "", name: "" },
    location: null,
    notes: "",
    created_at: "",
    updated_at: "",
    tags: [],
    parent: { id: parentId ?? "", name: "" },
    child_containers: { ids: [], children: [], total: 0, total_cost: 0 },
    child_items: { ids: [], total: 0, total_cost: 0 },
    created_by: null,
    updated_by: null,
    owner_user_id: userId,
    permission: "write",
    priority: null,
    shared_at: null,
    shared_by: null,
    status: "enabled",
    status_changed_at: null,
    status_changed_by: null,
    status_changed_reason: null,
    unit_cost: null
  };

  return (
    <MobileShell title="Add Container" activeNav="addContainer" backHref={backHref}>
      <ErrorMessages errors={pageErrors} />
      <section className={styles.card}>
        {/* <h2 className={styles.sectionTitle}>New Container</h2> */}
        <form action={createContainer} className={styles.form}>
          <EditContainerFormSection container={newContainer} distinctValues={distinctValues} />

          <button type="submit" className={styles.btnPrimary}>
            <PlusIcon size={16} />
            Create Container
          </button>
        </form>
      </section>
    </MobileShell>
  );
}
