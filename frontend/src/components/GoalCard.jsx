const UOM_LABELS = {
  NUMERIC_MIN: "Higher is better",
  NUMERIC_MAX: "Lower is better",
  TIMELINE: "Timeline",
  ZERO: "Zero = Success",
};

const getStatusStripClass = (status) => {
  switch (status) {
    case "APPROVED":
      return "bg-[#4d9966]"; // Status green
    case "SUBMITTED":
    case "REVISION_REQUIRED":
      return "bg-[#c49a2a]"; // Status amber
    case "RETURNED":
      return "bg-[#c44a4a]"; // Status red
    default:
      return "bg-[#555555]"; // DRAFT / other
  }
};

const statusClass = (status) => {
  return `status-badge ${String(status || "draft").toLowerCase().replaceAll("_", "-")}`;
};

export default function GoalCard({ goal, onEdit, onDelete }) {
  const canEdit = ["DRAFT", "RETURNED", "REVISION_REQUIRED"].includes(goal.status) || goal.isShared;
  const canDelete = ["DRAFT", "RETURNED"].includes(goal.status) && !goal.isShared;

  return (
    <div className="aq-card relative overflow-hidden pl-6 pr-5 py-5">
      {/* 3px status strip on left */}
      <div className={`absolute inset-y-0 left-0 w-[3px] ${getStatusStripClass(goal.status)}`} />

      {/* Top row */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-medium leading-snug text-[#f5f5f5] truncate">
            {goal.title}
          </h3>
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#909090] mt-1">
            {goal.thrust_area?.name || goal.thrustArea?.name}
          </p>
        </div>
        <span className={statusClass(goal.status)}>
          {goal.isShared && goal.status !== "REVISION_REQUIRED" ? "SHARED" : goal.status}
        </span>
      </div>

      {goal.description && (
        <p className="mb-4 text-xs leading-relaxed text-[#909090]">{goal.description}</p>
      )}

      {/* Metrics 3-column row */}
      <div className="mb-4 grid grid-cols-3 gap-3 border-y border-[#222222] py-3">
        <Metric label="UoM" value={UOM_LABELS[goal.uomType || goal.uom_type]} />
        <Metric
          label="Target"
          value={
            (goal.uomType || goal.uom_type) === "ZERO"
              ? "0 incidents"
              : (goal.target !== undefined ? goal.target.toLocaleString() : "0")
          }
        />
        <Metric label="Weightage" value={`${goal.weightage}%`} />
      </div>

      {/* Notice Bars */}
      {goal.status === "RETURNED" && (
        <Notice tone="amber">
          Returned: {goal.reason || "Please revise and resubmit."}
        </Notice>
      )}

      {goal.isShared && (
        <Notice tone="neutral">
          Shared KPI. Title and target are locked; only weightage can be adjusted.
        </Notice>
      )}

      {goal.status === "REVISION_REQUIRED" && (
        <Notice tone="amber">
          Revision required. Rebalance weightage and submit for manager approval.
        </Notice>
      )}

      {/* Actions */}
      {canEdit && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => onEdit(goal)} className="btn flex-1">
            Edit
          </button>
          {canDelete && (
            <button onClick={() => onDelete(goal.id || goal._id)} className="btn btn-danger flex-shrink-0">
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#555555]">{label}</p>
      <p className="mono text-[13px] font-medium text-[#e8e8e8] mt-1 truncate">{value}</p>
    </div>
  );
}

function Notice({ children, tone = "neutral" }) {
  const colorClass =
    tone === "amber"
      ? "notice-bar amber"
      : tone === "red"
      ? "notice-bar red"
      : "notice-bar neutral border-[#222222] bg-[#161616] text-[#909090]";

  return (
    <div className={`${colorClass} py-2 px-3 text-xs rounded mb-3`}>
      {children}
    </div>
  );
}
