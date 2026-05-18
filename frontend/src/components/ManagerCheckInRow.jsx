import { useState } from "react";
import { addManagerComment } from "../api/checkins";
import ScoreBadge from "./ScoreBadge";
import toast from "react-hot-toast";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export default function ManagerCheckInRow({ goal, onUpdated }) {
  const [commentingOn, setCommentingOn] = useState(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

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

  const saveComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await addManagerComment(commentingOn, comment);
      toast.success("Comment saved");
      setCommentingOn(null);
      setComment("");
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save comment");
    } finally {
      setSaving(false);
    }
  };

  const getProgressIndicator = (status) => {
    switch (status) {
      case "COMPLETED":
        return { symbol: "●", label: "Completed" };
      case "ON_TRACK":
        return { symbol: "◑", label: "On Track" };
      default:
        return { symbol: "○", label: "Not Started" };
    }
  };

  const getStatusColorClass = (score) => {
    if (score >= 80) return "bg-[#4d9966]";
    if (score >= 60) return "bg-[#4a7ac4]";
    if (score >= 40) return "bg-[#c49a2a]";
    return "bg-[#c44a4a]";
  };

  return (
    <div className="aq-card p-4 border border-[#222222]">
      {/* Header section with title and overall score */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-[#f5f5f5]">{goal.title}</h4>
          <p className="mt-1 text-[11px] text-[#909090]">
            {goal.thrustArea?.name || goal.thrust_area?.name} · <span className="mono">{goal.weightage}% weight</span>
          </p>
        </div>
        {latestCheckIn && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="mono text-xs text-[#909090]">Latest:</span>
            <ScoreBadge score={latestCheckIn.score} />
          </div>
        )}
      </div>

      {/* Quarter Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUARTERS.map((q) => {
          const ci = checkInMap[q];
          const indicator = ci ? getProgressIndicator(ci.progressStatus) : null;
          return (
            <div key={q} className="rounded-lg border border-[#222222] bg-[#0d0d0d] p-3 flex flex-col justify-between min-h-[140px]">
              <div>
                <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-1.5 mb-2">
                  <span className="label text-[#555555]">{q}</span>
                  {ci && (
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${getStatusColorClass(ci.score)}`} />
                      <span className="mono text-[11px] text-[#f5f5f5]">{Number(ci.score || 0).toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                {ci ? (
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#555555]">Planned</span>
                      <span className="mono text-[#909090]">{goal.uomType === "ZERO" ? "0" : goal.target.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#555555]">Actual</span>
                      <span className="mono text-[#e8e8e8]">
                        {goal.uomType === "TIMELINE"
                          ? ci.completionDate
                            ? new Date(ci.completionDate).toLocaleDateString()
                            : "-"
                          : ci.actual !== null
                            ? ci.actual?.toLocaleString()
                            : "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[#909090]">
                      <span className="mono text-[9px] text-[#555555]">{indicator?.symbol}</span>
                      <span>{indicator?.label}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#555555] italic">No submission yet</p>
                )}
              </div>

              {ci && (
                <div className="mt-3 pt-2 border-t border-[#1c1c1c]/60">
                  {ci.managerComment ? (
                    <div className="space-y-1 text-[11px]">
                      <blockquote className="border-l border-[#404040] bg-[#161616] px-2 py-1 italic text-[#909090] rounded-r">
                        "{ci.managerComment}"
                      </blockquote>
                      <button
                        onClick={() => {
                          setCommentingOn(ci.id);
                          setComment(ci.managerComment);
                        }}
                        className="text-[10px] text-[#555555] hover:text-[#909090] transition-colors"
                      >
                        Edit Comment
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setCommentingOn(ci.id);
                        setComment("");
                      }}
                      className="text-[10px] text-[#909090] hover:text-[#f5f5f5] transition-colors"
                    >
                      + Add Comment
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit comment form area */}
      {commentingOn && (
        <div className="mt-4 border-t border-[#222222] pt-4">
          <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">
            Add Comment / Feedback
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Document discussion or provide guidance..."
            className="aq-input w-full resize-none min-h-[60px]"
          />
          <div className="mt-2 flex gap-2 justify-end">
            <button
              onClick={() => {
                setCommentingOn(null);
                setComment("");
              }}
              className="btn text-xs py-1"
            >
              Cancel
            </button>
            <button
              onClick={saveComment}
              disabled={saving || !comment.trim()}
              className="btn btn-confirm text-xs py-1"
            >
              {saving ? "Saving..." : "Save Comment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
