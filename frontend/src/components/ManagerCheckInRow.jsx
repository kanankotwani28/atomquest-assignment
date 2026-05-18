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
    checkInMap[c.quarter] = { ...c, completionDate: c.completionDate ?? c.completion_date, progressStatus: c.progressStatus ?? c.progress_status, managerComment: c.managerComment ?? c.manager_comment, actual: c.actual, score: c.score, id: c.id };
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
    } catch (err) { toast.error(err.response?.data?.error || "Failed to save comment"); }
    finally { setSaving(false); }
  };

  const getProgressIndicator = (status) => {
    switch (status) {
      case "COMPLETED": return { symbol: "●", label: "Completed" };
      case "ON_TRACK":  return { symbol: "◑", label: "On Track" };
      default:          return { symbol: "○", label: "Not Started" };
    }
  };

  const getStatusColorClass = (score) => {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#818CF8";
    if (score >= 40) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 12px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{goal.title}</h4>
            <p style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>
              {goal.thrustArea?.name || goal.thrust_area?.name} · <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{goal.weightage}%</span>
            </p>
          </div>
          {latestCheckIn && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>Latest:</span>
              <ScoreBadge score={latestCheckIn.score} />
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {QUARTERS.map((q) => {
            const ci = checkInMap[q];
            const indicator = ci ? getProgressIndicator(ci.progressStatus) : null;
            return (
              <div key={q} style={{ padding: 10, background: "rgba(8,20,47,0.80)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, minHeight: 120 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="admin-label">{q}</span>
                  {ci && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: getStatusColorClass(ci.score) }} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#fff" }}>{Number(ci.score || 0).toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                {ci ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: "#475569" }}>Planned</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#64748B" }}>{goal.uomType === "ZERO" ? "0" : goal.target?.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: "#475569" }}>Actual</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#94A3B8" }}>
                        {goal.uomType === "TIMELINE" ? (ci.completionDate ? new Date(ci.completionDate).toLocaleDateString() : "—") : (ci.actual !== null ? ci.actual?.toLocaleString() : "—")}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, color: "#475569" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>{indicator?.symbol}</span>
                      <span style={{ fontSize: 10 }}>{indicator?.label}</span>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 10, color: "#334155" }}>No submission yet</span>
                )}

                {ci && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                    {ci.managerComment ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <blockquote style={{ fontSize: 10, borderLeft: "2px solid #334155", paddingLeft: 8, color: "#64748B", fontStyle: "italic" }}>
                          "{ci.managerComment}"
                        </blockquote>
                        <button onClick={() => { setCommentingOn(ci.id); setComment(ci.managerComment); }} style={{ fontSize: 10, color: "#475569", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>Edit</button>
                      </div>
                    ) : (
                      <button onClick={() => { setCommentingOn(ci.id); setComment(""); }} style={{ fontSize: 10, color: "#64748B", background: "none", border: "none", cursor: "pointer", padding: 0 }}>+ Add comment</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {commentingOn && (
          <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="admin-label" style={{ display: "block", marginBottom: 6 }}>Add Comment / Feedback</span>
            <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Document discussion or provide guidance..." className="admin-input" style={{ minHeight: 60, height: "auto", paddingTop: 10 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={() => { setCommentingOn(null); setComment(""); }} className="admin-btn admin-btn--sm">Cancel</button>
              <button onClick={saveComment} disabled={saving || !comment.trim()} className="admin-btn admin-btn--sm admin-btn--primary">
                {saving ? "Saving..." : "Save Comment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
