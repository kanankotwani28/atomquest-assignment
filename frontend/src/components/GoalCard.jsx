const UOM_LABELS = {
  NUMERIC_MIN: "Higher is better",
  NUMERIC_MAX: "Lower is better",
  TIMELINE: "Timeline",
  ZERO: "Zero = Success",
};

const STATUS_STRIP = {
  APPROVED:          "#10B981",
  SUBMITTED:          "#F59E0B",
  REVISION_REQUIRED:  "#F59E0B",
  RETURNED:           "#EF4444",
  DRAFT:              "#636D85",
};

const STATUS_BADGE = {
  APPROVED:          "status-approved",
  SUBMITTED:         "status-submitted",
  REVISION_REQUIRED: "status-revision-required",
  RETURNED:          "status-returned",
  DRAFT:             "status-draft",
};

export default function GoalCard({ goal, onEdit, onDelete }) {
  const canEdit   = ["DRAFT", "RETURNED", "REVISION_REQUIRED"].includes(goal.status) || goal.isShared;
  const canDelete = ["DRAFT", "RETURNED"].includes(goal.status) && !goal.isShared;
  const stripColor = STATUS_STRIP[goal.status] || STATUS_STRIP.DRAFT;
  const uom = goal.uomType || goal.uom_type;

  return (
    <div className="aq-card relative overflow-hidden transition-all duration-200 hover:border-white/[0.1]"
      style={{ borderLeft: `3px solid ${stripColor}` }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug truncate"
            style={{ color: "var(--text-primary)" }}>{goal.title}</h3>
          <p className="label mt-1">
            {goal.thrust_area?.name || goal.thrustArea?.name}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`status-badge ${STATUS_BADGE[goal.status] || "status-draft"}`}>
            {goal.isShared && goal.status !== "REVISION_REQUIRED" ? "SHARED" : goal.status}
          </span>
          {goal.isShared && (
            <span className="text-[10px] px-2 py-0.5 rounded border text-[10px]"
              style={{ borderColor: "rgba(99,102,241,0.2)", color: "var(--accent-light)", background: "var(--accent-glow)" }}>
              Manager KPI
            </span>
          )}
        </div>
      </div>

      {goal.description && (
        <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
          {goal.description}
        </p>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 py-3 border-y border-white/[0.04]">
        <div>
          <p className="label mb-1">Measurement</p>
          <p className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
            {UOM_LABELS[uom] || uom}
          </p>
        </div>
        <div>
          <p className="label mb-1">Target</p>
          <p className="mono text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
            {uom === "ZERO" ? "0 incidents" : (goal.target !== undefined ? goal.target.toLocaleString() : "—")}
          </p>
        </div>
        <div>
          <p className="label mb-1">Weightage</p>
          <p className="mono text-[12px] font-semibold" style={{ color: stripColor }}>
            {goal.weightage}%
          </p>
        </div>
      </div>

      {/* Notice */}
      {goal.status === "RETURNED" && (
        <div className="notice-bar amber text-[11px] mt-3 py-2 px-3">
          Returned: {goal.reason || "Please revise and resubmit."}
        </div>
      )}
      {goal.status === "REVISION_REQUIRED" && (
        <div className="notice-bar amber text-[11px] mt-3 py-2 px-3">
          Revision required — rebalance weightages to 100% and resubmit for approval.
        </div>
      )}
      {goal.isShared && (
        <div className="notice-bar indigo text-[11px] mt-3 py-2 px-3">
          Shared KPI — title and target are locked; weightage can be adjusted.
        </div>
      )}

      {/* Actions */}
      {canEdit && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => onEdit(goal)} className="btn flex-1 text-xs py-2">Edit</button>
          {canDelete && (
            <button onClick={() => onDelete(goal.id || goal._id)} className="btn btn-danger flex-shrink-0 text-xs py-2">Delete</button>
          )}
        </div>
      )}
    </div>
  );
}