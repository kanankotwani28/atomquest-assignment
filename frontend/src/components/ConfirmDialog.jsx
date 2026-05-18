export default function ConfirmDialog({ title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(2,8,23,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 300, padding: 16,
        backdropFilter: "blur(8px)",
        animation: "fadeIn 150ms ease-out forwards",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: "rgba(15,27,52,0.98)",
          border: `1px solid ${danger ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 16,
          padding: "24px 28px",
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          animation: "scaleUp 200ms ease-out forwards",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#F8FAFC", marginBottom: 10 }}>{title}</h3>
        <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} className="admin-btn">Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              height: 38, padding: "0 18px",
              borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
              border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
              background: danger ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
              color: danger ? "#EF4444" : "#10B981",
              transition: "all 150ms ease",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}