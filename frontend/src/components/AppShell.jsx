import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Target,
  ClipboardCheck,
  Users,
  TrendingUp,
  History,
  Lock,
  RefreshCw,
  Share2,
  LogOut,
  ChevronRight,
} from "lucide-react";

const MENU = {
  EMPLOYEE: [
    { label: "My Goals",      to: "/employee/dashboard" },
    { label: "Check-ins",     to: "/employee/checkins" },
  ],
  MANAGER: [
    { label: "Team Overview",  to: "/manager/dashboard" },
    { label: "Team Check-ins", to: "/manager/checkins" },
  ],
  ADMIN: [
    { label: "Overview",      to: "/admin/dashboard" },
    { label: "Analytics",    to: "/admin/dashboard" },
    { label: "Escalation",     to: "/admin/dashboard" },
    { label: "Cycles",         to: "/admin/dashboard" },
  ],
};

const ICON_MAP = {
  "My Goals":        Target,
  "Check-ins":       ClipboardCheck,
  "Team Overview":   Users,
  "Team Check-ins":  ClipboardCheck,
  "Overview":        LayoutDashboard,
  "Analytics":       LayoutDashboard,
  "Escalation":      LayoutDashboard,
  "Cycles":          RefreshCw,
  "Shared Goals":    Share2,
  "Completion":      TrendingUp,
  "Audit Trail":     History,
  "Unlock Goals":    Lock,
};

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase()).join("") || "AQ";
}

const AtomQuestLogo = () => (
  <div className="admin-logo">
    <div className="admin-logo-mark" style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #4F46E5, #6366F1)", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, boxShadow: "0 0 14px rgba(91,76,240,0.28)", flexShrink: 0 }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1.4" opacity="0.7"/>
        <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1.4" strokeDasharray="3.5 2" opacity="0.4"/>
        <circle cx="7" cy="7" r="1.8" fill="white"/>
      </svg>
    </div>
    <div>
      <div className="admin-logo-text" style={{ fontSize: 15 }}>AtomQuest</div>
      <div className="admin-logo-sub">by Atomberg</div>
    </div>
  </div>
);

export default function AppShell({ user, logout, title, subtitle, actions, children }) {
  const { logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const items = MENU[user?.role] || [];

  const handleLogout = () => {
    if (logout) logout();
    else { authLogout(); navigate("/login"); }
  };

  return (
    <div className="admin-page">
      <div className="admin-inner">
        {/* ── Topbar ───────────────────────────────────────────── */}
        <div className="admin-topbar" style={{ padding: "16px 32px" }}>
          <AtomQuestLogo />

          <div className="admin-nav-bar" style={{ flex: 1, justifyContent: "center" }}>
            {items.map((item, index) => {
              const Icon = ICON_MAP[item.label] || Target;
              return (
                <NavLink
                  key={`${item.label}-${index}`}
                  to={item.to}
                  className={({ isActive }) => `admin-nav-tab ${isActive ? "active" : ""}`}
                >
                  {Icon && <Icon size={12} strokeWidth={1.75} />}
                  {item.label}
                </NavLink>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>{user?.role}</div>
            </div>
            <button onClick={handleLogout} className="admin-btn" style={{ marginLeft: 4 }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>

        {/* ── Page Header ──────────────────────────────────────── */}
        <div style={{ padding: "20px 32px 0", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>{title}</h1>
              <ChevronRight size={14} style={{ color: "#334155" }} />
              <span style={{ fontSize: 12, color: "#64748B" }}>{subtitle}</span>
            </div>
          </div>
          {actions && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{actions}</div>}
        </div>

        {/* ── Content ──────────────────────────────────────────── */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}