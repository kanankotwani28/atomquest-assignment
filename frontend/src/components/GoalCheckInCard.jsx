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

export default function GoalCheckInCard({ goal, currentQuarter, onSaved, allowCheckinOutsideWindow = false }) {
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
  const canEditActiveQuarter =
    isPrimarySharedOwner && (allowCheckinOutsideWindow ? true : !!currentQuarter && activeQuarter === currentQuarter);

  return (
    <div className="aq-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-medium tracking-[0.01em] text-[#f0f0f0]">{goal.title}</h3>
          <p className="label-caps mt-2">{goal.thrustArea?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="metric-badge mono px-2.5 py-1 text-xs">{goal.weightage}%</span>
          {latestCheckIn && <ScoreBadge score={latestCheckIn.score} />}
        </div>
      </div>

      <div className="tabs mb-4">
        {QUARTERS.map((q) => {
          const ci = checkInMap[q];
          const isActive = q === activeQuarter;
          return (
            <button
              key={q}
              onClick={() => setActiveQuarter(q)}
              className={`tab ${isActive ? "active" : ""}`}
            >
              {q}
              {ci && !isActive && <span className="mono ml-2 text-[11px] text-[#555]">{ci.score?.toFixed(0)}%</span>}
            </button>
          );
        })}
      </div>

      <p className="mb-4 text-center text-xs text-[#555]">
        {activeQuarter} window opens: {QUARTER_LABELS[activeQuarter]}
        {!canEditActiveQuarter && " · read only"}
      </p>
      {goal.isShared && !isPrimarySharedOwner && (
        <p className="mb-4 text-center text-xs text-[#888]">
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
