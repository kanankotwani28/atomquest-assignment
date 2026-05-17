import { useState } from 'react';
import CheckInForm from './CheckInForm';
import ScoreBadge from './ScoreBadge';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const QUARTER_LABELS = {
  Q1: 'July',
  Q2: 'October',
  Q3: 'January',
  Q4: 'March / April',
};

export default function GoalCheckInCard({ goal, currentQuarter, onSaved }) {
  const [activeQuarter, setActiveQuarter] = useState(currentQuarter || 'Q1');

  // Map existing check-ins by quarter for O(1) lookup
  const checkInMap = {};
  for (const ci of goal.checkIns) {
    checkInMap[ci.quarter] = ci;
  }

  const latestCheckIn = goal.checkIns[goal.checkIns.length - 1];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Goal header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{goal.title}</h3>
            <p className="text-xs text-indigo-600 mt-0.5">{goal.thrustArea?.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400">{goal.weightage}%</span>
            {latestCheckIn && <ScoreBadge score={latestCheckIn.score} />}
          </div>
        </div>

        {/* Mini progress timeline */}
        <div className="flex items-center gap-1.5 mt-4">
          {QUARTERS.map(q => {
            const ci = checkInMap[q];
            const isActive  = q === activeQuarter;
            const isCurrent = q === currentQuarter;
            const hasCi     = !!ci;

            return (
              <button
                key={q}
                onClick={() => setActiveQuarter(q)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : hasCi
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : isCurrent
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-gray-50 text-gray-400 border border-gray-200'
                }`}
              >
                {q}
                {hasCi && !isActive && (
                  <span className="block text-xs opacity-70">
                    {ci.score !== null ? `${ci.score?.toFixed(0)}%` : '✓'}
                  </span>
                )}
                {!hasCi && isCurrent && !isActive && (
                  <span className="block text-xs opacity-70">open</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quarter label */}
        <p className="text-xs text-gray-400 mt-2 text-center">
          {activeQuarter} window opens: {QUARTER_LABELS[activeQuarter]}
        </p>
      </div>

      {/* Check-in form for active quarter */}
      <div className="p-5">
        <CheckInForm
          goal={goal}
          quarter={activeQuarter}
          existingCheckIn={checkInMap[activeQuarter]}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}