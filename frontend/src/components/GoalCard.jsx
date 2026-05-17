const UOM_LABELS = {
  NUMERIC_MIN: "Higher is better",
  NUMERIC_MAX: "Lower is better",
  TIMELINE: "Timeline",
  ZERO: "Zero = Success",
};

const statusClass = (status) => `status-${String(status || "DRAFT").toLowerCase().replaceAll("_", "-")}`;

export default function GoalCard({ goal, onEdit, onDelete }) {
  const canEdit = ["DRAFT", "RETURNED", "REVISION_REQUIRED"].includes(goal.status) || goal.isShared;
  const canDelete = ["DRAFT", "RETURNED"].includes(goal.status) && !goal.isShared;
  const normalized = String(goal.status || "DRAFT").toLowerCase().replaceAll("_", "-");

  return (
    <div className="aq-card relative overflow-hidden p-5">
      <div className={`absolute inset-y-0 left-0 w-1 status-strip-${normalized}`} />

      <div className="mb-4 flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-medium leading-snug tracking-[0.01em] text-[#f0f0f0]">
            {goal.title}
          </h3>
          <p className="label-caps mt-2">{goal.thrustArea?.name}</p>
        </div>
        <span className={`status-badge ${statusClass(goal.status)}`}>
          {goal.isShared && goal.status !== "REVISION_REQUIRED" ? "SHARED" : goal.status}
        </span>
      </div>

      {goal.description && (
        <p className="mb-4 pl-1 text-xs leading-relaxed text-[#888]">{goal.description}</p>
      )}

      <div className="mb-4 grid grid-cols-3 gap-3 border-y border-[#2a2a2a] py-3">
        <Metric label="UoM" value={UOM_LABELS[goal.uomType]} />
        <Metric
          label="Target"
          value={goal.uomType === "ZERO" ? "0 incidents" : goal.target.toLocaleString()}
        />
        <Metric label="Weightage" value={`${goal.weightage}%`} />
      </div>

      {goal.status === "RETURNED" && (
        <Notice tone="danger">Returned by manager. Please revise and resubmit.</Notice>
      )}

      {goal.isShared && (
        <Notice>Shared KPI. Title and target are locked; only weightage can be adjusted.</Notice>
      )}

      {goal.status === "REVISION_REQUIRED" && (
        <Notice tone="warning">
          Revision required. Rebalance weightage and submit for manager approval.
        </Notice>
      )}

      {canEdit && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => onEdit(goal)} className="btn flex-1">
            Edit
          </button>
          {canDelete && (
            <button onClick={() => onDelete(goal.id)} className="btn btn-danger-outline">
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
      <p className="label-caps">{label}</p>
      <p className="mono mt-1 text-xs text-[#f0f0f0]">{value}</p>
    </div>
  );
}

function Notice({ children, tone = "muted" }) {
  const color =
    tone === "danger" ? "text-[#c47a7a] border-[#7c3a3a]" :
    tone === "warning" ? "text-[#c09a4a] border-[#8a6a2a]" :
    "text-[#888] border-[#333]";

  return (
    <div className={`mb-3 rounded-lg border bg-[#1a1a1a] px-3 py-2 text-xs ${color}`}>
      {children}
    </div>
  );
}
