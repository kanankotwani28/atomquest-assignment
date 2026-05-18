import { useState, useEffect } from "react";

const STORAGE_KEYS = {
  EMPLOYEE: "aq_hint_employee",
  MANAGER: "aq_hint_manager",
  ADMIN: "aq_hint_admin",
};

const HINTS = {
  EMPLOYEE: [
    { key: "goals", title: "Create your goals", body: "Add up to 8 goals with a total weightage of exactly 100%. Click 'Add Goal' to start." },
    { key: "weightage", title: "Balance to 100%", body: "Your total weightage must equal 100% before you can submit. Use the weightage bar to track progress." },
    { key: "checkins", title: "Quarterly check-ins", body: "Once your manager approves your goals, quarterly check-in windows open. Update your progress in each quarter." },
    { key: "revision", title: "Revision required?", body: "If a shared KPI was added by your manager, rebalance your goals to 100% and resubmit." },
  ],
  MANAGER: [
    { key: "team", title: "Review team goals", body: "Expand each employee's card to see submitted goals. Approve only when weightage totals 100%." },
    { key: "shared", title: "Shared KPIs", body: "Deploy shared goals to your team using the KPI Deploy section. Employees can then adopt them." },
    { key: "return", title: "Return for rework", body: "If goals need changes, click 'Return' — add a reason so your employee knows what to fix." },
    { key: "checkins", title: "Track check-ins", body: "View team check-in progress in the Team Check-ins tab. You can add manager feedback per quarter." },
  ],
  ADMIN: [
    { key: "cycles", title: "Manage cycles", body: "Create and activate annual cycles. Open Q1–Q4 check-in windows manually or use BRD Auto-Schedule." },
    { key: "escalation", title: "Escalation rules", body: "Configure rules to automatically escalate overdue goals. Rules run every 30 minutes." },
    { key: "hierarchy", title: "Org hierarchy", body: "Assign managers to employees in the Hierarchy tab. Correct hierarchy drives all approval flows." },
    { key: "analytics", title: "Analytics", body: "View employee scores, heatmaps, thrust area distribution, and manager effectiveness in the Analytics tab." },
  ],
};

export default function OnboardingHints({ role, children }) {
  const [hintIndex, setHintIndex] = useState(-1);
  const storageKey = STORAGE_KEYS[role];

  useEffect(() => {
    const init = async () => {
      if (!storageKey) return;
      const shown = localStorage.getItem(storageKey);
      if (!shown) setHintIndex(0);
    };
    init();
  }, [storageKey]);

  if (hintIndex < 0) return children;

  const hints = HINTS[role] || HINTS.EMPLOYEE;
  const hint = hints[hintIndex];
  if (!hint) return children;

  const advance = (dir) => {
    if (dir === "next") {
      if (hintIndex + 1 < hints.length) {
        setHintIndex(hintIndex + 1);
      } else {
        localStorage.setItem(storageKey, "true");
        setHintIndex(-1);
      }
    } else {
      localStorage.setItem(storageKey, "true");
      setHintIndex(-1);
    }
  };

  return (
    <>
      {children}
      <div style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 500,
        maxWidth: 320, width: "100%",
        background: "rgba(15,27,52,0.98)",
        border: "1px solid rgba(99,102,241,0.30)",
        borderRadius: 14, padding: "18px 20px",
        boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        animation: "scaleUp 200ms ease-out forwards",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6366F1" }}>
            Tip {hintIndex + 1} / {hints.length}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {hints.map((_, i) => (
              <div key={i} style={{ width: i === hintIndex ? 16 : 6, height: 4, borderRadius: 2, background: i === hintIndex ? "#6366F1" : "rgba(255,255,255,0.10)", transition: "all 200ms ease" }} />
            ))}
          </div>
        </div>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: "#F8FAFC", margin: "0 0 8px" }}>{hint.title}</h4>
        <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6, margin: "0 0 14px" }}>{hint.body}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => advance("skip")}
            style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#64748B", cursor: "pointer" }}
          >
            Skip
          </button>
          <button
            onClick={() => advance("next")}
            style={{ flex: 2, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", background: "linear-gradient(135deg, #4338CA, #6366F1)", color: "#fff", cursor: "pointer" }}
          >
            {hintIndex + 1 < hints.length ? "Next tip" : "Got it!"}
          </button>
        </div>
      </div>
    </>
  );
}