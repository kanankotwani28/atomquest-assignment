import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Target,
  ClipboardCheck,
  Users,
  CheckSquare,
  RefreshCw,
  Share2,
  TrendingUp,
  History,
  Lock,
} from "lucide-react";

const MENU = {
  EMPLOYEE: [
    { label: "My Goals", to: "/employee/dashboard" },
    { label: "Check-ins", to: "/employee/checkins" },
  ],
  MANAGER: [
    { label: "Team Overview", to: "/manager/dashboard" },
    { label: "Team Check-ins", to: "/manager/checkins" },
  ],
  ADMIN: [
    { label: "Overview", to: "/admin/dashboard" },
  ],
};

const ICON_MAP = {
  "Dashboard": LayoutDashboard,
  "My Goals": Target,
  "Check-ins": ClipboardCheck,
  "Team Overview": Users,
  "Goal Approvals": CheckSquare,
  "Team Check-ins": ClipboardCheck,
  "Overview": LayoutDashboard,
  "Cycles": RefreshCw,
  "Shared Goals": Share2,
  "Completion": TrendingUp,
  "Audit Trail": History,
  "Unlock Goals": Lock,
};

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AQ";
}

export default function AppShell({ user, logout, title, subtitle, actions, children }) {
  const items = MENU[user?.role] || [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">A</div>
          <div className="flex flex-col">
            <span className="sidebar-title">AtomQuest</span>
            <span className="sidebar-version">v1.0</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {items.map((item, index) => {
            const Icon = ICON_MAP[item.label] || Target;
            return (
              <NavLink
                key={`${item.label}-${index}`}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              >
                <Icon size={15} strokeWidth={1.5} className="nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="border-t border-[#1a1a1a] my-1" />
          <div className="sidebar-user-info mt-2">
            <div className="avatar">{initials(user?.name)}</div>
            <div className="min-w-0 flex-1">
              <div className="user-name">{user?.name}</div>
              <div className="role-badge-pill mt-0.5">{user?.role}</div>
            </div>
          </div>
          <button onClick={logout} className="signout-btn mt-2">
            Sign out
          </button>
        </div>
      </aside>

      <header className="app-header">
        <div className="app-header-left">
          <h1 className="page-title">{title}</h1>
        </div>
        <div className="app-header-right">
          {subtitle && <span className="breadcrumb">{subtitle}</span>}
          {actions}
        </div>
      </header>

      <main className="content-wrap">{children}</main>
    </div>
  );
}
