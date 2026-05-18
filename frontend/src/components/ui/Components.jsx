export function Card({ children, className = "", hover = true, ...props }) {
  return (
    <div
      className={`aq-card ${hover ? "" : "hover-none"} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardElevated({ children, className = "", ...props }) {
  return (
    <div className={`card-elevated ${className}`} {...props}>
      {children}
    </div>
  );
}

export function StatCard({ icon, label, value, trend, gradient, accent, pulse }) {
  return (
    <div
      className={`stat-card-premium relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} border border-white/[0.04] p-5 group transition-all duration-200 hover:border-white/[0.08] hover:shadow-xl`}
    >
      <div
        className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-10 blur-2xl pointer-events-none"
        style={{ background: accent }}
      />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div style={{ color: accent }}>{icon}</div>
          {pulse && (
            <span className="h-2.5 w-2.5 rounded-full animate-ping mt-1" style={{ background: accent }} />
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {label}
          </p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: accent, fontFamily: "'JetBrains Mono',monospace" }}>
            {value}
          </p>
          {trend && (
            <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
              {trend}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SectionHeader({ icon, label, description, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <span
            className="flex items-center justify-center h-8 w-8 rounded-xl border border-white/[0.06] text-[#6366F1]"
            style={{ background: "rgba(99,102,241,0.08)" }}
          >
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {label}
          </h2>
          {description && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, description }) {
  return (
    <div
      className="rounded-2xl border border-dashed border-white/[0.05] py-16 text-center"
      style={{ background: "var(--surface-card)" }}
    >
      <div
        className="mx-auto mb-4 h-12 w-12 rounded-2xl border border-white/[0.06] flex items-center justify-center"
        style={{ background: "var(--surface-base)", color: "var(--text-disabled)" }}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        {title}
      </h3>
      <p className="text-xs" style={{ color: "var(--text-disabled)" }}>
        {description}
      </p>
    </div>
  );
}

export function TableHeader({ columns }) {
  return (
    <thead>
      <tr className="border-b border-white/[0.04]">
        {columns.map((col) => (
          <th
            key={col}
            className="text-left text-[10px] uppercase tracking-widest font-semibold py-3 px-5"
            style={{ color: "var(--text-muted)" }}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function StatusPill({ status }) {
  const map = {
    DRAFT:             { label: "Draft",              cls: "status-draft" },
    SUBMITTED:         { label: "Submitted",           cls: "status-submitted" },
    APPROVED:          { label: "Approved",           cls: "status-approved" },
    RETURNED:          { label: "Returned",            cls: "status-returned" },
    REVISION_REQUIRED: { label: "Revision required",  cls: "status-revision-required" },
    LOCKED:            { label: "Locked",             cls: "status-locked" },
  };
  const config = map[status] || { label: status, cls: "status-draft" };
  return <span className={`status-badge ${config.cls}`}>{config.label}</span>;
}

export function ProgressBar({ value, color = "excellent", thick = false, showLabel = false }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-3">
      <div className={`progress-track ${thick ? "thick" : ""} flex-1`}>
        <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <span className="text-[11px] font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

export function AvatarInitials({ name, size = "md" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase()).join("") || "E";
  const sizes = { sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-xs", lg: "w-11 h-11 text-sm" };
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold`}
      style={{ background: "linear-gradient(135deg,var(--accent-dark),var(--accent))", color: "rgba(255,255,255,0.9)", border: "1px solid var(--accent-border)" }}>
      {initials}
    </div>
  );
}