import { useState, useEffect, useCallback } from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import OnboardingHints from "./OnboardingHints";
import {
  LayoutDashboard, Target, ClipboardCheck, Users,
  History, RefreshCw, BarChart2, Settings,
  LogOut, ChevronRight, ShieldCheck, Menu, X,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const handleLogout = () => {
    if (logout) logout();
    else { authLogout(); navigate("/login"); }
  };

  const roleLabel = { EMPLOYEE: "Employee", MANAGER: "Manager", ADMIN: "Admin" };

  return (
    <div className="appshell-root">
      {/* ── Sidebar Overlay (mobile only) ── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`appshell-sidebar ${sidebarOpen ? "appshell-sidebar--open" : ""}`}>
        {/* Brand */}
        <div className="appshell-sidebar-brand">
          <div className="appshell-brand-mark">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1.4" opacity="0.7"/>
              <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1.4" strokeDasharray="3.5 2" opacity="0.4"/>
              <circle cx="7" cy="7" r="1.8" fill="white"/>
            </svg>
          </div>
          <div>
            <div className="appshell-brand-title">AtomQuest</div>
            <div className="appshell-brand-sub">by Atomberg</div>
          </div>
          {/* Close btn on mobile */}
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role badge */}
        <div className="appshell-role-section">
          <span className="appshell-role-label">Signed in as</span>
          <div className="appshell-role-indicator">
            <div className="appshell-role-dot" data-role={user?.role} />
            <span className="appshell-role-name">{roleLabel[user?.role] || user?.role}</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="appshell-nav">
          {menuItems.map((item) => {
            const isActive = location.pathname.includes(item.to.split("/")[2] || "");
            const Icon = item.icon || Target;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={`appshell-nav-item ${isActive ? "appshell-nav-item--active" : ""}`}
              >
                <Icon size={15} strokeWidth={1.75} className="appshell-nav-icon" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="appshell-user-section">
          <div className="appshell-user-info">
            <div className="appshell-user-avatar">
              {user?.name?.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U"}
            </div>
            <div className="appshell-user-details">
              <div className="appshell-user-name">{user?.name}</div>
              <div className="appshell-user-email">{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="appshell-signout-btn">
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="appshell-main">
        {/* Page Header */}
        <div className="appshell-header">
          <div className="appshell-header-left">
            <button
              className="appshell-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="appshell-page-title">{title}</h1>
            {subtitle && (
              <>
                <ChevronRight size={13} className="appshell-header-sep" />
                <span className="appshell-page-subtitle">{subtitle}</span>
              </>
            )}
          </div>
          {actions && <div className="appshell-header-right">{actions}</div>}
        </div>

        {/* Page Body */}
        <OnboardingHints role={user?.role}>
          <main className="appshell-body">
            {children}
          </main>
        </OnboardingHints>
      </div>
    </div>
  );
}