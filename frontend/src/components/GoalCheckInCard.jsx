import { useState } from "react";
import CheckInForm from "./CheckInForm";
import ScoreBadge from "./ScoreBadge";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const QUARTER_LABELS = {
  Q1: "July",
  Q2: "October",
  Q3: "January",
  Q4: "March / April",
};

export default function GoalCheckInCard({ goal, currentQuarter, onSaved, allowCheckinOutsideWindow = false, checkinWindowOpen = false }) {
  const [activeQuarter, setActiveQuarter] = useState(currentQuarter || "Q1");

  const checkInMap = {};
  const checkinsArray = goal.check_ins || goal.checkIns || [];
  for (const c of checkinsArray) {
    checkInMap[c.quarter] = {
      ...c,
      completionDate: c.completionDate ?? c.completion_date,
      progressStatus: c.progressStatus ?? c.progress_status,
      managerComment: c.managerComment ?? c.manager_comment,
      actual: c.actual,
      score: c.score,
      id: c.id,
    };
  }

  const latestCheckIn = checkinsArray.length ? checkinsArray[checkinsArray.length - 1] : null;
  const isPrimarySharedOwner = !goal.isShared || !goal.sharedFromId || goal.id === goal.sharedFromId;
  const windowOpen = allowCheckinOutsideWindow || checkinWindowOpen;
  const canEditActiveQuarter =
    isPrimarySharedOwner && (windowOpen ? true : !!currentQuarter && activeQuarter === currentQuarter);

  return (
    <div className="aq-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-medium leading-snug text-[#f5f5f5] truncate">
            {goal.title}
          </h3>
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#909090] mt-1">
            {goal.thrust_area?.name || goal.thrustArea?.name}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="score-badge null">{goal.weightage}%</span>
          {latestCheckIn && <ScoreBadge score={latestCheckIn.score} />}
        </div>
      </div>

      {/* Segmented Q1-Q4 tab row */}
      <div className="quarter-tabs-row mb-4">
        {QUARTERS.map((q) => {
          const ci = checkInMap[q];
          const isActive = q === activeQuarter;
          const isCompleted = ci && ci.progressStatus === "COMPLETED";
          return (
            <button
              key={q}
              onClick={() => setActiveQuarter(q)}
              className={`quarter-tab flex-1 justify-center ${isActive ? "active" : ""}`}
            >
              <span>{q}</span>
              {isCompleted && <span className="dot-indicator" />}
            </button>
          );
        })}
      </div>

      <p className="mb-4 text-center micro text-[#555555]">
        {activeQuarter} window opens: {QUARTER_LABELS[activeQuarter]}
        {!canEditActiveQuarter && " · Read only"}
      </p>

      {goal.isShared && !isPrimarySharedOwner && (
        <p className="mb-4 text-center text-xs text-[#909090] italic">
          Shared KPI achievement is updated by the primary owner and syncs here automatically.
        </p>
      )}

      <CheckInForm
        goal={goal}
        quarter={activeQuarter}
        existingCheckIn={checkInMap[activeQuarter]}
        onSaved={onSaved}
        canEdit={canEditActiveQuarter}
      />
    </div>
  );
}
