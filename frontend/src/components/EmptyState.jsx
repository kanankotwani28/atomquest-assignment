import { Target, Users, ClipboardCheck, Search, Bell, FolderOpen, CheckCircle2, AlertCircle } from "lucide-react";

const ICON_MAP = {
  goal: Target,
  team: Users,
  checkin: ClipboardCheck,
  search: Search,
  notification: Bell,
  folder: FolderOpen,
  success: CheckCircle2,
  error: AlertCircle,
};

const MESSAGES = {
  goals: { title: "No goals yet", sub: "Create your first goal to start tracking progress" },
  team: { title: "No team members", sub: "Your manager hasn't assigned any direct reports yet" },
  checkins: { title: "No check-ins available", sub: "Check back when a check-in window opens" },
  search: { title: "No results found", sub: "Try adjusting your search or filters" },
  notification: { title: "You're all caught up", sub: "No new notifications at this time" },
  folder: { title: "Nothing here yet", sub: "Data will appear here once it's available" },
  success: { title: "All done!", sub: "There's nothing pending right now" },
  error: { title: "Something went wrong", sub: "Please try again or contact support" },
};

export default function EmptyState({ icon = "folder", title, sub, action }) {
  const Icon = ICON_MAP[icon] || FolderOpen;
  const msg = MESSAGES[icon] || {};

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px", textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "rgba(99,102,241,0.08)",
        border: "1px solid rgba(99,102,241,0.15)",
        display: "grid", placeItems: "center", marginBottom: 16,
      }}>
        <Icon size={22} strokeWidth={1.5} style={{ color: "#6366F1" }} />
      </div>
      <h3 style={{
        fontSize: 15, fontWeight: 600, color: "#F8FAFC",
        marginBottom: 6, margin: "0 0 6px",
      }}>
        {title || msg.title}
      </h3>
      <p style={{
        fontSize: 12, color: "#475569", lineHeight: 1.6,
        margin: 0, maxWidth: 280,
      }}>
        {sub || msg.sub}
      </p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}