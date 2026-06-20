import { redirect } from "next/navigation";

import { MobileShell } from "@/components/mobile-shell";
import { BoxIcon, FolderIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/activity/activity.module.css";

type Entry = { id: string; text: string; time: string; type: "item" | "container" };

function groupByDate(entries: Entry[]) {
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const d = new Date(e.time);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const label = d >= today ? "Today" : d >= yesterday ? "Yesterday"
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(e);
  }
  return groups;
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: recentItems }, { data: recentContainers }] = await Promise.all([
    supabase.from("items").select("id, name, created_at, containers(name)").eq("owner_user_id", user.id).order("created_at", { ascending: false }).limit(15),
    supabase.from("containers").select("id, name, created_at").eq("owner_user_id", user.id).order("created_at", { ascending: false }).limit(10),
  ]);

  const entries: Entry[] = [
    ...(recentContainers ?? []).map(c => ({ id: "c-" + c.id, text: `Created container ${c.name}`, time: c.created_at, type: "container" as const })),
    ...(recentItems ?? []).map(i => {
      const cont = i.containers && !Array.isArray(i.containers) ? (i.containers as { name: string }).name : "";
      return { id: "i-" + i.id, text: `Added ${i.name}${cont ? ` to ${cont}` : ""}`, time: i.created_at, type: "item" as const };
    }),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 25);

  const groups = groupByDate(entries);

  return (
    <MobileShell title="Activity" activeNav="activity">
      {groups.size === 0 && <p className={styles.empty}>No activity yet. Add containers and items to start your audit trail.</p>}
      {Array.from(groups.entries()).map(([date, dayEntries]) => (
        <section key={date} className={styles.group}>
          <p className={styles.groupDate}>{date}</p>
          {dayEntries.map(e => {
            const Icon = e.type === "item" ? BoxIcon : FolderIcon;
            const dotClass = e.type === "item" ? styles.dotBlue : styles.dotAmber;
            return (
              <div key={e.id} className={styles.entry}>
                <span className={`${styles.entryDot} ${dotClass}`}><Icon size={14} /></span>
                <div className={styles.entryBody}>
                  <p className={styles.entryText}><strong>You</strong> {e.text}</p>
                  <p className={styles.entryTime}>{relativeTime(e.time)}</p>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </MobileShell>
  );
}
