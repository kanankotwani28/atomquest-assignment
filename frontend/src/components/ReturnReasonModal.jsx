import { useState } from "react";
import { X } from "lucide-react";

export default function ReturnReasonModal({ isOpen, goalTitle, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
    setReason("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal-panel" style={{ maxWidth: 480 }}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">Return Goal for Rework</h2>
          <button onClick={onClose} className="admin-modal-close"><X size={14} strokeWidth={1.5} /></button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="admin-modal-field">
            <span className="admin-label">Goal to Rework</span>
            <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, background: "rgba(8,20,47,0.80)", border: "1px solid rgba(255,255,255,0.06)", padding: "8px 12px", borderRadius: 8 }}>
              "{goalTitle}"
            </p>
          </div>

          <div className="admin-modal-field">
            <label className="admin-label">Reason for returning <span style={{ color: "#EF4444" }}>*</span></label>
            <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} className="admin-input" style={{ minHeight: 80, height: "auto", paddingTop: 10 }} placeholder="Explain what needs to be changed..." />
            {!reason.trim() && <span style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Required; the employee will see this feedback reason.</span>}
          </div>
        </div>

        <div className="admin-modal-footer">
          <button onClick={onClose} className="admin-btn">Cancel</button>
          <button onClick={handleConfirm} disabled={!reason.trim() || loading} className="admin-btn admin-btn--sm danger">
            {loading ? "Returning..." : "Return Goal"}
          </button>
        </div>
      </div>
    </div>
  );
}
