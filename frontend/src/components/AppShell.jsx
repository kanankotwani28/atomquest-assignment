import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import OnboardingHints from "./OnboardingHints";
import {
  LayoutDashboard, Target, ClipboardCheck, Users,
  History, RefreshCw, BarChart2, Settings,
  LogOut, ChevronRight, ShieldCheck,
} from "lucide-react";

const MENU = {
  EMPLOYEE: [
    { label: "My Goals",   to: "/employee/dashboard", icon: Target },
    { label: "Check-ins", to: "/employee/checkins",  icon: ClipboardCheck },
  ],
  MANAGER: [
    { label: "Team Overview",  to: "/manager/dashboard", icon: Users },
    { label: "Team Check-ins", to: "/manager/checkins",  icon: ClipboardCheck },
  ],
  ADMIN: [
    { label: "Overview",     to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Analytics",    to: "/admin/dashboard", icon: BarChart2 },
    { label: "Escalation",   to: "/admin/dashboard", icon: ShieldCheck },
    { label: "Cycles",       to: "/admin/dashboard", icon: RefreshCw },
    { label: "Hierarchy",    to: "/admin/dashboard", icon: Users },
    { label: "Audit Trail",  to: "/admin/dashboard", icon: History },
    { label: "Shared Goals", to: "/admin/dashboard", icon: Settings },
  ],
};

export default function AppShell({ user, logout, title, subtitle, actions, children }) {
  const { logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = MENU[user?.role] || [];

  const handleLogout = () => {
    if (logout) logout();
    else { authLogout(); navigate("/login"); }
  };

  const roleLabel = { EMPLOYEE: "Employee", MANAGER: "Manager", ADMIN: "Admin" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#020817" }}>
      {/* ── Sidebar ── */}
      <div style={{
        width: 224, flexShrink: 0,
        background: "rgba(7,18,38,0.95)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        padding: "20px 0",
        position: "fixed", top: 0, left: 0, bottom: 0,
        overflowY: "auto",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 18px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #3B82F6, #6366F1)", color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, boxShadow: "0 0 16px rgba(59,130,246,0.28)", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1.4" opacity="0.7"/>
              <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1.4" strokeDasharray="3.5 2" opacity="0.4"/>
              <circle cx="7" cy="7" r="1.8" fill="white"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.02em" }}>AtomQuest</div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.03em" }}>by Atomberg</div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ padding: "0 18px 16px" }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569" }}>Signed in as</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: user?.role === "ADMIN" ? "#EF4444" : user?.role === "MANAGER" ? "#F59E0B" : "#10B981", boxShadow: `0 0 6px ${user?.role === "ADMIN" ? "rgba(239,68,68,0.4)" : user?.role === "MANAGER" ? "rgba(245,158,11,0.4)" : "rgba(16,185,129,0.4)"}` }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#F8FAFC" }}>{roleLabel[user?.role] || user?.role}</span>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 8px" }}>
          {menuItems.map((item) => {
            const isActive = location.pathname.includes(item.to.split("/")[2] || "");
            const Icon = item.icon || Target;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 13, fontWeight: 450,
                  color: isActive ? "#F8FAFC" : "#64748B",
                  textDecoration: "none",
                  transition: "all 150ms ease",
                  background: isActive ? "rgba(59,130,246,0.12)" : "transparent",
                  border: isActive ? "1px solid rgba(96,165,250,0.25)" : "1px solid transparent",
                  marginBottom: 2,
                  ...(isActive ? { boxShadow: "0 2px 8px rgba(0,0,0,0.3)" } : {}),
                }}
              >
                <Icon size={15} strokeWidth={1.75} style={{ color: isActive ? "#60A5FA" : "#475569", flexShrink: 0 }} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: "16px 14px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, marginBottom: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #3B82F6, #6366F1)", color: "#fff", fontSize: 11, fontWeight: 600, display: "grid", placeItems: "center", flexShrink: 0 }}>
              {user?.name?.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#F8FAFC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: "#475569" }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderRadius: 8, fontSize: 12, color: "#64748B", cursor: "pointer", transition: "all 150ms ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#EF4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; }}>
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, marginLeft: 224 }}>
        {/* Page Header */}
        <div style={{ padding: "18px 32px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, background: "rgba(15,23,42,0.60)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#F8FAFC", letterSpacing: "-0.02em", margin: 0 }}>{title}</h1>
            {subtitle && (
              <>
                <ChevronRight size={13} style={{ color: "#334155" }} />
                <span style={{ fontSize: 12, color: "#64748B" }}>{subtitle}</span>
              </>
            )}
            {actions && <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>{actions}</div>}
          </div>
        </div>

        {/* Page Body */}
        <OnboardingHints role={user?.role}>
          <main style={{ flex: 1, padding: "24px 32px" }}>
            {children}
          </main>
        </OnboardingHints>
      </div>
    </div>
  );
}