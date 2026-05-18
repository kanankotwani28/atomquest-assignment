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
  TIMELINE: "Completion date",
  ZERO: "Zero = Success",
};

export default function CheckInForm({ goal, quarter, existingCheckIn, onSaved, canEdit = true }) {
  const [actual, setActual] = useState(existingCheckIn?.actual ?? "");
  const [completionDate, setCompletionDate] = useState(
    existingCheckIn?.completionDate || existingCheckIn?.completion_date
      ? new Date(existingCheckIn?.completionDate || existingCheckIn?.completion_date).toISOString().split("T")[0]
      : "",
  );
  const [progressStatus, setProgressStatus] = useState(
    existingCheckIn?.progressStatus || existingCheckIn?.progress_status || "NOT_STARTED",
  );
  const [saving, setSaving] = useState(false);

  const uom = goal.uomType || goal.uom_type;
  
  const previewScore = () => {
    if (uom === "ZERO") return actual === "" ? null : parseFloat(actual) === 0 ? 100 : 0;
    if (uom === "NUMERIC_MIN") {
      if (!actual || !goal.target) return null;
      return parseFloat(((parseFloat(actual) / goal.target) * 100).toFixed(2));
    }
    if (uom === "NUMERIC_MAX") {
      if (!actual || parseFloat(actual) === 0) return null;
      return parseFloat(((goal.target / parseFloat(actual)) * 100).toFixed(2));
    }
    if (uom === "TIMELINE") {
      if (!completionDate) return null;
      const deadline = new Date(goal.target);
      const completed = new Date(completionDate);
      if (completed <= deadline) return 100;
      const daysLate = (completed - deadline) / (1000 * 60 * 60 * 24);
      return parseFloat(Math.max(0, 100 - daysLate * 5).toFixed(2));
    }
    return null;
  };

  const handleSave = async () => {
    if (!canEdit) return;

    const payload = {
      goal_id: goal.id || goal._id,
      quarter,
      actual: uom !== "TIMELINE" ? (actual === "" ? undefined : parseFloat(actual)) : undefined,
      completion_date: uom === "TIMELINE" && completionDate ? new Date(completionDate).toISOString() : undefined,
      progress_status: progressStatus,
    };

    setSaving(true);
    try {
      await upsertCheckIn(payload);
      toast.success(`${quarter} check-in saved`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const liveScore = previewScore();
  const isTimeline = uom === "TIMELINE";
  const scorePct = liveScore ?? existingCheckIn?.score ?? 0;
  
  const getProgressFillClass = (score) => {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    if (score >= 40) return "warn";
    return "poor";
  };
  
  const fillClass = getProgressFillClass(scorePct);

  const formatTimelineTarget = (targetVal) => {
    try {
      return new Date(targetVal).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return targetVal;
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress tracker inside check-in form */}
      <div className="flex items-center gap-3">
        <div className="progress-track flex-1">
          <div className={`progress-fill ${fillClass}`} style={{ width: `${Math.min(scorePct, 100)}%` }} />
        </div>
        <span className="mono text-xs text-[#f5f5f5] w-12 text-right">
          {scorePct.toFixed(1)}%
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Input/date block */}
        <div>
          <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">
            {isTimeline ? "Completion Date" : "Actual Achievement"}
          </label>
          {isTimeline ? (
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              disabled={!canEdit}
              className="aq-input w-full"
            />
          ) : (
            <input
              type="number"
              step="any"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              disabled={!canEdit}
              placeholder={uom === "ZERO" ? "0" : "Enter actual value"}
              className="aq-input w-full"
            />
          )}
          <p className="mt-1.5 text-[11px] text-[#555555]">
            {UOM_LABELS[uom]} · Target: {isTimeline ? formatTimelineTarget(goal.target) : (uom === "ZERO" ? "0" : goal.target.toLocaleString())}
          </p>
        </div>

        {/* 3-Button toggle for progress status */}
        <div>
          <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">
            Progress Status
          </label>
          <div className="flex gap-1 bg-[#0d0d0d] border border-[#222222] p-[3px] rounded-lg h-9">
            {PROGRESS_OPTIONS.map((opt) => {
              const isSelected = progressStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setProgressStatus(opt.value)}
                  className={`flex-1 text-center text-xs font-medium rounded-md transition-all ${
                    isSelected
                      ? "bg-[#1e1e1e] border border-[#333333] text-[#f5f5f5]"
                      : "text-[#555555] hover:text-[#909090] disabled:opacity-40"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live score preview */}
      {liveScore !== null && (
        <div className="score-preview-box">
          <span className="text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em]">
            Live Score Preview
          </span>
          <ScoreBadge score={liveScore} />
        </div>
      )}

      {/* Manager comment block */}
      {existingCheckIn?.managerComment && (
        <div className="border-l-[3px] border-[#5a4a1a] bg-[#161616] px-4 py-3 rounded-r-lg space-y-1">
          <p className="text-[11px] font-semibold text-[#c49a2a] uppercase tracking-[0.06em]">Manager Feedback</p>
          <p className="text-xs text-[#909090] italic leading-relaxed">"{existingCheckIn.managerComment}"</p>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!canEdit || saving || (actual === "" && !completionDate)}
        className="btn btn-confirm w-full mt-2"
      >
        {!canEdit ? "Check-in window closed" : saving ? "Saving..." : existingCheckIn ? "Update Check-in" : "Save Check-in"}
      </button>
    </div>
  );
}
