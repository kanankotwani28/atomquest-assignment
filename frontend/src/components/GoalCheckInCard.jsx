import { useState } from "react";
import CheckInForm from "./CheckInForm";
import ScoreBadge from "./ScoreBadge";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const QUARTER_LABELS = { Q1: "July", Q2: "October", Q3: "January", Q4: "March / April" };

export default function GoalCheckInCard({ goal, currentQuarter, onSaved, allowCheckinOutsideWindow = false, checkinWindowOpen = false }) {
  const [activeQuarter, setActiveQuarter] = useState(currentQuarter || "Q1");

  const checkInMap = {};
  const checkinsArray = goal.check_ins || goal.checkIns || [];
  for (const c of checkinsArray) {
    checkInMap[c.quarter] = { ...c, completionDate: c.completionDate ?? c.completion_date, progressStatus: c.progressStatus ?? c.progress_status, managerComment: c.managerComment ?? c.manager_comment, actual: c.actual, score: c.score, id: c.id };
  }

  const latestCheckIn = checkinsArray.length ? checkinsArray[checkinsArray.length - 1] : null;
  const isPrimarySharedOwner = !goal.isShared || !goal.sharedFromId || goal.id === goal.sharedFromId;
  const windowOpen = allowCheckinOutsideWindow || checkinWindowOpen;
  const canEditActiveQuarter = isPrimarySharedOwner && (windowOpen ? true : !!currentQuarter && activeQuarter === currentQuarter);

  return (
    <div className="admin-glass">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal.title}</h3>
          <span className="admin-label" style={{ marginTop: 3, display: "block" }}>{goal.thrust_area?.name || goal.thrustArea?.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(99,102,241,0.12)", color: "#818CF8", fontWeight: 600 }}>{goal.weightage}%</span>
          {latestCheckIn && <ScoreBadge score={latestCheckIn.score} />}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 4, marginBottom: 14 }}>
        {QUARTERS.map((q) => {
          const ci = checkInMap[q];
          const isActive = q === activeQuarter;
          const isCompleted = ci && ci.progressStatus === "COMPLETED";
          return (
            <button key={q} onClick={() => setActiveQuarter(q)}
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 12px", fontSize: 11, fontWeight: 500, borderRadius: 7, cursor: "pointer", transition: "all 150ms ease", background: isActive ? "rgba(11,22,55,0.95)" : "transparent", color: isActive ? "#fff" : "#64748B", border: isActive ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent", boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.3)" : "none" }}>
              <span>{q}</span>
              {isCompleted && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981" }} />}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 10, color: "#475569", textAlign: "center", marginBottom: 12 }}>
        {activeQuarter} window opens: {QUARTER_LABELS[activeQuarter]}{!canEditActiveQuarter && " · Read only"}
      </p>

      {goal.isShared && !isPrimarySharedOwner && (
        <p style={{ fontSize: 11, color: "#64748B", textAlign: "center", marginBottom: 12, fontStyle: "italic" }}>
          Shared KPI achievement is updated by the primary owner and syncs here automatically.
        </p>
      )}

      <CheckInForm goal={goal} quarter={activeQuarter} existingCheckIn={checkInMap[activeQuarter]} onSaved={onSaved} canEdit={canEditActiveQuarter} />
    </div>
  );
}
