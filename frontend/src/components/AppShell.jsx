import { NavLink } from "react-router-dom";

const MENU = {
  EMPLOYEE: [
    { label: "Dashboard", to: "/employee/dashboard" },
    { label: "My Goals", to: "/employee/dashboard" },
    { label: "Check-ins", to: "/employee/checkins" },
  ],
  MANAGER: [
    { label: "Team Overview", to: "/manager/dashboard" },
    { label: "Goal Approvals", to: "/manager/dashboard" },
    { label: "Team Check-ins", to: "/manager/checkins" },
  ],
  ADMIN: [
    { label: "Overview", to: "/admin/dashboard" },
    { label: "Cycles", to: "/admin/dashboard" },
    { label: "Shared Goals", to: "/admin/dashboard" },
    { label: "Completion", to: "/admin/dashboard" },
    { label: "Audit Trail", to: "/admin/dashboard" },
    { label: "Unlock Goals", to: "/admin/dashboard" },
  ],
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
          <div>
            <div className="sidebar-title">AtomQuest</div>
            <div className="label-caps">Goal Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {items.map((item, index) => (
            <NavLink
              key={`${item.label}-${index}`}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="flex items-center gap-3">
            <div className="avatar">{initials(user?.name)}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-[#f0f0f0]">{user?.name}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.05em] text-[#555]">
                {user?.role}
              </div>
            </div>
          </div>
          <button onClick={logout} className="mt-4 text-xs text-[#888] hover:text-[#f0f0f0]">
            Sign out
          </button>
        </div>
      </aside>

      <header className="app-header">
        <div className="content-wrap flex items-center justify-between gap-4">
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="mt-1 text-xs text-[#888]">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <span className="hidden sm:inline text-sm text-[#888]">{user?.name}</span>
            <span className="role-badge">{user?.role}</span>
          </div>
        </div>
      </header>

      <main className="content-wrap main-content">{children}</main>
    </div>
  );
}
