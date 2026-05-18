import { useState } from "react";
import { upsertCheckIn } from "../api/checkins";
import ScoreBadge from "./ScoreBadge";
import toast from "react-hot-toast";

const PROGRESS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "ON_TRACK", label: "On track" },
  { value: "COMPLETED", label: "Completed" },
];

const UOM_LABELS = {
  NUMERIC_MIN: "Higher is better",
  NUMERIC_MAX: "Lower is better",
  PERCENTAGE:  "Target is a %",
  TIMELINE:    "Completion date",
  ZERO:        "Zero = Success",
};

const formatTargetValue = (target, uom) => {
  if (uom === "ZERO") return "0";
  if (uom === "TIMELINE") {
    if (!target) return "—";
    try { return new Date(target).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return target?.toLocaleString() ?? "—"; }
  }
  return target !== undefined ? target.toLocaleString() : "—";
};

export default function CheckInForm({ goal, quarter, existingCheckIn, onSaved, canEdit = true }) {
  const uom = goal.uomType || goal.uom_type;
  const isTimeline = uom === "TIMELINE";

  const [actual, setActual] = useState(existingCheckIn?.actual ?? "");
  const [completionDate, setCompletionDate] = useState(() => {
    const raw = existingCheckIn?.completionDate ?? existingCheckIn?.completion_date;
    if (!raw) return "";
    try { return new Date(raw).toISOString().split("T")[0]; }
    catch { return raw; }
  });
  const [progressStatus, setProgressStatus] = useState(
    existingCheckIn?.progressStatus || existingCheckIn?.progress_status || "NOT_STARTED",
  );
  const [saving, setSaving] = useState(false);

  const previewScore = () => {
    if (uom === "ZERO") return actual === "" ? null : parseFloat(actual) === 0 ? 100 : 0;
    if (uom === "NUMERIC_MIN") { if (!actual || !goal.target) return null; return parseFloat(Math.min(200, ((parseFloat(actual) / goal.target) * 100)).toFixed(2)); }
    if (uom === "NUMERIC_MAX") { if (!actual || parseFloat(actual) === 0) return null; return parseFloat(Math.min(200, ((goal.target / parseFloat(actual)) * 100)).toFixed(2)); }
    if (uom === "PERCENTAGE") { if (!actual || !goal.target) return null; return parseFloat(Math.min(100, ((parseFloat(actual) / goal.target) * 100)).toFixed(2)); }
    if (uom === "TIMELINE") {
      if (!completionDate) return null;
      const raw = Number(goal.target);
      const deadline = isNaN(raw) ? new Date(goal.target) : raw > 1e12 ? new Date(raw) : new Date(raw * 1000);
      const completed = new Date(completionDate + "T12:00:00");
      if (isNaN(deadline.getTime()) || isNaN(completed.getTime())) return null;
      if (completed <= deadline) return 100;
      const daysLate = (completed - deadline) / (1000 * 60 * 60 * 24);
      return parseFloat(Math.max(0, 100 - daysLate * 5).toFixed(2));
    }
    return null;
  };

  const liveScore = previewScore();
  const scorePct = liveScore ?? existingCheckIn?.score ?? 0;

  const getProgressColor = (score) => {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#818CF8";
    if (score >= 40) return "#F59E0B";
    return "#EF4444";
  };

  const fillColor = getProgressColor(scorePct);
  const clampedScore = Math.min(scorePct, 100);
  const canSubmit = isTimeline ? !!completionDate : actual !== "";

  const handleSave = async () => {
    if (!canEdit || !canSubmit || saving) return;

    const payload = {
      goal_id: goal.id || goal._id,
      quarter,
      actual: isTimeline ? undefined : (actual === "" ? undefined : parseFloat(actual)),
      completion_date: isTimeline && completionDate
        ? (completionDate + "T12:00:00")
        : undefined,
      progress_status: progressStatus,
    };

    setSaving(true);
    try {
      await upsertCheckIn(payload);
      toast.success(`${quarter} check-in saved`);
      onSaved();
    }
    catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || "Failed to save");
    }
    finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${fillColor}, ${fillColor}CC)`, width: `${Math.min(scorePct, 100)}%`, transition: "width 500ms ease" }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#fff", width: 48, textAlign: "right" }}>{clampedScore.toFixed(1)}%</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span className="admin-label">{isTimeline ? "Completion Date" : "Actual Achievement"}</span>
          {isTimeline ? (
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              disabled={!canEdit}
              className="admin-input"
              style={{ fontSize: 12 }}
            />
          ) : (
            <input
              type="number"
              step="any"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              disabled={!canEdit}
              placeholder={uom === "ZERO" ? "0" : "Enter actual value"}
              className="admin-input"
              style={{ fontSize: 12 }}
            />
          )}
          <span style={{ fontSize: 10, color: "#475569" }}>
            {UOM_LABELS[uom]} · Target: {formatTargetValue(goal.target, uom)}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span className="admin-label">Progress Status</span>
          <div style={{ display: "flex", gap: 4, padding: 3, background: "rgba(8,20,47,0.80)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, height: 40 }}>
            {PROGRESS_OPTIONS.map((opt) => {
              const isSelected = progressStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setProgressStatus(opt.value)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: "none",
                    cursor: canEdit ? "pointer" : "not-allowed",
                    transition: "all 150ms ease",
                    background: isSelected ? "rgba(11,22,55,0.95)" : "transparent",
                    color: isSelected ? "#fff" : "#475569",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {liveScore !== null && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(8,20,47,0.80)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10 }}>
          <span className="admin-label">Live Score Preview</span>
          <ScoreBadge score={liveScore} />
        </div>
      )}

      {existingCheckIn?.managerComment && (
        <div style={{ borderLeft: "3px solid #F59E0B", paddingLeft: 12, marginTop: 4 }}>
          <span className="admin-label" style={{ color: "#F59E0B", display: "block", marginBottom: 4 }}>Manager Feedback</span>
          <p style={{ fontSize: 11, color: "#64748B", fontStyle: "italic" }}>"{existingCheckIn.managerComment}"</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!canEdit || saving || !canSubmit}
        className="admin-btn admin-btn--primary"
        style={{ width: "100%", justifyContent: "center" }}
      >
        {!canEdit ? "Check-in window closed" : saving ? "Saving..." : existingCheckIn ? "Update Check-in" : "Save Check-in"}
      </button>
    </div>
  );
}