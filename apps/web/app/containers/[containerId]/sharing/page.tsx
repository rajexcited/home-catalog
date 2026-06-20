import { redirect } from "next/navigation";

import { MobileShell } from "@/components/mobile-shell";
import { PeopleIcon, PlusIcon, LinkIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/containers/[containerId]/sharing/sharing.module.css";

type Props = { params: Promise<{ containerId: string }> };

export default async function ContainerSharingPage({ params }: Props) {
  const { containerId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: container } = await supabase.from("containers").select("id, name").eq("id", containerId).eq("owner_user_id", user.id).single();
  if (!container) redirect("/containers?error=Container not found");

  const { data: profile } = await supabase.from("users").select("display_name, email").eq("id", user.id).single();
  const displayName = profile?.display_name ?? profile?.email ?? user.email ?? "You";
  const initials = displayName
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <MobileShell
      title={container.name}
      activeNav="more"
      backHref={`/containers/${containerId}/details`}
      headerActions={
        <button
          className={styles.btnSecondary}
          style={{ gap: "0.3rem", fontSize: "0.78rem", padding: "0 0.6rem", minHeight: "2rem", display: "flex", alignItems: "center" }}
        >
          <PlusIcon size={14} />
          Invite
        </button>
      }
    >
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Members</h2>
        <ul className={styles.memberList}>
          <li>
            <div className={styles.memberRow}>
              <div className={styles.memberAvatar}>{initials}</div>
              <div>
                <p className={styles.memberName}>{displayName} (You)</p>
                <p className={styles.memberRole}>Owner</p>
              </div>
              <span className={`${styles.roleBadge} ${styles.roleOwner}`}>Owner</span>
            </div>
          </li>
        </ul>
        <p style={{ marginTop: "0.6rem", fontSize: "0.78rem", color: "#94a3b8" }}>
          Multi-user sharing requires a members table. Run the members migration to enable invites.
        </p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Invite Link</h2>
        <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", color: "#64748b" }}>Share a link so others can request access.</p>
        <div className={styles.inviteBox}>
          <LinkIcon size={15} style={{ flexShrink: 0, color: "#94a3b8" }} />
          <span className={styles.inviteLink}>Invite links require backend configuration.</span>
        </div>
      </section>
    </MobileShell>
  );
}
