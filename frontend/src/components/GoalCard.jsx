const UOM_LABELS = {
  NUMERIC_MIN: "Higher is better",
  NUMERIC_MAX: "Lower is better",
  PERCENTAGE:  "Percentage",
  TIMELINE:    "Timeline",
  ZERO:        "Zero = Success",
};

const formatTargetValue = (target, uom) => {
  if (uom === "ZERO") return "0 incidents";
  if (uom === "TIMELINE") {
    if (!target) return "—";
    try { return new Date(target).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return target?.toLocaleString() ?? "—"; }
  }
  return target !== undefined ? target.toLocaleString() : "—";
};

const STATUS_STRIP = {
  APPROVED:          "#10B981",
  SUBMITTED:          "#F59E0B",
  REVISION_REQUIRED:  "#F59E0B",
  RETURNED:           "#EF4444",
  DRAFT:              "#636D85",
};

const STATUS_BADGE = {
  APPROVED:          "admin-badge admin-badge--approve",
  SUBMITTED:         "admin-badge admin-badge--submit",
  REVISION_REQUIRED: "admin-badge admin-badge--submit",
  RETURNED:          "admin-badge admin-badge--return",
  DRAFT:             "admin-badge admin-badge--draft",
};

export default function GoalCard({ goal, onEdit, onDelete }) {
  const canEdit   = ["DRAFT", "RETURNED", "REVISION_REQUIRED"].includes(goal.status) || goal.isShared;
  const canDelete = ["DRAFT", "RETURNED"].includes(goal.status) && !goal.isShared;
  const stripColor = STATUS_STRIP[goal.status] || STATUS_STRIP.DRAFT;
  const uom = goal.uomType || goal.uom_type;

  return (
    <div className="admin-glass" style={{ borderLeft: `3px solid ${stripColor}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal.title}</h3>
          <span className="admin-label" style={{ marginTop: 4, display: "block" }}>
            {goal.thrust_area?.name || goal.thrustArea?.name}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span className={`admin-badge ${STATUS_BADGE[goal.status] || "admin-badge--draft"}`}>
            {goal.isShared && goal.status !== "REVISION_REQUIRED" ? "SHARED" : goal.status}
          </span>
          {goal.isShared && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, border: "1px solid rgba(99,102,241,0.2)", color: "#818CF8", background: "rgba(99,102,241,0.08)" }}>
              Manager KPI
            </span>
          )}
        </div>
      </div>

      {goal.description && (
        <p style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 14, color: "#94A3B8" }}>
          {goal.description}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div>
          <span className="admin-label" style={{ marginBottom: 3, display: "block" }}>Measurement</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#94A3B8" }}>{UOM_LABELS[uom] || uom}</span>
        </div>
        <div>
          <span className="admin-label" style={{ marginBottom: 3, display: "block" }}>Target</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "#fff" }}>
            {formatTargetValue(goal.target, uom)}
          </span>
        </div>
        <div>
          <span className="admin-label" style={{ marginBottom: 3, display: "block" }}>Weightage</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: stripColor }}>{goal.weightage}%</span>
        </div>
      </div>

      {goal.status === "RETURNED" && (
        <div className="admin-notice admin-notice--red" style={{ marginTop: 10, fontSize: 11 }}>
          Returned: {goal.reason || "Please revise and resubmit."}
        </div>
      )}
      {goal.status === "REVISION_REQUIRED" && (
        <div className="admin-notice admin-notice--amber" style={{ marginTop: 10, fontSize: 11 }}>
          Revision required — rebalance weightages to 100% and resubmit for approval.
        </div>
      )}
      {goal.isShared && (
        <div className="admin-notice" style={{ marginTop: 10, fontSize: 11, background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.15)", color: "#818CF8" }}>
          Shared KPI — title and target are locked; weightage can be adjusted.
        </div>
      )}

      {canEdit && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={() => onEdit(goal)} className="admin-btn" style={{ flex: 1 }}>Edit</button>
          {canDelete && (
            <button onClick={() => onDelete(goal.id || goal._id)} className="admin-btn admin-btn--sm danger">Delete</button>
          )}
        </div>
      )}
    </div>
  );
}