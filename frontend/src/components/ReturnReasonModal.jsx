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
    <div className="modal-backdrop transition-opacity duration-200">
      <div className="modal-panel w-full max-w-[480px] p-0 transition-transform duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Return Goal for Rework
          </h2>
          <button 
            onClick={onClose} 
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 cursor-pointer"
            aria-label="Close"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <span className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">
              Goal to Rework
            </span>
            <p className="text-xs text-[var(--text-secondary)] font-medium bg-[var(--bg-elevated)] border border-[var(--border)] px-3 py-2 rounded">
              "{goalTitle}"
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em]">
              Reason for returning <span className="text-[var(--danger-text)]">*</span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="aq-input w-full px-3 py-2 resize-none min-h-[80px]"
              placeholder="Explain what needs to be changed..."
            />
            {!reason.trim() && (
              <p className="text-[11px] text-[var(--text-muted)]">
                Required; the employee will see this feedback reason.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          <button 
            onClick={onClose} 
            className="btn cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={!reason.trim() || loading} 
            className="btn btn-danger cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "Returning..." : "Return Goal"}
          </button>
        </div>
      </div>
    </div>
  );
}
