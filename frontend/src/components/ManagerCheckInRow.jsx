import { useState } from "react";
import { addManagerComment } from "../api/checkins";
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

  return (
    <div className="aq-card p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#f0f0f0]">{goal.title}</p>
          <p className="mt-1 text-xs text-[#888]">
            {goal.thrustArea?.name} · <span className="mono">{goal.weightage}%</span> · Target:{" "}
            <span className="mono">{goal.target.toLocaleString()}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
        {QUARTERS.map((q) => {
          const ci = checkInMap[q];
          const dot = ci?.score >= 80 ? "#4a7c59" : ci?.score >= 50 ? "#8a6a2a" : "#7c3a3a";
          return (
            <div key={q} className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] p-3">
              <p className="mb-2 text-xs font-medium text-[#888]">{q}</p>
              {ci ? (
                <>
                  <div className="mb-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#555]">Planned</span>
                      <span className="mono text-[#888]">{goal.target.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#555]">Actual</span>
                      <span className="mono text-[#f0f0f0]">
                        {goal.uomType === "TIMELINE"
                          ? ci.completionDate
                            ? new Date(ci.completionDate).toLocaleDateString()
                            : "-"
                          : ci.actual !== null
                            ? ci.actual?.toLocaleString()
                            : "-"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
                    <span className="mono text-xs text-[#f0f0f0]">{Number(ci.score || 0).toFixed(1)}%</span>
                  </div>
                  <p className="mt-1 text-xs text-[#555]">{ci.progressStatus.replace("_", " ")}</p>

                  {ci.managerComment ? (
                    <div className="mt-2 text-left">
                      <p className="border-l-[3px] border-[#333] bg-[#111] px-2 py-1 text-xs leading-relaxed text-[#888]">
                        {ci.managerComment}
                      </p>
                      <button
                        onClick={() => {
                          setCommentingOn(ci.id);
                          setComment(ci.managerComment);
                        }}
                        className="mt-1 text-xs text-[#888] hover:text-[#f0f0f0]"
                      >
                        Edit comment
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setCommentingOn(ci.id);
                        setComment("");
                      }}
                      className="mt-2 text-xs text-[#888] hover:text-[#f0f0f0]"
                    >
                      Add comment
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-4 text-xs text-[#555]">No data</p>
              )}
            </div>
          );
        })}
      </div>

      {commentingOn && (
        <div className="mt-4 border-t border-[#2a2a2a] pt-4">
          <label className="mb-1 block text-xs font-medium text-[#888]">Check-in comment</label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Document your discussion..."
            className="w-full resize-none px-3 py-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={saveComment} disabled={saving || !comment.trim()} className="btn btn-success">
              {saving ? "Saving..." : "Save comment"}
            </button>
            <button
              onClick={() => {
                setCommentingOn(null);
                setComment("");
              }}
              className="btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
